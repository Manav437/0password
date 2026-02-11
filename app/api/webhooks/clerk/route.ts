import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET)
        throw new Error("Add CLERK_WEBHOOK_SECRET from Clerk Dashboard");

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;
    try {
        evt = wh.verify(body, {
            "svix-id": svix_id!,
            "svix-timestamp": svix_timestamp!,
            "svix-signature": svix_signature!,
        }) as WebhookEvent;
    } catch (err) {
        return new Response("Error occured", { status: 400 });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { id, email_addresses, first_name, last_name, image_url } =
            evt.data;

        const { error } = await supabase.from("users").upsert(
            {
                id: id,
                email: email_addresses[0].email_address,
                first_name: first_name,
                last_name: last_name,
                image_url: image_url,
            },
            { onConflict: "id" },
        );

        if (error) {
            console.error("Error syncing user to Supabase:", error);
            return new Response("Database error", { status: 500 });
        }
    }

    if (eventType === "user.deleted") {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
        await supabase.from("users").delete().eq("id", id);
    }

    return new Response("", { status: 200 });
}
