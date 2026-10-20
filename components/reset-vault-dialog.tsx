"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { getVaultRevision, resetVault } from "@/app/actions/vault";
import { clearMasterKey } from "@/lib/masterKey";
import { RESET_CONFIRMATION } from "@/lib/vault-protocol";
import { toast } from "sonner";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function ResetVaultDialog({ locked = false, disabled = false }: { locked?: boolean; disabled?: boolean }) {
    const { userId } = useAuth();
    const [open, setOpen] = useState(false);
    const [confirmation, setConfirmation] = useState("");
    const [loading, setLoading] = useState(false);
    const [revision, setRevision] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [checkError, setCheckError] = useState("");
    const revisionRequest = useRef(0);
    const inFlight = useRef(false);
    const inputId = useId();

    useEffect(() => () => { revisionRequest.current += 1; }, []);

    function changeOpen(next: boolean) {
        if (loading || inFlight.current) return;
        const request = ++revisionRequest.current;
        setOpen(next);
        setConfirmation("");
        setRevision(null);
        setCheckError("");
        setChecking(next);
        if (!next || !userId) return;
        getVaultRevision(userId).then((result) => {
            if (request !== revisionRequest.current) return;
            if (result.success) setRevision(result.revision);
            else setCheckError(result.error);
        }).catch(() => {
            if (request === revisionRequest.current) setCheckError("Unable to check your vault. Close this dialog and try again.");
        }).finally(() => {
            if (request === revisionRequest.current) setChecking(false);
        });
    }

    async function handleReset(event: React.FormEvent) {
        event.preventDefault();
        if (!userId || !revision || checking || confirmation !== RESET_CONFIRMATION || inFlight.current) return;
        inFlight.current = true;
        setLoading(true);
        try {
            const result = await resetVault(confirmation, userId, revision);
            if (!result.success) { toast.error(result.error); return; }
            clearMasterKey();
            if (typeof BroadcastChannel !== "undefined") {
                const channel = new BroadcastChannel("0password-vault-reset");
                channel.postMessage({ userId });
                channel.close();
            }
            toast.success("Vault deleted. You can now create a new master password.");
            window.location.replace("/dashboard");
        } catch {
            toast.error("Unable to reset your vault. Please try again.");
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogTrigger asChild>
                {locked ? <Button variant="link" disabled={disabled}>Forgot master password?</Button> :
                    <SidebarMenuButton tooltip="Reset vault" disabled={disabled} className="text-muted-foreground hover:text-destructive cursor-pointer">
                        <Trash2 /><span>Reset vault</span>
                    </SidebarMenuButton>}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]" showCloseButton={!loading}
                onEscapeKeyDown={(event) => { if (loading) event.preventDefault(); }}
                onInteractOutside={(event) => { if (loading) event.preventDefault(); }}>

                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Permanently reset vault?
                    </DialogTitle>
                    <DialogDescription>
                        Your master password cannot be recovered. Resetting permanently deletes every credential
                        in your vault so you can create a new one. This cannot be undone and does not reset your
                        account sign-in password.
                    </DialogDescription>
                </DialogHeader>
                {checking && <p role="status" className="text-sm text-muted-foreground">Checking vault state…</p>}
                {checkError && <p role="alert" className="text-sm text-destructive">{checkError}</p>}
                <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor={inputId} className="text-sm font-medium">Type {RESET_CONFIRMATION} to confirm deletion</label>
                        <Input className="mt-2" id={inputId} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
                            autoComplete="off" spellCheck={false} disabled={loading} />
                    </div>
                    <DialogFooter>
                        <Button className="cursor-pointer" type="button" variant="ghost" onClick={() => changeOpen(false)} disabled={loading}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={loading || checking || !revision || confirmation !== RESET_CONFIRMATION || !userId} className="cursor-pointer gap-2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete vault permanently
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
