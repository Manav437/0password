import assert from "node:assert/strict";
import { before, beforeEach, test } from "node:test";
import {
    clearMasterKey, getMasterKey, getServerVaultSession, getVaultGeneration,
    getVaultId, getVaultSession, setMasterKey, setVaultUser, subscribeVaultSession,
} from "../lib/masterKey.ts";

let key: CryptoKey;
before(async () => {
    key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
});
beforeEach(() => {
    setVaultUser(null);
    clearMasterKey();
});

test("only the current owner and generation can install a session", () => {
    setVaultUser("alice");
    const generation = getVaultGeneration();
    assert.equal(setMasterKey(key, "bob", "bob-vault", generation), false);
    assert.equal(setMasterKey(key, "alice", "alice-vault", generation - 1), false);
    assert.equal(setMasterKey(key, "alice", "alice-vault", generation + 1), false);
    assert.equal(getVaultSession(), null);
    assert.equal(setMasterKey(key, "alice", "alice-vault", generation), true);
    assert.deepEqual(getVaultSession(), { userId: "alice", vaultId: "alice-vault", key });
    assert.equal(getMasterKey(), key);
    assert.equal(getVaultId(), "alice-vault");
    assert.equal(getServerVaultSession(), null);
    assert.equal(setMasterKey(key, "bob", "bob-vault", generation), false);
    assert.equal(getVaultId(), "alice-vault", "a rejected installation must preserve the current session");
});

test("locking clears the key and vault ID and invalidates the captured generation", () => {
    setVaultUser("alice");
    const generation = getVaultGeneration();
    assert.equal(setMasterKey(key, "alice", "vault", generation), true);
    clearMasterKey();
    assert.equal(getVaultGeneration(), generation + 1);
    assert.equal(getVaultSession(), null);
    assert.equal(getMasterKey(), null);
    assert.equal(getVaultId(), null);
    assert.equal(setMasterKey(key, "alice", "vault", generation), false);
    clearMasterKey();
    assert.equal(getVaultGeneration(), generation + 2, "locking an already locked vault still invalidates pending work");
});

test("same-owner updates preserve sessions; account changes and logout clear them", () => {
    setVaultUser("alice");
    const generation = getVaultGeneration();
    setMasterKey(key, "alice", "alice-vault", generation);
    setVaultUser("alice");
    assert.equal(getVaultGeneration(), generation);
    assert.equal(getMasterKey(), key);
    setVaultUser("bob");
    assert.equal(getVaultGeneration(), generation + 1);
    assert.equal(getVaultSession(), null);
    assert.equal(setMasterKey(key, "alice", "alice-vault", getVaultGeneration()), false);
    assert.equal(setMasterKey(key, "bob", "bob-vault", getVaultGeneration()), true);
    setVaultUser(null);
    assert.equal(getVaultSession(), null);
    assert.equal(setMasterKey(key, "bob", "bob-vault", getVaultGeneration()), false);
});

test("async unlock finishing after lock or an account round-trip cannot resurrect a session", async () => {
    for (const invalidate of [
        () => clearMasterKey(),
        () => { setVaultUser("bob"); setVaultUser("alice"); },
    ]) {
        setVaultUser("alice");
        const generation = getVaultGeneration();
        let finish!: (key: CryptoKey) => void;
        const derivation = new Promise<CryptoKey>((resolve) => { finish = resolve; });
        const pendingUnlock = derivation.then((derived) => setMasterKey(derived, "alice", "old-vault", generation));
        invalidate();
        finish(key);
        assert.equal(await pendingUnlock, false);
        assert.equal(getVaultSession(), null);
    }
});

test("stale async completion cannot overwrite a newer session", async () => {
    setVaultUser("alice");
    const generation = getVaultGeneration();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; })
        .then(() => setMasterKey(key, "alice", "stale-vault", generation));
    clearMasterKey();
    assert.equal(setMasterKey(key, "alice", "new-vault", getVaultGeneration()), true);
    finish();
    assert.equal(await pending, false);
    assert.equal(getVaultId(), "new-vault");
    assert.equal(getMasterKey(), key);
});

test("subscribers see session transitions, but not rejected writes or updates after unsubscribe", () => {
    const observed: ReturnType<typeof getVaultSession>[] = [];
    const unsubscribe = subscribeVaultSession(() => observed.push(getVaultSession()));
    try {
        setVaultUser("alice");
        setMasterKey(key, "alice", "vault", getVaultGeneration());
        setMasterKey(key, "bob", "other-vault", getVaultGeneration());
        setVaultUser("alice");
        clearMasterKey();
        assert.deepEqual(observed, [null, { userId: "alice", vaultId: "vault", key }, null]);
        unsubscribe();
        clearMasterKey();
        assert.equal(observed.length, 3);
    } finally {
        unsubscribe();
    }
});
