"use client";

import { usePathname } from "next/navigation";

export function DashboardHeaderTitle() {
    const pathname = usePathname();

    const getTitle = () => {
        if (pathname === "/dashboard") return "Personal Vault";
        if (pathname === "/dashboard/passwords") return "Passwords";
        if (pathname === "/dashboard/payments") return "Payments";
        if (pathname === "/dashboard/notes") return "Secure Notes";
        
        // Handle nested or unknown paths
        const segment = pathname.split("/").pop();
        if (segment) {
            return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        }
        
        return "Vault";
    };

    return (
        <h2 className="text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-300">
            {getTitle()}
        </h2>
    );
}
