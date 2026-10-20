export const LEGACY_KDF_ITERATIONS = 100_000;

export function toBase64(bytes: Uint8Array): string {
    return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export function generateSalt(): string {
    return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

async function derive(masterPassword: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(masterPassword), "PBKDF2", false, ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

export function deriveKey(masterPassword: string, parameters: { salt: string; iterations: number }): Promise<CryptoKey> {
    if (fromBase64(parameters.salt).length !== 16 || parameters.iterations !== 600_000) {
        throw new Error("Unsupported vault key parameters.");
    }
    return derive(masterPassword, fromBase64(parameters.salt), parameters.iterations);
}

// Only used to read old vaults before an atomic, client-side re-encryption.
export function deriveLegacyKey(masterPassword: string): Promise<CryptoKey> {
    return derive(masterPassword, new TextEncoder().encode("0password-salt"), LEGACY_KDF_ITERATIONS);
}

export async function encrypt(text: string, key: CryptoKey): Promise<{ encryptedData: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, key, new TextEncoder().encode(text),
    );
    return { encryptedData: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
}

export async function decrypt(encryptedData: string, iv: string, key: CryptoKey): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(encryptedData),
    );
    return new TextDecoder().decode(decrypted);
}
