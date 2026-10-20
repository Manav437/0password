import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_VAULT_SEARCH_LENGTH, normalizeVaultSearchQuery } from "../lib/vault-search.ts";

test("non-string search parameters are ignored", () => {
    for (const value of [undefined, null, [], ["test"], 123, {}]) {
        assert.equal(normalizeVaultSearchQuery(value), "");
    }
});

test("search parameters are bounded before being sent to the database", () => {
    assert.equal(normalizeVaultSearchQuery("x".repeat(500)), "x".repeat(MAX_VAULT_SEARCH_LENGTH));
});

test("search text is passed literally, without stripping punctuation or whitespace", () => {
    for (const value of ["", "  a,b_(c)%*  ", "\\path", 'a "quoted" value', "emoji 🔐 and café"]) {
        assert.equal(normalizeVaultSearchQuery(value), value);
    }
});
