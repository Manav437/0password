import assert from "node:assert/strict";
import { before, mock, test } from "node:test";
import { decrypt, deriveKey, deriveLegacyKey, encrypt, generateSalt } from "../lib/crypto.ts";
import { unlockVault, type VaultInitialization } from "../lib/unlock.ts";
import {
    CURRENT_KDF_ITERATIONS, initializationSchema, LEGACY_VERIFICATION_TITLE,
    VERIFICATION_TEXT, type LegacyItem, type VaultState,
} from "../lib/vault-protocol.ts";

const password = "a sufficiently long master password";
const vaultId = "persisted-vault-id";
const plaintexts = ["first secret 🔐", "second secret"];
let legacyKey: CryptoKey;
let legacyItems: LegacyItem[];
let ready: Extract<VaultState, { kind: "ready" }>;
let readyKey: CryptoKey;

before(async () => {
    const parameters = { salt: generateSalt(), iterations: CURRENT_KDF_ITERATIONS } as const;
    [legacyKey, readyKey] = await Promise.all([
        deriveLegacyKey(password), deriveKey(password, parameters),
    ]);
    legacyItems = await Promise.all([
        ...plaintexts.map((plaintext, index) => legacyItem(`entry-${index}`, `Service ${index}`, plaintext)),
        legacyItem("verifier", LEGACY_VERIFICATION_TITLE, VERIFICATION_TEXT),
    ]);
    const verification = await encrypt(VERIFICATION_TEXT, readyKey);
    ready = {
        kind: "ready", metadata: {
            version: 2, ...parameters, vault_id: vaultId,
            encrypted_verification: verification.encryptedData, verification_iv: verification.iv,
        }
    };
});

