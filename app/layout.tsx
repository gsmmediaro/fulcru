import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { ConsoleGreeting } from "@/components/brand/console-greeting";
import { getLocale } from "@/lib/i18n/server";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fulcru",
    template: "%s · Fulcru",
  },
  description:
    "Time-tracking, leverage measurement and billing for AI-coding agencies. Bill the leverage.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`dark ${beVietnamPro.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ConsoleGreeting />
        {children}
      </body>
    </html>
  );
}
