import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { SearchInput } from "@/components/vault-search-input";
import { AddItemDialog } from "../../components/add-vault-item";
import { VaultCard } from "@/components/vault-card";
import { Search, ShieldCheck, MoveUpRight, Meh } from "lucide-react";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>;
}) {
    const { userId } = await auth();
    const query = (await searchParams).query;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    let dbQuery = supabase
        .from("vault_items")
        .select("*")
        .eq("user_id", userId);

    if (query) {
        dbQuery = dbQuery.or(
            `title.ilike.%${query}%,login_id.ilike.%${query}%`,
        );
    }

    const { data: vaultItems } = await dbQuery.order("created_at", {
        ascending: false,
    });

    const isEmpty = !vaultItems || vaultItems.length === 0;

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

            <SearchInput />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isEmpty ? (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 py-20 transition-all dark:border-zinc-800 dark:bg-zinc-900/10">
                        <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full ring-2 ring-black/20 bg-white shadow-sm dark:bg-zinc-900">
                            <Meh
                                className={`h-10 w-10 ${query ? "text-black" : "text-primary"}`}
                            />
                            {!query && (
                                <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
                            )}
                        </div>

                        <h3 className="text-xl font-semibold tracking-tight">
                            {query
                                ? "No matches found"
                                : "Start your secure vault"}
                        </h3>

                        <p className="mt-2 max-w-[280px] text-center text-sm text-muted-foreground">
                            {query ? (
                                <>
                                    We couldn&apos;t find anything for{" "}
                                    <span className="font-medium text-foreground">
                                        &ldquo;{query}&rdquo;
                                    </span>
                                    . Try a different keyword or check for
                                    typos.
                                </>
                            ) : (
                                "Store your passwords, notes, and digital keys in one encrypted location."
                            )}
                        </p>

                        <div className="mt-8 flex items-center gap-3">
                            {query ? (
                                <Button
                                    variant="outline"
                                    asChild // Using asChild to make it an actual link to clear search
                                    className="rounded-full px-6 cursor-pointer"
                                >
                                    <Link href="/dashboard">Clear Search</Link>
                                </Button>
                            ) : (
                                <>
                                    <AddItemDialog />
                                    <Button
                                        variant="link"
                                        asChild
                                        className="text-muted-foreground cursor-pointer"
                                    >
                                        <Link
                                            href="https://en.wikipedia.org/wiki/Encryption"
                                            target="_blank"
                                            className="flex items-center gap-2"
                                        >
                                            Learn about encryption{" "}
                                            <MoveUpRight size={14} />
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    vaultItems.map((item) => (
                        <VaultCard key={item.id} item={item} />
                    ))
                )}
            </div>
        </div>
    );
}
