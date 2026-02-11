import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddItemDialog } from "../../components/add-vault-item";
import { Search, ShieldCheck, MoveUpRight } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Personal Vault
                    </h1>
                    <p className="text-muted-foreground">
                        Securely manage your digital credentials.
                    </p>
                </div>

                <AddItemDialog />
            </div>

            {/* 2. Search & Filter */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search your vault..."
                    className="pl-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800">
                    <ShieldCheck className="h-12 w-12 text-zinc-400 mb-4" />
                    <h3 className="text-lg font-medium">Your vault is empty</h3>
                    <p className="text-zinc-500 mb-6">
                        Add your first password to get started.
                    </p>
                    <Link
                        href="https://en.wikipedia.org/wiki/Encryption"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button variant="outline" className="cursor-pointer">
                            Learn about encryption
                            <MoveUpRight size={20} />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
