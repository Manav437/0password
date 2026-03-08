"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ShieldCheck, Shuffle, Loader2, EyeOff, Eye } from "lucide-react";
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
import { saveVaultItem } from "@/app/actions/vault";
import { encrypt } from "@/lib/crypto";
import { getMasterKey } from "@/lib/masterKey";

export function AddItemDialog() {
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

            const result = await saveVaultItem({
                title: data.title,
                login_id: data.login_id,
                website_url: data.url,
                encryptedPassword: encryptedData,
                iv,
            });

            if (result.success) {
                toast.success("Record secured in vault.");
                form.reset();
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
                setOpen(isOpen);
                if (!isOpen) form.reset();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 cursor-pointer">
                    <Plus className="h-4 w-4" />
                    <span>New Item</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Add Password
                    </DialogTitle>
                    <DialogDescription>
                        Enter the details for your new vault entry.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4 pt-4"
                    >
                        {/* Service Name */}
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

                        {/* Username */}
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

                        <div className="flex gap-2 items-end">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
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
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                            className="w-full bg-[#2c2c2c]/95 text-white hover:bg-[#2c2c2c]/85 hover:text-white cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save to Vault"
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
