"use client";
import { useState } from "react";
import { deriveKey } from "@/lib/crypto";
import { setMasterKey } from "@/lib/masterKey";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";

interface UnlockVaultProps {
    onUnlock: () => void;
}

export function UnlockVault({ onUnlock }: UnlockVaultProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [show, setShow] = useState(false);

    async function handleUnlock() {
        if (!password) return;
        setLoading(true);
        setError("");
        try {
            const key = await deriveKey(password);
            setMasterKey(key);
            onUnlock();
        } catch (errr) {
            setError("Failed to unlock vault");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white/5">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />

            <div className="relative z-10 w-full max-w-sm px-4">
                <div className="mb-8 flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-600/20 bg-emerald-50 shadow-sm">
                        <Lock className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div className="text-center">
                        <h1 className="font-mono text-2xl font-bold tracking-tight text-zinc-900">
                            Vault Locked
                        </h1>
                        <p className="mt-1 text-sm text-zinc-400">
                            Enter your master password to decrypt your vault
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="relative">
                        <Input
                            type={show ? "text" : "password"}
                            placeholder="Master password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && handleUnlock()
                            }
                            className="h-12 border-zinc-200 bg-zinc-50 pr-10 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                        />
                        <button
                            type="button"
                            onClick={() => setShow(!show)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            {show ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>

                    {error && (
                        <p className="font-mono text-xs text-red-500">
                            {error}
                        </p>
                    )}

                    <Button
                        onClick={handleUnlock}
                        disabled={loading || !password}
                        className="cursor-pointer h-12 w-full border border-emerald-600/30 bg-emerald-50 font-mono text-sm text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-all disabled:opacity-30"
                        variant="ghost"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full border border-emerald-600/30 border-t-emerald-600 animate-spin" />
                                Deriving key...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" />
                                Unlock Vault
                            </span>
                        )}
                    </Button>
                </div>

                <p className="mt-8 text-center font-mono text-xs text-zinc-300 tracking-widest uppercase">
                    Zero-knowledge · Client-side decryption
                </p>
            </div>
        </div>
    );
}
