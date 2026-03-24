"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { resetVault } from "@/app/actions/vault";
import { toast } from "sonner";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function ResetVaultDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        setLoading(true);
        try {
            const result = await resetVault();
            if (result.success) {
                toast.success("Vault has been reset.");
                setOpen(false);
                window.location.href = "/dashboard";
            } else {
                toast.error("Failed to reset vault: " + result.error);
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <SidebarMenuButton
                    tooltip="Reset Vault"
                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                >
                    <Trash2 />
                    <span>Reset Vault</span>
                </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Critical Action
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-zinc-600 dark:text-zinc-400">
                        This will <span className="font-bold text-destructive">PERMANENTLY DELETE</span> all records, passwords, and data in your vault.
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleReset}
                        disabled={loading}
                        className="cursor-pointer gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        Reset Everything
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
