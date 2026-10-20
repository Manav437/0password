export const MAX_VAULT_SEARCH_LENGTH = 200;

export function normalizeVaultSearchQuery(query: unknown): string {
    return typeof query === "string" ? query.slice(0, MAX_VAULT_SEARCH_LENGTH) : "";
}
