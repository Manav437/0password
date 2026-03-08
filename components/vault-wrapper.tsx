"use client";
import { useState } from "react";
import { getMasterKey } from "@/lib/masterKey";
import { UnlockVault } from "./unlock-vault";

export function VaultWrapper({ children }: { children: React.ReactNode }) {
    const [unlocked, setUnlocked] = useState(() => getMasterKey() !== null);

    if (!unlocked) {
        return <UnlockVault onUnlock={() => setUnlocked(true)} />;
    }

    return <>{children}</>;
}
