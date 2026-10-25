"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, Eye, EyeOff, Check, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { decrypt } from "@/lib/crypto";
import { getMasterKey, getVaultId } from "@/lib/masterKey";
import { getSafeWebsiteUrl } from "@/lib/vault";
import { deleteVaultItem } from "@/app/actions/vault";
import { EditItemDialog } from "./edit-vault-item";

type VaultItem = {
    id: string;
    title: string;
    login_id: string;
    encrypted_password: string;
    iv: string;
    website_url?: string;
};

export function VaultCard({ item }: { item: VaultItem }) {
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedUser, setCopiedUser] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const key = getMasterKey();
    const vaultId = getVaultId();
    const [decryption, setDecryption] = useState<{
        itemId: string;
        ciphertext: string;
        iv: string;
        key: CryptoKey;
        vaultId: string;
        plaintext: string | null;
        error: string | null;
    } | null>(null);
    const isCurrentDecryption = decryption !== null &&
        decryption.itemId === item.id &&
        decryption.ciphertext === item.encrypted_password &&
        decryption.iv === item.iv &&
        decryption.key === key && decryption.vaultId === vaultId;
    const decryptedPassword = isCurrentDecryption ? decryption.plaintext : null;
    const decryptionError = isCurrentDecryption ? decryption.error : null;
    const websiteUrl = getSafeWebsiteUrl(item.website_url);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            if (userCopyTimerRef.current)
                clearTimeout(userCopyTimerRef.current);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function decryptPassword() {
            if (!key || !vaultId) return;
            const source = {
                itemId: item.id,
                ciphertext: item.encrypted_password,
                iv: item.iv,
                key,
                vaultId,
            };
            let plaintext: string | null = null;
            let error: string | null = null;
            try {
                plaintext = await decrypt(item.encrypted_password, item.iv, key);
            } catch {
                error = "Unable to decrypt this password.";
            }
            if (cancelled || getMasterKey() !== key || getVaultId() !== vaultId) return;
            setShowPassword(false);
            setCopied(false);
            setDecryption({ ...source, plaintext, error });
        }
        void decryptPassword();
        return () => { cancelled = true; };
    }, [item.id, item.encrypted_password, item.iv, key, vaultId]);

    const copyToClipboard = async () => {
        if (decryptedPassword === null || !key || !vaultId ||
            getMasterKey() !== key || getVaultId() !== vaultId) return;
        try {
            await navigator.clipboard.writeText(decryptedPassword);
            setCopied(true);
            toast.success("Password copied to clipboard!");
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy password to clipboard.");
        }
    };

    const copyUserToClipboard = async () => {
        if (!item.login_id) return;
        try {
            await navigator.clipboard.writeText(item.login_id);
            setCopiedUser(true);
            toast.success("Username copied to clipboard!");
            if (userCopyTimerRef.current) clearTimeout(userCopyTimerRef.current);
            userCopyTimerRef.current = setTimeout(() => setCopiedUser(false), 2000);
        } catch {
            toast.error("Failed to copy username to clipboard.");
        }
    };

    const handleDelete = async () => {
        const currentKey = getMasterKey();
        const currentVaultId = getVaultId();
        if (!currentKey || !currentVaultId || currentKey !== key || currentVaultId !== vaultId) {
            toast.error("Vault is locked or the session changed. Please unlock again.");
            return;
        }
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteVaultItem(item.id, currentVaultId);
            if (result.success) {
                toast.success("Item removed from vault");
            } else {
                toast.error("Failed to delete: " + result.error);
                setIsDeleting(false);
            }
        } catch {
            toast.error("An error occurred while deleting");
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-w-0 p-3 md:p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex items-center justify-between gap-2 mb-2 md:mb-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
                    <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-sm font-semibold"
                        aria-hidden="true"
                    >
                        {item.title.trim().slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <h3 className="text-sm md:text-base font-semibold truncate md:max-w-[120px]">
                            {item.title}
                        </h3>
                        {websiteUrl && (
                            <a
                                href={websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-muted-foreground hover:text-primary flex min-w-0 items-center gap-1 transition-colors"
                                aria-label={`Visit ${item.title} website`}
                            >
                                <span className="truncate">{websiteUrl.replace(/^https?:\/\//, "")}</span>
                                <ExternalLink size={10} className="shrink-0" />
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-0 md:gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (getMasterKey() === key && getVaultId() === vaultId) {
                                setShowPassword(!showPassword);
                            }
                        }}
                        disabled={decryptedPassword === null}
                        aria-label={
                            showPassword ? "Hide password" : "Show password"
                        }
                        className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-[#2c2c2c]"
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    <EditItemDialog
                        item={item}
                        decryptedPassword={decryptedPassword}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className={cn("cursor-pointer transition-colors", {
                            "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20":
                                confirmDelete,
                            "text-muted-foreground hover:text-red-500":
                                !confirmDelete,
                        })}
                        title={confirmDelete ? "Confirm Delete" : "Delete Item"}
                    >
                        {isDeleting ? (
                            <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2 mb-1 md:block md:space-y-1 md:mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Username
                </p>
                <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium truncate flex-1">
                        {item.login_id}
                    </p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-6 md:w-6 shrink-0 cursor-copy"
                        onClick={copyUserToClipboard}
                        title="Copy Username"
                    >
                        {copiedUser ? (
                            <Check size={16} className="text-emerald-500" />
                        ) : (
                            <Copy size={16} className="group-hover:text-primary transition-colors" />
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2 md:block md:space-y-1 md:mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Password
                </p>
                <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-sans bg-muted/50 px-2 py-1 md:p-2 rounded break-all min-h-8 md:min-h-[36px] flex items-center">
                        {decryptionError ?? (showPassword && decryptedPassword !== null
                            ? decryptedPassword
                            : "••••••••••••")}
                    </p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:h-6 md:w-6 shrink-0 cursor-copy"
                        onClick={copyToClipboard}
                        disabled={decryptedPassword === null}
                        title="Copy Password"
                        aria-label={copied ? "Password copied" : "Copy password"}
                    >
                        {copied ? (
                            <Check size={16} className="text-emerald-500" />
                        ) : (
                            <Copy size={16} className="group-hover:text-primary transition-colors" />
                        )}
                    </Button>
                </div>
            </div>

            {/*<Button
                size="sm"
                variant={copied ? "default" : "secondary"}
                className="hidden md:inline-flex w-full ring-2 ring-black/10 dark:ring-white/10 gap-2 cursor-copy hover:ring-black/20 dark:hover:ring-white/20"
                onClick={copyToClipboard}
                disabled={decryptedPassword === null}
                aria-live="polite"
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Password"}
            </Button>*/}
        </div>
    );
}
