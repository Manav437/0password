"use client";

const PBKDF2_ITERATIONS = 100000;

// Turns master password string → usable CryptoKey
export async function deriveKey(masterPassword: string): Promise<CryptoKey> {
    // 1. import masterPassword as raw key material
    // 2. use deriveKey with PBKDF2, SHA-256, 100k iterations
    // 3. output AES-GCM 256-bit key
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(masterPassword),
        "PBKDF2",
        false,
        ["deriveKey"],
    );

    const salt = encoder.encode("0password-salt");
    return await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
    );
}

// Encrypts plaintext → { encryptedData, iv } both base64
export async function encrypt(
    text: string,
    key: CryptoKey,
): Promise<{ encryptedData: string; iv: string }> {
    // 1. generate random 12-byte IV
    // 2. encrypt with AES-GCM
    // 3. convert both to base64 and return
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedText,
    );

    const toBase64 = (buffer: ArrayBuffer | Uint8Array) =>
        btoa(String.fromCharCode(...new Uint8Array(buffer)));

    return {
        encryptedData: toBase64(encrypted),
        iv: toBase64(iv),
    };
}

// Decrypts encryptedData + iv → plaintext string
export async function decrypt(
    encryptedData: string,
    iv: string,
    key: CryptoKey,
): Promise<string> {
    // reverse of encrypt
    const fromBase64 = (base64: string) =>
        Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(iv) },
        key,
        fromBase64(encryptedData),
    );

    return new TextDecoder().decode(decrypted);
}
