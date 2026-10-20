import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { VaultSessionProvider } from "@/components/vault-session-provider";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
    variable: "--font-instrument-serif",
    subsets: ["latin"],
    weight: "400",
});

export const metadata: Metadata = {
    metadataBase: new URL(
        process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000"
    ),
    title: "0Password",
    description: "A secure, client-side encrypted password manager",
    icons: {
        icon: "/0password-icon.png",
    },
    openGraph: {
        title: "0Password",
        description: "A password manager with client-side password encryption.",
        url: "https://0password.vercel.app/",
        siteName: "0Password",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "0Password — Client-side password encryption",
            },
        ],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "0Password",
        description: "A password manager with client-side password encryption.",
        images: ["/og-image.png"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="en" suppressHydrationWarning>
                <body
                    className={`${inter.variable} ${instrumentSerif.variable} antialiased`}
                >
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <VaultSessionProvider>{children}</VaultSessionProvider>
                        <Toaster />
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
