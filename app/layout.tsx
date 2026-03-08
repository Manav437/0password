import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "0password",
    description: "A secure, client-side encrypted password manager  ",
    icons: {
        icon: "/0password-icon.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body className={`${inter.variable} antialiased`}>
                    {children}
                    <Toaster />
                </body>
            </html>
        </ClerkProvider>
    );
}
