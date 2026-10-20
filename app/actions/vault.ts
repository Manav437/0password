"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
    credentialSchema, credentialUpdateSchema, initializationSchema, legacyItemSchema,
    RESET_CONFIRMATION, vaultMetadataSchema, type VaultState,
} from "@/lib/vault-protocol";

function database() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function databaseError(error: { code?: string; message: string }) {
    if (["42P01", "PGRST202", "PGRST205"].includes(error.code ?? "")) {
        return "Vault storage is not ready. Apply the vault database migration before using the vault.";
    }
    // Only our intentional PostgreSQL exceptions are safe to display directly.
    if (error.code === "P0001") return error.message;
    console.error("Vault database operation failed:", error.code);
    return "Unable to access the vault. Please try again.";
}

export async function getVaultState(expectedUserId: string): Promise<
    { success: true; state: VaultState } | { success: false; error: string }
> {
    const { userId } = await auth();
    if (!userId || userId !== expectedUserId) return { success: false, error: "Your session changed. Please sign in again." };
    const supabase = database();
    const { data, error } = await supabase.from("vault_metadata").select("*").eq("user_id", userId).maybeSingle();
    if (error) return { success: false, error: databaseError(error) };
    if (data) {
        const metadata = vaultMetadataSchema.extend({ vault_id: z.uuid() }).safeParse(data);
        if (!metadata.success) return { success: false, error: "Unsupported or damaged vault metadata. Your data has not been changed." };
        return { success: true, state: { kind: "ready", metadata: metadata.data } };
    }

    // Do not let the API's default row limit silently truncate a legacy migration.
    const items: z.infer<typeof legacyItemSchema>[] = [];
    for (let offset = 0; ; offset += 500) {
        const result = await supabase.from("vault_items").select("id, title, encrypted_password, iv")
            .eq("user_id", userId).order("id").range(offset, offset + 499);
        if (result.error) return { success: false, error: databaseError(result.error) };
        const parsed = z.array(legacyItemSchema).safeParse(result.data);
        if (!parsed.success) return { success: false, error: "An existing entry is damaged. Vault setup has been blocked to protect your data." };
        items.push(...parsed.data);
        if (items.length > 100_000) return { success: false, error: "This vault needs an offline migration. Your data has not been changed." };
        if (parsed.data.length < 500) break;
    }
    return { success: true, state: items.length ? { kind: "legacy", items } : { kind: "new" } };
}

export async function initializeVault(input: z.infer<typeof initializationSchema>, expectedUserId: string) {
    const { userId } = await auth();
    if (!userId || userId !== expectedUserId) return { success: false as const, error: "Your session changed. Please sign in again." };
    const parsed = initializationSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: "Invalid vault initialization data." };
    const supabase = database();
    const user = await currentUser();
    if (!user || user.id !== userId) return { success: false as const, error: "Unauthorized" };
    // Checked fallback for environments where the Clerk webhook has not arrived yet.
    const sync = await supabase.from("users").upsert({
        id: user.id, email: user.primaryEmailAddress?.emailAddress || "",
        first_name: user.firstName || "", last_name: user.lastName || "", image_url: user.imageUrl || "",
    }, { onConflict: "id" });
    if (sync.error) return { success: false as const, error: databaseError(sync.error) };
    const { data, error } = await supabase.rpc("initialize_vault", {
        p_user_id: userId, p_metadata: parsed.data.metadata,
        p_snapshot: parsed.data.snapshot, p_items: parsed.data.items,
    });
    if (error) return { success: false as const, error: databaseError(error) };
    if (!z.uuid().safeParse(data).success) return { success: false as const, error: "Invalid vault setup response. Reload before trying again." };
    revalidatePath("/dashboard");
    return { success: true as const, vaultId: data as string };
}

async function writeItem(operation: "insert" | "update" | "delete", id: string | null, item: unknown, vaultId: string) {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };
    if (!z.uuid().safeParse(vaultId).success || (operation !== "insert" && !z.string().min(1).max(100).safeParse(id).success)) {
        return { success: false, error: "Invalid vault session or item." };
    }
    const { error } = await database().rpc("write_vault_item", {
        p_user_id: userId, p_vault_id: vaultId, p_operation: operation, p_id: id, p_item: item,
    });
    if (error) return { success: false, error: databaseError(error) };
    revalidatePath("/dashboard");
    return { success: true };
}

export async function saveVaultItem(formData: z.infer<typeof credentialSchema>, vaultId: string) {
    const parsed = credentialSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Invalid vault entry." };
    return writeItem("insert", null, parsed.data, vaultId);
}

export async function updateVaultItem(id: string, formData: z.infer<typeof credentialUpdateSchema>, vaultId: string) {
    const parsed = credentialUpdateSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Invalid vault entry." };
    return writeItem("update", id, parsed.data, vaultId);
}

export async function deleteVaultItem(id: string, vaultId: string) {
    return writeItem("delete", id, null, vaultId);
}

export async function getVaultRevision(expectedUserId: string) {
    const { userId } = await auth();
    if (!userId || userId !== expectedUserId) return { success: false as const, error: "Your session changed. Please sign in again." };
    const { data, error } = await database().rpc("vault_revision", { p_user_id: userId });
    if (error) return { success: false as const, error: databaseError(error) };
    if (typeof data !== "string") return { success: false as const, error: "Unable to check vault state." };
    return { success: true as const, revision: data };
}

export async function resetVault(confirmation: string, expectedUserId: string, expectedRevision: string) {
    const { userId } = await auth();
    if (!userId || userId !== expectedUserId) return { success: false, error: "Your session changed. Please sign in again." };
    if (confirmation !== RESET_CONFIRMATION) return { success: false, error: `Type ${RESET_CONFIRMATION} to confirm.` };
    if (!z.string().min(1).max(100).safeParse(expectedRevision).success) return { success: false, error: "Missing vault reset confirmation state. Reopen the dialog." };
    const { error } = await database().rpc("reset_vault", { p_user_id: userId, p_expected_revision: expectedRevision });
    if (error) return { success: false, error: databaseError(error) };
    revalidatePath("/dashboard");
    return { success: true };
}
