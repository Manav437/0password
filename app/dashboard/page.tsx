import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { SearchInput } from "@/components/vault-search-input";
import { AddItemDialog } from "../../components/add-vault-item";
import { VaultCard } from "@/components/vault-card";
import { ChevronRight, ShieldOff, SearchX, ShieldCheck } from "lucide-react";

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
        .eq("user_id", userId)
        .neq("title", "__0PASSWORD_VERIFICATION__");

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
                    <div className="col-span-full flex flex-col items-center justify-center rounded-[.5rem] border border-dashed border-zinc-200 bg-zinc-50/30 py-24 transition-all dark:border-zinc-800 dark:bg-white/[0.02]">
                        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            {query ? (
                                <SearchX className="h-10 w-10 text-zinc-400" />
                            ) : (
                                <ShieldOff className="h-10 w-10 text-emerald-600 dark:text-emerald-500" />
                            )}

                            {!query && (
                                <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-[3px] border-white dark:border-zinc-950">
                                    <ShieldCheck size={10} className="text-white" strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {query ? "No results found" : "Your vault is empty"}
                        </h3>

                        <p className="mt-2 max-w-[300px] text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {query ? (
                                <>
                                    We couldn&apos;t find anything for{" "}
                                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                        &ldquo;{query}&rdquo;
                                    </span>
                                    . Try a different keyword.
                                </>
                            ) : (
                                "Store your passwords, recovery keys, and sensitive notes in your encrypted vault."
                            )}
                        </p>

                        <div className="mt-8 flex items-center gap-4">
                            {query ? (
                                <Button
                                    variant="outline"
                                    asChild
                                    className="rounded-full px-8 shadow-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <Link href="/dashboard">Reset Search</Link>
                                </Button>
                            ) : (
                                <>
                                    <AddItemDialog />
                                    <Button
                                        variant="ghost"
                                        asChild
                                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer text-xs"
                                    >
                                        <Link
                                            href="https://en.wikipedia.org/wiki/Encryption"
                                            target="_blank"
                                            className="flex items-center gap-2"
                                        >
                                            Security Protocol <ChevronRight size={12} className="opacity-50" />
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