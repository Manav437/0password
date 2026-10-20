import { deriveKey, deriveLegacyKey, decrypt, encrypt, generateSalt } from "./crypto.ts";
import {
    CURRENT_KDF_ITERATIONS, LEGACY_VERIFICATION_TITLE, VERIFICATION_TEXT,
    initializationSchema, type VaultState,
} from "./vault-protocol.ts";
import type { z } from "zod";

export type VaultInitialization = z.infer<typeof initializationSchema>;

export async function unlockVault(
    password: string,
    state: VaultState,
    persist: (initialization: VaultInitialization) => Promise<string>,
): Promise<{ key: CryptoKey; vaultId: string }> {
    if (state.kind === "ready") {
        const key = await deriveKey(password, state.metadata);
        let verified = false;
        try {
            verified = await decrypt(state.metadata.encrypted_verification, state.metadata.verification_iv, key) === VERIFICATION_TEXT;
        } catch { /* Authentication failure must never fall through to initialization. */ }
        if (!verified) throw new Error("Incorrect master password or damaged vault verification.");
        return { key, vaultId: state.metadata.vault_id };
    }

    if (state.kind === "new" && password.length < 12) {
        throw new Error("Use at least 12 characters for your master password.");
    }

    const parameters = { salt: generateSalt(), iterations: CURRENT_KDF_ITERATIONS } as const;
    const key = await deriveKey(password, parameters);
    const items: VaultInitialization["items"] = [];
    if (state.kind === "legacy") {
        if (!state.items.length) throw new Error("Missing legacy vault data. Reload and try again.");
        const verifiers = state.items.filter((item) => item.title === LEGACY_VERIFICATION_TITLE);
        if (verifiers.length > 1) throw new Error("Multiple legacy verification records found. Your vault has not been changed.");
        const legacyKey = await deriveLegacyKey(password);
        try {
            for (const item of state.items) {
                const plaintext = await decrypt(item.encrypted_password, item.iv, legacyKey);
                if (item.title === LEGACY_VERIFICATION_TITLE) {
                    if (plaintext !== VERIFICATION_TEXT) throw new Error("Invalid verifier");
                    continue;
                }
                const encrypted = await encrypt(plaintext, key);
                items.push({ id: item.id, encrypted_password: encrypted.encryptedData, iv: encrypted.iv });
            }
        } catch {
            throw new Error("The password is incorrect or an existing entry cannot be decrypted. Your vault has not been changed.");
        }
    }
    const verification = await encrypt(VERIFICATION_TEXT, key);
    // Persistence must finish successfully before this key is exposed to the UI.
    const initialization = {
        metadata: {
            version: 2, ...parameters,
            encrypted_verification: verification.encryptedData, verification_iv: verification.iv,
        },
        snapshot: state.kind === "legacy" ? state.items : [],
        items,
    } as const;
    const validated = initializationSchema.safeParse(initialization);
    if (!validated.success) throw new Error(validated.error.issues[0]?.message ?? "Invalid vault initialization.");
    const vaultId = await persist(validated.data);
    return { key, vaultId };
}
