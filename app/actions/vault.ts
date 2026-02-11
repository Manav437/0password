"use server";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { vaultItemSchema } from "../../lib/vault";

export async function saveVaultItem(formData: any) {
    const { userId } = await auth();

    // 1. Security Check
    if (!userId) {
        throw new Error("Unauthorized");
    }

    // 2. Validate data with Zod
    const validatedData = vaultItemSchema.parse(formData);

    // 3. Initialize Supabase (Use Service Role to bypass RLS for this internal task)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 4. Insert into Supabase
    const { error } = await supabase.from("vault_items").insert({
        user_id: userId, // Link item to the logged-in user
        title: validatedData.title,
        login_id: validatedData.login_id,
        password: validatedData.password, // We'll add encryption here in the next step!
        website_url: validatedData.url,
    });

    if (error) {
        console.error("Supabase Error:", error);
        return { success: false, error: error.message };
    }

    // 5. Refresh the dashboard data
    revalidatePath("/dashboard");
    return { success: true };
}
