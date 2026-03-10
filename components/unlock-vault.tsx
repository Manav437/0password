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
        } catch (e) {
            setError("Failed to unlock vault");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 dark:hidden bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-800/10 blur-[120px]" />

            <div className="relative z-10 w-full max-w-sm px-4">
                <div className="mb-8 flex flex-col items-center gap-4">
                    <div className="group flex h-16 w-16 items-center justify-center rounded-2xl ring-2 ring-zinc-600/20 dark:ring-zinc-400/20 bg-white shadow-sm hover:shadow-lg duration-300">
                        <Lock className="h-7 w-7 text-zinc-500 dark:text-zinc-400 transition-transform duration-500 group-hover:rotate-y-180" />
                    </div>
                    <div className="text-center">
                        <h1 className="font-serif tracking-wide text-4xl font-semibold text-zinc-900 dark:text-zinc-100">
                            Vault Locked
                        </h1>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
                            className="h-12 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 pr-10 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 [corner-shape:squircle] rounded-[50px] focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                        />
                        <button
                            type="button"
                            onClick={() => setShow(!show)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
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
                        className="font-sans cursor-pointer h-12 w-full [corner-shape:squircle] rounded-[50px] border border-emerald-600/30 text-emerald-50 text-sm bg-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-900 dark:hover:text-emerald-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-emerald-700 disabled:hover:text-emerald-50"
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

                <p className="mt-8 text-center font-serif text-sm text-zinc-600 dark:text-zinc-400 tracking-widest uppercase">
                    Zero-knowledge {" · "} Client-side decryption
                </p>
            </div>
        </div>
    );
}
