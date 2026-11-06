"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Grid2X2, List } from "lucide-react";
import { AddItemDialog } from "@/components/add-vault-item";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/vault-search-input";
import { VaultCard } from "@/components/vault-card";
import type { z } from "zod";
import type { storedCredentialSchema } from "@/lib/vault-protocol";

type VaultItem = z.infer<typeof storedCredentialSchema>;
type SortOrder = "name-asc" | "name-desc";
type ViewMode = "grid" | "list";

export function VaultCollection({
    items,
    emptyState,
}: {
    items: VaultItem[];
    emptyState: React.ReactNode;
}) {
    const [sortOrder, setSortOrder] = useState<SortOrder>("name-asc");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const sortedItems = useMemo(() => {
        const direction = sortOrder === "name-asc" ? 1 : -1;
        return [...items].sort(
            (left, right) =>
                direction * left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
        );
    }, [items, sortOrder]);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-8">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="min-w-[min(100%,14rem)] flex-1 lg:max-w-md">
                    <SearchInput />
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                    {items.length > 0 && (
                        <>
                            <label className="relative">
                                <span className="sr-only">Sort vault items</span>
                                <select
                                    aria-label="Sort vault items"
                                    value={sortOrder}
                                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                                    className="h-9 cursor-pointer appearance-none rounded-md border border-input bg-background py-1 pl-9 pr-4 text-sm shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring focus-visible:ring-ring/50"
                                >
                                    <option value="name-asc">Name (A–Z)</option>
                                    <option value="name-desc">Name (Z–A)</option>
                                </select>
                                {sortOrder === "name-asc" ? (
                                    <ArrowDownAZ aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                ) : (
                                    <ArrowUpAZ aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                )}
                            </label>

                            <div className="flex h-9 items-center gap-1 rounded-md border border-input bg-background p-0.5" role="group" aria-label="Vault view">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Grid view"
                                    aria-pressed={viewMode === "grid"}
                                    onClick={() => setViewMode("grid")}
                                    className={`rounded-sm ${viewMode === "grid" ? "bg-muted/50 text-foreground hover:bg-muted/50" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                                >
                                    <Grid2X2 />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="List view"
                                    aria-pressed={viewMode === "list"}
                                    onClick={() => setViewMode("list")}
                                    className={`rounded-sm ${viewMode === "list" ? "bg-muted/50 text-foreground hover:bg-muted/50" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                                >
                                    <List />
                                </Button>
                            </div>
                        </>
                    )}

                    <AddItemDialog className="h-9 shrink-0 shadow-xs" />
                </div>
            </div>

            {items.length === 0 ? <div className="flex flex-1 flex-col">{emptyState}</div> : (
                <>
                    {viewMode === "list" && (
                        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-4 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
                            {/* <span>Item</span>
                            <span>Username</span>
                            <span>Password</span> */}
                        </div>
                    )}
                    <div className={viewMode === "grid"
                        ? "grid grid-cols-1 content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-3"
                        : "grid grid-cols-1 content-start items-start gap-3"
                    }>
                        {sortedItems.map((item) => (
                            <VaultCard key={item.id} item={item} layout={viewMode} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
