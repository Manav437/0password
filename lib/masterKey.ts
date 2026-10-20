type VaultSession = { userId: string; vaultId: string; key: CryptoKey };

let session: VaultSession | null = null;
let userId: string | null = null;
let generation = 0;
const listeners = new Set<() => void>();

function notify() {
    for (const listener of listeners) listener();
}

export function setVaultUser(nextUserId: string | null) {
    if (userId === nextUserId) return;
    userId = nextUserId;
    clearMasterKey();
}

export function getVaultGeneration() { return generation; }

// An async unlock started before a lock or account change must not restore its key.
export function setMasterKey(key: CryptoKey, ownerId: string, vaultId: string, expectedGeneration: number): boolean {
    if (userId !== ownerId || generation !== expectedGeneration) return false;
    session = { userId: ownerId, vaultId, key };
    notify();
    return true;
}

export function getMasterKey(): CryptoKey | null { return session?.key ?? null; }
export function getVaultId(): string | null { return session?.vaultId ?? null; }
export function getVaultSession() { return session; }
export function getServerVaultSession() { return null; }
export function subscribeVaultSession(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function clearMasterKey() {
    session = null;
    generation += 1;
    notify();
}
