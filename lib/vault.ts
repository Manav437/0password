import { z } from "zod";

export const vaultItemSchema = z.object({
    title: z.string().min(1, "Service name is required"),
    url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    loginId: z.string().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required"),
});

export type VaultItemValues = z.infer<typeof vaultItemSchema>;
