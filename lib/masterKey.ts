let masterKey: CryptoKey | null = null;

export function setMasterKey(key: CryptoKey) {
    masterKey = key;
}

export function getMasterKey(): CryptoKey | null {
    return masterKey;
}

export function clearMasterKey() {
    masterKey = null;
}
