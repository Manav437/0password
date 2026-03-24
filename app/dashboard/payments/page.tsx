import { CreditCard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PaymentsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
            <div className="bg-blue-500/10 p-6 rounded-3xl ring-1 ring-blue-500/20">
                <CreditCard className="h-12 w-12 text-blue-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Payment Methods</h1>
                <p className="text-muted-foreground max-w-[400px]">
                    Secure storage for your credit cards and banking details is coming soon.
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
