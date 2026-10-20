import { z } from "zod";

export function getSafeWebsiteUrl(value?: string): string | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:"
            ? url.href
            : null;
    } catch {
        return null;
    }
}

export const vaultItemSchema = z.object({
    title: z.string().trim().min(1, "Service name is required").refine(
        (title) => title !== "__0PASSWORD_VERIFICATION__",
        "This service name is reserved",
    ),

    url: z.string().trim().refine(
        (value) => value === "" || getSafeWebsiteUrl(value) !== null,
        "Enter a valid HTTP or HTTPS URL",
    ).optional(),

    login_id: z.string().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required"),
});

export type VaultItemValues = z.infer<typeof vaultItemSchema>;
