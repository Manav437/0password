import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PasswordsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
            <div className="bg-emerald-500/10 p-6 rounded-3xl ring-1 ring-emerald-500/20">
                <ShieldCheck className="h-12 w-12 text-emerald-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Passwords Vault</h1>
                <p className="text-muted-foreground max-w-[400px]">
                    This section will exclusively show your login credentials once categories are implemented.
                </p>
            </div>
            <Button variant="outline" asChild className="rounded-full gap-2 group">
                <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to All Items
                </Link>
            </Button>
        </div>
    );
}
