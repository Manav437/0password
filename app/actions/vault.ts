// actions/vault.ts
"use server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
    title: z.string().min(1),
    login_id: z.string().optional(),
    encryptedPassword: z.string(),
    iv: z.string(),
    website_url: z.string().optional(),
});

export async function saveVaultItem(formData: z.infer<typeof schema>) {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const validated = schema.parse(formData);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await supabase.from("vault_items").insert({
        user_id: userId,
        title: validated.title,
        login_id: validated.login_id,
        encrypted_password: validated.encryptedPassword,
        iv: validated.iv,
        website_url: validated.website_url,
    });

    if (error) {
        console.error("Supabase full error:", JSON.stringify(error));
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}
