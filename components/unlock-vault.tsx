"use client";

import { useEffect, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Eye, EyeOff, Lock } from "lucide-react";
import { getVaultState, initializeVault } from "@/app/actions/vault";
import { getVaultGeneration, setMasterKey } from "@/lib/masterKey";
import { unlockVault } from "@/lib/unlock";
import type { VaultState } from "@/lib/vault-protocol";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResetVaultDialog } from "./reset-vault-dialog";

export function UnlockVault({ userId }: { userId: string }) {
    const [state, setState] = useState<VaultState | null>(null);
    const [loadError, setLoadError] = useState("");
    const [reload, setReload] = useState(0);
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [show, setShow] = useState(false);
    const inFlight = useRef(false);
    const attempt = useRef(0);

    useEffect(() => {
        let active = true;
        getVaultState(userId).then((result) => {
            if (!active) return;
            if (result.success) setState(result.state);
            else setLoadError(result.error);
        }).catch(() => { if (active) setLoadError("Unable to load your vault. Please try again."); });
        return () => { active = false; attempt.current += 1; };
    }, [userId, reload]);

    const creating = state?.kind === "new";
    async function handleUnlock(event: React.FormEvent) {
        event.preventDefault();
        if (!state || !password || inFlight.current) return;
        if (creating && password !== confirmation) { setError("Master passwords do not match."); return; }
        if (creating && password.length < 12) { setError("Use at least 12 characters for your master password."); return; }
        inFlight.current = true;
        const currentAttempt = ++attempt.current;
        const generation = getVaultGeneration();
        setLoading(true);
        setError("");
        try {
            const latest = await getVaultState(userId);
            if (currentAttempt !== attempt.current || generation !== getVaultGeneration()) return;
            if (!latest.success) throw new Error(latest.error);
            if (latest.state.kind !== state.kind || (latest.state.kind === "ready" && state.kind === "ready" && latest.state.metadata.vault_id !== state.metadata.vault_id)) {
                setState(latest.state);
                setPassword("");
                setConfirmation("");
                setShow(false);
                throw new Error("Your vault changed in another session. Please review it and try again.");
            }
            const result = await unlockVault(password, latest.state, async (initialization) => {
                if (currentAttempt !== attempt.current || generation !== getVaultGeneration()) {
                    throw new Error("Your session changed. Please try again.");
                }
                const saved = await initializeVault(initialization, userId);
                if (!saved.success) throw new Error(saved.error);
                return saved.vaultId;
            });
            if (currentAttempt !== attempt.current) return;
            setPassword("");
            setConfirmation("");
            setShow(false);
            if (!setMasterKey(result.key, userId, result.vaultId, generation)) {
                setError("Your session changed. Please try again.");
            }
        } catch (failure) {
            if (currentAttempt === attempt.current) setError(failure instanceof Error ? failure.message : "Failed to unlock vault.");
        } finally {
            inFlight.current = false;
            if (currentAttempt === attempt.current) setLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
            <div className="absolute right-6 top-6"><UserButton /></div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(128,128,128,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(128,128,128,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="relative z-10 w-full max-w-sm px-4 py-12">
                <div className="mb-8 flex flex-col items-center gap-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted ring-2 ring-border"><Lock className="h-7 w-7 text-muted-foreground" /></div>
                    <h1 className="font-serif text-4xl">{creating ? "Create your vault" : "Vault locked"}</h1>
                    <p className="text-sm text-muted-foreground">
                        {creating ? "Choose a strong master password. It cannot be recovered if you forget it." : "Enter your master password to decrypt your vault."}
                    </p>
                </div>
                {!state && !loadError && <p role="status" className="text-center text-sm">Loading vault…</p>}
                {loadError && <div className="space-y-3 text-center">
                    <p role="alert" className="text-sm text-destructive">{loadError}</p>
                    <Button variant="outline" onClick={() => { setLoadError(""); setState(null); setReload((value) => value + 1); }}>Try again</Button>
                </div>}
                {state && <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="master-password" className="text-sm font-medium">Master password</label>
                        <div className="relative mt-1">
                            <Input id="master-password" type={show ? "text" : "password"} autoComplete={creating ? "new-password" : "current-password"}
                                value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} required
                                minLength={creating ? 12 : undefined} className="h-12 pr-12" autoFocus />
                            <button type="button" aria-label={show ? "Hide master password" : "Show master password"}
                                onClick={() => setShow((value) => !value)} className="absolute right-4 top-4 text-muted-foreground">
                                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {creating && <div className="space-y-2">
                        <label htmlFor="confirm-master-password" className="text-sm font-medium">Confirm master password</label>
                        <Input id="confirm-master-password" type="password" autoComplete="new-password" value={confirmation}
                            onChange={(event) => setConfirmation(event.target.value)} disabled={loading} required minLength={12} className="mt-1 h-12" />
                    </div>}
                    {state.kind === "legacy" && <p className="text-sm text-muted-foreground">After verifying your password, we’ll securely upgrade your vault encryption in this browser. No entries will be changed unless the complete upgrade succeeds.</p>}
                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" disabled={loading || !password || (creating && !confirmation)} className="cursor-pointer h-12 w-full gap-2">
                        {/*<ShieldCheck className="h-4 w-4" />*/}
                        {loading ? "Securing vault…" : creating ? "Create vault" : "Unlock vault"}
                    </Button>
                </form>}

                {!creating && <div className="mt-4 text-center"><ResetVaultDialog locked disabled={loading} /></div>}
                <p className="mt-8 text-center text-xs text-muted-foreground">Passwords are encrypted on your device. Service names, usernames, and URLs are not encrypted.</p>
            </div>
        </div>
    );
}
