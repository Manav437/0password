"use client";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    ShieldCheck,
    KeyRound,
    CreditCard,
    StickyNote,
    Trash2,
    Settings,
    LayoutDashboard,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

const navItems = [
    { title: "All Items", icon: LayoutDashboard, url: "/dashboard" },
    { title: "Passwords", icon: KeyRound, url: "/dashboard/passwords" },
    { title: "Payments", icon: CreditCard, url: "/dashboard/payments" },
    { title: "Secure Notes", icon: StickyNote, url: "/dashboard/notes" },
];

export function AppSidebar() {
    const { isLoaded, isSignedIn, user } = useUser();

    if (!isLoaded || !isSignedIn) {
        return null;
    }
    return (
        <Sidebar collapsible="icon" className="border-r border-border">
            <SidebarHeader className="p-4">
                {/* We use group here to allow children to react to the sidebar state */}
                <div className="flex items-center gap-3 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:gap-0">
                    <ShieldCheck className="shrink-0" />

                    {/* This span will now hide completely when the sidebar is collapsed */}
                    <span className="font-semibold group-data-[state=collapsed]:hidden">
                        0Password
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Vault</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                    >
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip="Settings">
                                    <Settings />
                                    <span>Settings</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    tooltip="Trash"
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 />
                                    <span>Trash</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t border-border">
                <div className="flex items-center gap-3 px-2 py-1 bg-zinc-200 ring-2 ring-zinc-400/40 rounded-lg">
                    <UserButton
                        appearance={{
                            elements: {
                                userButtonPopoverCard:
                                    "shadow-xl border border-border bg-background",
                                userButtonOuterIdentifier:
                                    "font-medium text-foreground",
                            },
                        }}
                        userProfileProps={{
                            appearance: {
                                elements: {
                                    card: "bg-background border-border shadow-2xl",
                                },
                            },
                        }}
                    />
                    <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                        <span className="text-xs font-medium truncate max-w-30">
                            {user.fullName ||
                                user.primaryEmailAddress?.emailAddress}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                            Premium Plan
                        </span>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
