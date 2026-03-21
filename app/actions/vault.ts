"use server";
import { auth, currentUser } from "@clerk/nextjs/server";
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

    // DEV WORKAROUND: Force sync the user to Supabase `users` table 
    // because webhooks often fail to reach localhost from Clerk.
    const user = await currentUser();
    if (user) {
        await supabase.from("users").upsert({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            first_name: user.firstName || "",
            last_name: user.lastName || "",
            image_url: user.imageUrl || "",
        }, { onConflict: "id" });
    }

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

export async function getVerificationItem() {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
        .from("vault_items")
        .select("encrypted_password, iv")
        .eq("user_id", userId)
        .eq("title", "__0PASSWORD_VERIFICATION__")
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Supabase fetch error:", error);
        return { success: false, error: error.message };
    }

    return { success: true, item: data || null };
}
