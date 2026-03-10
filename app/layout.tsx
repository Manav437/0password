import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

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
    title: "0password",
    description: "A secure, client-side encrypted password manager",
    icons: {
        icon: "/0password-icon.png",
    },
    openGraph: {
        title: "0Password",
        description:
            "A zero-knowledge, client-side encrypted password manager.",
        url: "https://0password.vercel.app/",
        siteName: "0Password",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "0Password — Zero-knowledge password manager",
            },
        ],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "0Password",
        description:
            "A zero-knowledge, client-side encrypted password manager.",
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
                        {children}
                        <Toaster />
                    </ThemeProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
