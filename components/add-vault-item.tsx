"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Shuffle, Loader2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import { vaultItemSchema, type VaultItemValues } from "../lib/vault";
import { saveVaultItem } from "@/app/actions/vault";
import { encrypt } from "@/lib/crypto";
import { getMasterKey, getVaultId } from "@/lib/masterKey";

export function AddItemDialog({
    iconOnly = false,
    className = "",
    variant,
}: {
    iconOnly?: boolean;
    className?: string;
    variant?: "default" | "outline";
}) {
    const [open, setOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<VaultItemValues>({
        resolver: zodResolver(vaultItemSchema),
        defaultValues: {
            title: "",
            url: "",
            login_id: "",
            password: "",
        },
    });

    const generatePassword = () => {
        const chars =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        const array = new Uint32Array(16);
        window.crypto.getRandomValues(array);
        const generated = Array.from(
            array,
            (n) => chars[n % chars.length],
        ).join("");
        form.setValue("password", generated, { shouldValidate: true });
    };

    async function onSubmit(data: VaultItemValues) {
        setIsSubmitting(true);
        try {
            const key = getMasterKey();
            const vaultId = getVaultId();
            if (!key || !vaultId) {
                toast.error("Vault is locked. Please refresh and unlock.");
                return;
            }

            const { encryptedData, iv } = await encrypt(data.password, key);

            if (getMasterKey() !== key || getVaultId() !== vaultId) {
                toast.error("Vault session changed. Please unlock and try again.");
                return;
            }

            const result = await saveVaultItem({
                title: data.title,
                login_id: data.login_id,
                website_url: data.url,
                encryptedPassword: encryptedData,
                iv,
            }, vaultId);

            if (result.success) {
                toast.success("Record secured in vault.");
                form.reset();
                setShowPassword(false);
                setOpen(false);
            } else {
                toast.error("Failed to save: " + result.error);
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (isSubmitting && !isOpen) return;
                setOpen(isOpen);
                setShowPassword(false);
                if (!isOpen) form.reset();
            }}
        >
            <DialogTrigger asChild>
                <Button variant={iconOnly ? "ghost" : variant ?? "default"} size={iconOnly ? "icon" : "default"} className={`gap-2 ${className}`} aria-label="Add item">
                    <Plus className="h-4 w-4" />
                    {!iconOnly && <span>New Item</span>}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-md p-5 sm:max-w-md sm:p-7">
                <DialogHeader className="gap-3 pr-7 mt-2 text-left">
                    {/* <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                    </div> */}
                    <div className="space-y-1.5">
                        <DialogTitle className="text-xl">Add a password</DialogTitle>
                        {/* <DialogDescription className="leading-relaxed">
                            Add the login details you want to keep in your vault.
                        </DialogDescription> */}
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-5"
                    >
                        <div className="space-y-4 rounded-md p-0">
                            {/* <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Login details</p> */}
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service name</FormLabel>
                                        <FormControl>
                                            <Input autoComplete="off" placeholder="e.g. GitHub" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="login_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Username or email</FormLabel>
                                        <FormControl>
                                            <Input autoComplete="username" placeholder="you@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <div className="relative flex-1">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        autoComplete="new-password"
                                                        placeholder="Enter password"
                                                        className="pr-10"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={generatePassword}
                                                title="Generate password"
                                                aria-label="Generate password"
                                            >
                                                <Shuffle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Website URL <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                                        <FormControl>
                                            <Input
                                                type="url"
                                                autoComplete="url"
                                                placeholder="https://..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* <p className="text-xs leading-relaxed text-muted-foreground">
                            Your password is encrypted on this device. Service names, usernames, and URLs are not encrypted.
                        </p> */}

                        <DialogFooter className="gap-2 pt-4 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="gap-2"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {isSubmitting ? "Saving..." : "Save to vault"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
