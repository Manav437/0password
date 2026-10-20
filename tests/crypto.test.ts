import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
    decrypt, deriveKey, deriveLegacyKey, encrypt, generateSalt, toBase64,
} from "../lib/crypto.ts";

let key: CryptoKey;
let otherKey: CryptoKey;
let salt: string;

before(async () => {
    salt = generateSalt();
    [key, otherKey] = await Promise.all([
        deriveKey("same master password", { salt, iterations: 600_000 }),
        deriveKey("same master password", { salt: generateSalt(), iterations: 600_000 }),
    ]);
});

function flipByte(value: string): string {
    const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    bytes[0] ^= 1;
    return toBase64(bytes);
}

test("salts are random 16-byte values and separate keys for the same password", async () => {
    const salts = Array.from({ length: 32 }, generateSalt);
    assert.equal(new Set(salts).size, salts.length);
    for (const value of salts) assert.equal(atob(value).length, 16);
    const encrypted = await encrypt("salt-separated secret", key);
    await assert.rejects(decrypt(encrypted.encryptedData, encrypted.iv, otherKey));
    const sameKey = await deriveKey("same master password", { salt, iterations: 600_000 });
    assert.equal(await decrypt(encrypted.encryptedData, encrypted.iv, sameKey), "salt-separated secret");
});

test("current and legacy keys are nonextractable AES-256-GCM keys", async () => {
    for (const derived of [key, await deriveLegacyKey("legacy password")]) {
        assert.equal(derived.extractable, false);
        assert.deepEqual(derived.algorithm, { name: "AES-GCM", length: 256 });
        assert.deepEqual(derived.usages, ["encrypt", "decrypt"]);
        await assert.rejects(crypto.subtle.exportKey("raw", derived));
        await assert.rejects(crypto.subtle.exportKey("jwk", derived));
    }
});

test("encryption round-trips empty and Unicode text with a fresh 12-byte IV", async () => {
    for (const plaintext of ["", "secret 🔐 café\n\u0000"]) {
        const first = await encrypt(plaintext, key);
        const second = await encrypt(plaintext, key);
        assert.equal(atob(first.iv).length, 12);
        assert.notEqual(first.iv, second.iv);
        assert.notEqual(first.encryptedData, second.encryptedData);
        assert.equal(await decrypt(first.encryptedData, first.iv, key), plaintext);
        assert.equal(await decrypt(second.encryptedData, second.iv, key), plaintext);
    }
});

test("authenticated decryption rejects a wrong key, altered ciphertext, and altered IV", async () => {
    const { encryptedData, iv } = await encrypt("authenticated secret", key);
    await assert.rejects(decrypt(encryptedData, iv, otherKey));
    await assert.rejects(decrypt(flipByte(encryptedData), iv, key));
    await assert.rejects(decrypt(encryptedData, flipByte(iv), key));
});

test("key derivation rejects unsupported salt lengths and iteration counts", () => {
    for (const invalidSalt of ["", toBase64(new Uint8Array(15)), toBase64(new Uint8Array(17))]) {
        assert.throws(() => deriveKey("password", { salt: invalidSalt, iterations: 600_000 }), /Unsupported/);
    }
    for (const iterations of [0, 100_000, 599_999, 600_001]) {
        assert.throws(() => deriveKey("password", { salt, iterations }), /Unsupported/);
    }
});
