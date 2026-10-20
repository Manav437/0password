import assert from "node:assert/strict";
import { test } from "node:test";
import { toBase64 } from "../lib/crypto.ts";
import {
    ciphertextSchema, credentialSchema, credentialUpdateSchema, CURRENT_KDF_ITERATIONS,
    initializationSchema, ivSchema, LEGACY_VERIFICATION_TITLE, vaultMetadataSchema,
    MAX_INITIALIZATION_BYTES, MIGRATION_SIZE_ERROR,
} from "../lib/vault-protocol.ts";

const ciphertext = toBase64(new Uint8Array(32));
const iv = toBase64(new Uint8Array(12));
const credential = { title: "Example", encryptedPassword: ciphertext, iv };
const metadata = {
    version: 2, salt: toBase64(new Uint8Array(16)), iterations: CURRENT_KDF_ITERATIONS,
    encrypted_verification: ciphertext, verification_iv: iv,
};

test("credential titles are trimmed, bounded, and cannot use the reserved verifier title", () => {
    assert.equal(credentialSchema.parse({ ...credential, title: "  Example  " }).title, "Example");
    assert.equal(credentialSchema.safeParse({ ...credential, title: "x".repeat(200) }).success, true);
    for (const title of ["", "   ", "x".repeat(201), LEGACY_VERIFICATION_TITLE, `  ${LEGACY_VERIFICATION_TITLE}  `]) {
        assert.equal(credentialSchema.safeParse({ ...credential, title }).success, false, title);
        assert.equal(credentialUpdateSchema.safeParse({ title }).success, false, title);
    }
});

test("website URLs permit only HTTP(S), empty, or omitted values", () => {
    for (const website_url of [undefined, "", "http://example.com", "https://example.com/path?q=a#fragment"]) {
        assert.equal(credentialSchema.safeParse({ ...credential, website_url }).success, true, String(website_url));
    }
    for (const website_url of [
        "javascript:alert(1)", "data:text/html,test", "ftp://example.com", "file:///tmp/secret",
        "mailto:user@example.com", "//example.com", "/relative", "example.com", "https://", "not a URL",
    ]) {
        assert.equal(credentialSchema.safeParse({ ...credential, website_url }).success, false, website_url);
        assert.equal(credentialUpdateSchema.safeParse({ title: "Example", website_url }).success, false, website_url);
    }
});

test("ciphertext and IV validators reject malformed base64 and invalid lengths", () => {
    assert.equal(ciphertextSchema.safeParse(ciphertext).success, true);
    assert.equal(ivSchema.safeParse(iv).success, true);
    for (const value of ["", "!".repeat(24), "A".repeat(23), "A".repeat(25), "A".repeat(1_000_004)]) {
        assert.equal(ciphertextSchema.safeParse(value).success, false);
    }
    for (const value of ["", "!".repeat(16), toBase64(new Uint8Array(9)), toBase64(new Uint8Array(15))]) {
        assert.equal(ivSchema.safeParse(value).success, false);
    }
    assert.equal(credentialSchema.safeParse({ title: "Example", iv }).success, false);
    assert.equal(credentialSchema.safeParse({ title: "Example", encryptedPassword: ciphertext }).success, false);
});

test("credential updates require ciphertext and IV together but allow metadata-only edits", () => {
    assert.equal(credentialUpdateSchema.safeParse({ title: "Example" }).success, true);
    assert.equal(credentialUpdateSchema.safeParse(credential).success, true);
    for (const update of [
        { title: "Example", encryptedPassword: ciphertext },
        { title: "Example", iv },
        { ...credential, iv: "" },
        { ...credential, encryptedPassword: "" },
    ]) {
        assert.equal(credentialUpdateSchema.safeParse(update).success, false);
    }
});

test("vault metadata accepts only version 2, a valid encoded salt, and current KDF iterations", () => {
    assert.equal(vaultMetadataSchema.safeParse(metadata).success, true);
    for (const patch of [
        { version: 1 }, { version: 3 }, { version: "2" }, { version: undefined },
        { salt: "" }, { salt: "!".repeat(24) }, { salt: toBase64(new Uint8Array(12)) },
        { salt: toBase64(new Uint8Array(19)) }, { salt: "A".repeat(24) }, { salt: undefined },
        { iterations: 100_000 }, { iterations: 599_999 }, { iterations: 600_001 },
        { iterations: "600000" }, { iterations: undefined },
        { encrypted_verification: "bad" }, { verification_iv: "bad" },
    ]) {
        assert.equal(vaultMetadataSchema.safeParse({ ...metadata, ...patch }).success, false, JSON.stringify(patch));
    }
});

test("migration payloads above 1 MiB are supported, but above 8 MiB fail with recovery guidance", () => {
    const encrypted_password = "A".repeat(100_000);
    const snapshot = Array.from({ length: 10 }, (_, index) => ({ id: String(index), title: "Example", encrypted_password, iv }));
    const items = snapshot.map(({ id, encrypted_password, iv }) => ({ id, encrypted_password, iv }));
    const supported = { metadata, snapshot, items };
    assert.ok(new TextEncoder().encode(JSON.stringify(supported)).length > 1024 * 1024);
    assert.equal(initializationSchema.safeParse(supported).success, true);
    const oversized = { metadata, snapshot: Array.from({ length: 5 }, () => snapshot).flat(), items: Array.from({ length: 5 }, () => items).flat() };
    assert.ok(new TextEncoder().encode(JSON.stringify(oversized)).length > MAX_INITIALIZATION_BYTES);
    const result = initializationSchema.safeParse(oversized);
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.error.issues[0].message, MIGRATION_SIZE_ERROR);
});

test("initialization validates both the legacy snapshot and the replacement ciphertext payload", () => {
    const original = { id: "entry", title: "Example", encrypted_password: ciphertext, iv };
    const replacement = { id: "entry", encrypted_password: ciphertext, iv };
    const payload = { metadata, snapshot: [original], items: [replacement] };
    assert.equal(initializationSchema.safeParse(payload).success, true);
    assert.equal(initializationSchema.safeParse({ metadata, snapshot: [], items: [] }).success, true);
    for (const patch of [
        { snapshot: [{ ...original, id: "" }] },
        { snapshot: [{ ...original, encrypted_password: "bad" }] },
        { items: [{ ...replacement, iv: "bad" }] },
        { items: [{ id: "entry", iv }] },
        { metadata: { ...metadata, version: 1 } },
    ]) {
        assert.equal(initializationSchema.safeParse({ ...payload, ...patch }).success, false);
    }
});
