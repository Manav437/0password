"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ShieldCheck, Shuffle } from "lucide-react";
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

export function AddItemDialog() {
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
        const generated = Array.from(
            { length: 16 },
            () => chars[Math.floor(Math.random() * chars.length)],
        ).join("");
        form.setValue("password", generated, { shouldValidate: true });
        toast.success("Strong password generated!");
    };

    async function onSubmit(data: VaultItemValues) {
        try {
            const result = await saveVaultItem(data);

            if (result.success) {
                toast.success("Item saved securely!");
                form.reset();
            } else {
                toast.error("Failed to save: " + result.error);
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
            console.error(error);
        }
    }

    return (
        <Dialog>
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

                        <div className="flex gap-2 items-end">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="text" {...field} />
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
                            variant="outline"
                            type="submit"
                            className="cursor-pointer w-full bg-[#2c2c2c]/95 text-white hover:bg-[#2c2c2c]/85 hover:text-white"
                        >
                            Save to Vault
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
