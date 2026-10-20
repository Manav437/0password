import { z } from "zod";

export const LEGACY_VERIFICATION_TITLE = "__0PASSWORD_VERIFICATION__";
export const VERIFICATION_TEXT = "0password-verification-success";
export const RESET_CONFIRMATION = "RESET VAULT";
export const CURRENT_KDF_ITERATIONS = 600_000;

const base64 = z.string().min(1).max(1_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
export const ciphertextSchema = base64.min(24);
export const ivSchema = base64.length(16);
export const vaultMetadataSchema = z.object({
    version: z.literal(2),
    salt: base64.length(24).regex(/^[A-Za-z0-9+/]{22}==$/),
    iterations: z.literal(CURRENT_KDF_ITERATIONS),
    encrypted_verification: ciphertextSchema,
    verification_iv: ivSchema,
});
export const storedCredentialSchema = z.object({
    id: z.string(),
    title: z.string(),
    login_id: z.string().nullish().transform((value) => value ?? ""),
    encrypted_password: z.string(),
    iv: z.string(),
    website_url: z.string().nullish().transform((value) => value ?? undefined),
});

export type VaultMetadata = z.infer<typeof vaultMetadataSchema> & { vault_id: string };

export const credentialSchema = z.object({
    title: z.string().trim().min(1).max(200).refine(
        (title) => title !== LEGACY_VERIFICATION_TITLE,
        "This service name is reserved.",
    ),
    login_id: z.string().max(1000).optional(),
    website_url: z.string().max(2048).refine((value) => {
        if (!value) return true;
        try { return ["http:", "https:"].includes(new URL(value).protocol); }
        catch { return false; }
    }, "Enter an HTTP or HTTPS URL.").optional(),
    encryptedPassword: ciphertextSchema,
    iv: ivSchema,
});
export const credentialUpdateSchema = credentialSchema.partial({ encryptedPassword: true, iv: true })
    .refine((value) => Boolean(value.encryptedPassword) === Boolean(value.iv), {
        message: "Ciphertext and IV must be provided together.",
    });

export const legacyItemSchema = z.object({
    id: z.string().min(1).max(100),
    title: z.string(),
    encrypted_password: ciphertextSchema,
    iv: ivSchema,
});
export type LegacyItem = z.infer<typeof legacyItemSchema>;
export type VaultState =
    | { kind: "new" }
    | { kind: "ready"; metadata: VaultMetadata }
    | { kind: "legacy"; items: LegacyItem[] };

export const MAX_INITIALIZATION_BYTES = 8 * 1024 * 1024;
export const MIGRATION_SIZE_ERROR = "This vault exceeds the 8 MiB automatic-upgrade limit. No data has been changed. Ask the maintainer for an offline migration; do not reset the vault to fix an upgrade error.";

export const initializationSchema = z.object({
    metadata: vaultMetadataSchema,
    snapshot: z.array(legacyItemSchema).max(100_000),
    items: z.array(legacyItemSchema.pick({ id: true, encrypted_password: true, iv: true })).max(100_000),
}).refine((value) => new TextEncoder().encode(JSON.stringify(value)).byteLength <= MAX_INITIALIZATION_BYTES, MIGRATION_SIZE_ERROR);
