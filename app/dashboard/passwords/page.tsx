import { redirect } from "next/navigation";
import { normalizeVaultSearchQuery } from "@/lib/vault-search";

export default async function PasswordsPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>;
}) {
    const query = normalizeVaultSearchQuery((await searchParams).query);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    redirect(query ? `/dashboard?${params.toString()}` : "/dashboard");
}
