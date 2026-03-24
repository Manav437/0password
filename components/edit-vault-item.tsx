"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Shuffle, Loader2, EyeOff, Eye, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { updateVaultItem } from "@/app/actions/vault";
import { encrypt } from "@/lib/crypto";
import { getMasterKey } from "@/lib/masterKey";

type VaultItem = {
    id: string;
    title: string;
    login_id: string;
    encrypted_password: string;
    iv: string;
    website_url?: string;
};

interface EditItemDialogProps {
    item: VaultItem;
    decryptedPassword: string | null;
}

export function EditItemDialog({ item, decryptedPassword }: EditItemDialogProps) {
    const [open, setOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<VaultItemValues>({
        resolver: zodResolver(vaultItemSchema),
        defaultValues: {
            title: item.title,
            url: item.website_url || "",
            login_id: item.login_id,
            password: decryptedPassword || "",
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
        toast.success("Strong password generated!");
    };

    async function onSubmit(data: VaultItemValues) {
        setIsSubmitting(true);
        try {
            const key = getMasterKey();
            if (!key) {
                toast.error("Vault is locked. Please refresh and unlock.");
                return;
            }

            const { encryptedData, iv } = await encrypt(data.password, key);

            const result = await updateVaultItem(item.id, {
                title: data.title,
                login_id: data.login_id,
                website_url: data.url,
                encryptedPassword: encryptedData,
                iv,
            });

            if (result.success) {
                toast.success("Vault record updated.");
                setOpen(false);
            } else {
                toast.error("Failed to update: " + result.error);
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
                setOpen(isOpen);
                if (isOpen) {
                    form.reset({
                        title: item.title,
                        url: item.website_url || "",
                        login_id: item.login_id,
                        password: decryptedPassword || "",
                    });
                }
            }}
        >
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer">
                    <Edit2 size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        Edit record
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4 pt-4"
                    >
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Service Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g. Netflix, GitHub"
                                            {...field}
                                        />
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
                                    <FormLabel>Username / Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="manav@example.com"
                                            {...field}
                                        />
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
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="********"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            !showPassword,
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
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
                                            title="Generate Password"
                                        >
                                            <Shuffle className="h-4 w-4 cursor-pointer" />
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
                                    <FormLabel>
                                        Website URL (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="https://..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            variant="default"
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Vault Entry"
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
