import { redirect } from "next/navigation";
import { normalizeVaultSearchQuery } from "@/lib/vault-search";
import { storedCredentialSchema } from "@/lib/vault-protocol";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { VaultCollection } from "@/components/vault-collection";
import { LayoutDashboard, FileExclamationPoint } from "lucide-react";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>;
}) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const query = normalizeVaultSearchQuery((await searchParams).query);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase.rpc("search_vault_items", {
        p_user_id: userId,
        p_query: query,
    });

    if (error) {
        throw new Error("Unable to load your vault. Please try again.");
    }

    const parsed = z.array(storedCredentialSchema).safeParse(data);
    if (!parsed.success) throw new Error("The vault returned invalid data. Please try again.");
    const vaultItems = parsed.data;
    const emptyState = (
        <div className="flex min-h-[min(60vh,34rem)] flex-1 items-center justify-center rounded-md border border-dotted border-zinc-200 bg-white/50 px-5 py-8 transition-colors dark:border-zinc-700 dark:bg-white/[0.02] sm:px-10">
            <div className="flex max-w-md items-start gap-4 text-left">
                <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-md ring-1 ${query ? "bg-muted ring-border" : "bg-emerald-500/10 ring-emerald-500/15"}`}>
                    {query ? (
                        <FileExclamationPoint className="h-6 w-6 text-zinc-400" />
                    ) : (
                        <LayoutDashboard className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                    )}

                    {/*  */}
                </div>

                <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {query ? "No passwords found" : "Your vault is empty"}
                    </h3>

                    <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {query ? (
                            <>
                                No match for{" "}
                                <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                    &ldquo;{query}&rdquo;
                                </span>
                                .
                            </>
                        ) : (
                            "Add your first login from New Item."
                        )}
                    </p>

                    {/* {query && (
                        <div className="mt-3">
                            <Button variant="outline" asChild className="cursor-pointer">
                                <Link href="/dashboard">Reset search</Link>
                            </Button>
                        </div>
                    )} */}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-full flex-col gap-8 p-6">
            <VaultCollection items={vaultItems} emptyState={emptyState} />
        </div>
    );
}
