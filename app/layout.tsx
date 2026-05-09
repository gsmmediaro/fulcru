import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { cookies } from "next/headers";
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

type ThemePreference = "auto" | "light" | "dark";

function readThemeFromCookie(value: string | undefined): ThemePreference {
  if (value === "light" || value === "auto") return value;
  return "dark";
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const initialTheme = readThemeFromCookie(
    cookieStore.get("fulcru_theme")?.value,
  );

  // For SSR we set both `data-theme` and the legacy `dark` class. On `auto`
  // we conservatively render the dark palette and let the client refine.
  const dark =
    initialTheme === "dark" || initialTheme === "auto" ? "dark " : "";

  return (
    <html
      lang={locale}
      data-theme={initialTheme}
      className={`${dark}${beVietnamPro.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ConsoleGreeting />
        {children}
      </body>
    </html>
  );
}
