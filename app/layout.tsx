import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { ConsoleGreeting } from "@/components/brand/console-greeting";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fulcra",
    template: "%s · Fulcra",
  },
  description:
    "Time-tracking, leverage measurement and billing for AI-coding agencies. Bill the leverage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
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
