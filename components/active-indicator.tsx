"use client";

import { motion } from "framer-motion";

interface ActiveIndicatorProps {
    className?: string;
}

export function ActiveIndicator({ className }: ActiveIndicatorProps) {
    return (
        <motion.div
            layoutId="active-nav-indicator"
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
            }}
            className={className}
        />
    );
}
