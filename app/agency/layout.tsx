import { redirect } from "next/navigation";
import { LocaleProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";
import { getSession, isOnboarded } from "@/lib/auth-server";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in?redirect=/agency");
  }
  if (!(await isOnboarded(session.user.id))) {
    redirect("/onboarding");
  }
  const locale = await getLocale();
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
