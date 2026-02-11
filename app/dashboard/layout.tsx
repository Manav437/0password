import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// 1. Initialize outside to reuse the connection
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await currentUser();

    if (user) {
        await supabase.from("users").upsert(
            {
                id: user.id,
                email: user.emailAddresses[0].emailAddress,
                first_name: user.firstName,
                last_name: user.lastName,
                image_url: user.imageUrl,
            },
            { onConflict: "id" },
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="flex flex-col flex-1 min-h-screen bg-background">
                <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur px-4">
                    <SidebarTrigger className="-ml-1" />
                    <div className="h-4 w-[1px] bg-border mx-2" />
                    <h2 className="text-sm font-medium text-muted-foreground">
                        0Password Vault
                    </h2>
                </header>
                <main className="flex-1">{children}</main>
            </div>
        </SidebarProvider>
    );
}