async function legacyItem(id: string, title: string, plaintext: string): Promise<LegacyItem> {
    const encrypted = await encrypt(plaintext, legacyKey);
    return { id, title, encrypted_password: encrypted.encryptedData, iv: encrypted.iv };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

test("new vault exposes no usable result before persistence, and rejects if persistence fails", async () => {
    const entered = deferred<VaultInitialization>();
    const persistence = deferred<string>();
    const failure = new Error("database unavailable");
    const persist = mock.fn((payload: VaultInitialization) => {
        entered.resolve(payload);
        return persistence.promise;
    });
    let returnedSession = false;
    const unlocking = unlockVault(password, { kind: "new" }, persist).then((session) => {
        returnedSession = true;
        return session;
    });
    const rejected = assert.rejects(unlocking, (error) => error === failure);
    const payload = await entered.promise;
    assert.equal(returnedSession, false);
    assert.equal(initializationSchema.safeParse(payload).success, true);
    assert.deepEqual(payload.snapshot, []);
    assert.deepEqual(payload.items, []);
    persistence.reject(failure);
    await rejected;
    assert.equal(returnedSession, false);
    assert.equal(persist.mock.callCount(), 1);
});

test("a new vault accepts the 12-character boundary only after persistence succeeds", async () => {
    const entered = deferred<VaultInitialization>();
    const persistence = deferred<string>();
    const unlocking = unlockVault("123456789012", { kind: "new" }, (payload) => {
        entered.resolve(payload);
        return persistence.promise;
    });
    const payload = await entered.promise;
    persistence.resolve(vaultId);
    const session = await unlocking;
    assert.equal(session.vaultId, vaultId);
    assert.equal(await decrypt(payload.metadata.encrypted_verification, payload.metadata.verification_iv, session.key), VERIFICATION_TEXT);
});

test("short new passwords are rejected without initializing", async () => {
    const persist = mock.fn(async () => vaultId);
    for (const short of ["", "12345678901"]) {
        await assert.rejects(unlockVault(short, { kind: "new" }, persist), /at least 12 characters/);
    }
    assert.equal(persist.mock.callCount(), 0);
});

test("ready verification succeeds without initialization", async () => {
    const persist = mock.fn(async () => vaultId);
    const session = await unlockVault(password, ready, persist);
    assert.equal(session.vaultId, vaultId);
    const encrypted = await encrypt("existing key", readyKey);
    assert.equal(await decrypt(encrypted.encryptedData, encrypted.iv, session.key), "existing key");
    assert.equal(persist.mock.callCount(), 0);
});

test("ready wrong password, corrupt verifier, and wrong verifier plaintext never initialize", async () => {
    const persist = mock.fn(async () => vaultId);
    const wrongText = await encrypt("not the verification marker", readyKey);
    const damaged = { ...ready, metadata: { ...ready.metadata, encrypted_verification: "!invalid!" } };
    const wrongMarker = {
        ...ready, metadata: {
            ...ready.metadata, encrypted_verification: wrongText.encryptedData, verification_iv: wrongText.iv,
        }
    };
    for (const [attempt, state] of [["wrong password", ready], [password, damaged], [password, wrongMarker]] as const) {
        await assert.rejects(unlockVault(attempt, state, persist), /Incorrect master password or damaged vault verification/);
    }
    assert.equal(persist.mock.callCount(), 0);
});

async function assertMigration(items: LegacyItem[]) {
    const snapshot = structuredClone(items);
    const persist = mock.fn(async (payload: VaultInitialization) => {
        assert.equal(initializationSchema.safeParse(payload).success, true);
        assert.deepEqual(payload.snapshot, snapshot);
        assert.deepEqual(payload.items.map((item) => item.id), ["entry-0", "entry-1"]);
        return vaultId;
    });
    const session = await unlockVault(password, { kind: "legacy", items }, persist);
    assert.equal(persist.mock.callCount(), 1, "migration must use one atomic persistence call");
    assert.equal(session.vaultId, vaultId);
    assert.deepEqual(items, snapshot, "migration must not mutate the original snapshot");
    const payload = persist.mock.calls[0].arguments[0];
    assert.notEqual(payload.metadata.salt, ready.metadata.salt);
    assert.equal(await decrypt(payload.metadata.encrypted_verification, payload.metadata.verification_iv, session.key), VERIFICATION_TEXT);
    for (const [index, item] of payload.items.entries()) {
        const original = snapshot.find((old) => old.id === item.id)!;
        assert.notEqual(item.encrypted_password, original.encrypted_password);
        assert.notEqual(item.iv, original.iv);
        assert.equal(await decrypt(item.encrypted_password, item.iv, session.key), plaintexts[index]);
        await assert.rejects(decrypt(item.encrypted_password, item.iv, legacyKey));
        await assert.rejects(decrypt(original.encrypted_password, original.iv, session.key));
    }
}

test("verified legacy migration persists one complete snapshot with all credentials reencrypted", async () => {
    await assertMigration(legacyItems);
});

test("legacy entries without a verifier migrate only when every entry decrypts", async () => {
    await assertMigration(legacyItems.slice(0, 2));
    const persist = mock.fn(async () => vaultId);
    const corrupted = { ...legacyItems[1], iv: generateSalt() };
    await assert.rejects(unlockVault(password, {
        kind: "legacy", items: [legacyItems[0], corrupted],
    }, persist), /cannot be decrypted/);
    await assert.rejects(unlockVault("wrong password", {
        kind: "legacy", items: legacyItems.slice(0, 2),
    }, persist), /cannot be decrypted/);
    assert.equal(persist.mock.callCount(), 0);
});

test("legacy corruption, invalid verifier, duplicate verifiers, and empty snapshots fail before persistence", async () => {
    const persist = mock.fn(async () => vaultId);
    const badMarker = await legacyItem("bad-verifier", LEGACY_VERIFICATION_TITLE, "wrong marker");
    const corrupted = { ...legacyItems[1], encrypted_password: "!invalid!" };
    for (const items of [
        [legacyItems[2], legacyItems[0], corrupted],
        [legacyItems[0], badMarker],
        [...legacyItems, { ...legacyItems[2], id: "duplicate-verifier" }],
        [],
    ]) {
        await assert.rejects(unlockVault(password, { kind: "legacy", items }, persist), /cannot be decrypted|Multiple legacy verification|Missing legacy vault data/);
    }
    assert.equal(persist.mock.callCount(), 0);
});
