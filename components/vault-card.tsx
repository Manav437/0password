"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, Eye, EyeOff, Check, ExternalLink, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { decrypt } from "@/lib/crypto";
import { getMasterKey } from "@/lib/masterKey";
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
    const [decryptedPassword, setDecryptedPassword] = useState<string | null>(
        null,
    );
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
        async function decryptPassword() {
            try {
                const key = getMasterKey();
                if (!key) return;
                const plaintext = await decrypt(
                    item.encrypted_password,
                    item.iv,
                    key,
                );
                setDecryptedPassword(plaintext);
            } catch {
                setDecryptedPassword("[decryption failed]");
            }
        }
        decryptPassword();
    }, [item.encrypted_password, item.iv]);

    const getIconDomain = () => {
        if (item.website_url && item.website_url.trim() !== "") {
            try {
                return new URL(
                    item.website_url.startsWith("http")
                        ? item.website_url
                        : `https://${item.website_url}`,
                ).hostname;
            } catch {
                return item.website_url;
            }
        }

        return `${item.title.toLowerCase().replace(/\s+/g, "")}.com`;
    };

    const iconDomain = getIconDomain();
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${iconDomain}&sz=64`;

    const copyToClipboard = () => {
        if (!decryptedPassword) return;
        navigator.clipboard.writeText(decryptedPassword);
        setCopied(true);
        toast.success("Password copied to clipboard!");
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    };

    const copyUserToClipboard = () => {
        if (!item.login_id) return;
        navigator.clipboard.writeText(item.login_id);
        setCopiedUser(true);
        toast.success("Username copied to clipboard!");
        if (userCopyTimerRef.current) clearTimeout(userCopyTimerRef.current);
        userCopyTimerRef.current = setTimeout(() => setCopiedUser(false), 2000);
    };

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteVaultItem(item.id);
            if (result.success) {
                toast.success("Item removed from vault");
            } else {
                toast.error("Failed to delete: " + result.error);
                setIsDeleting(false);
            }
        } catch (error) {
            toast.error("An error occurred while deleting");
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Image
                        src={faviconUrl}
                        alt={`${item.title} logo`}
                        width={32}
                        height={32}
                        className="rounded bg-muted p-1"
                        onError={(e) => (e.currentTarget.src = "/globe.svg")}
                    />
                    <div className="flex flex-col">
                        <h3 className="font-semibold truncate max-w-[120px]">
                            {item.title}
                        </h3>
                        {item.website_url && (
                            <a
                                href={item.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                                aria-label={`Visit ${item.title} website`}
                            >
                                {item.website_url.replace(/^https?:\/\//, "")}
                                <ExternalLink size={10} />
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
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

            <div className="space-y-1 mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Username
                </p>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate flex-1">
                        {item.login_id}
                    </p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-copy"
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

            <div className="space-y-1 mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Password
                </p>
                <div className="relative">
                    <p className="text-sm font-sans bg-muted/50 p-2 rounded break-all min-h-[36px] flex items-center">
                        {showPassword
                            ? (decryptedPassword ?? "••••••••••••")
                            : "••••••••••••"}
                    </p>
                </div>
            </div>

            <Button
                size="sm"
                variant={copied ? "default" : "secondary"}
                className="w-full ring-2 ring-black/10 dark:ring-white/10 gap-2 cursor-copy hover:ring-black/20 dark:hover:ring-white/20"
                onClick={copyToClipboard}
                aria-live="polite"
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Password"}
            </Button>
        </div>
    );
}
