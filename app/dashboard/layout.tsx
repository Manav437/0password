import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { cookies } from "next/headers";
import { VaultWrapper } from "@/components/vault-wrapper";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const sidebarState = cookieStore.get("sidebar_state")?.value;

    const defaultOpen = sidebarState ? sidebarState === "true" : true;

    return (
        <VaultWrapper>
            <SidebarProvider
                defaultOpen={defaultOpen}
                style={
                    {
                        "--sidebar-width": "14rem",
                        "--sidebar-width-icon": "3rem",
                    } as React.CSSProperties
                }
            >
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen bg-background">
                    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur px-4">
                        <SidebarTrigger className="-ml-1" />
                        <div className="h-4 w-px bg-border mx-2" />
                        <h2 className="text-sm font-medium text-muted-foreground">
                            0Password Vault
                        </h2>
                        <div className="ml-auto">
                            <ThemeToggle />
                        </div>
                    </header>
                    <main className="flex-1">{children}</main>
                </div>
            </SidebarProvider>
        </VaultWrapper>
    );
}
