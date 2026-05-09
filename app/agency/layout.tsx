import { redirect } from "next/navigation";
import { LocaleProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";
import { getSession, isOnboarded } from "@/lib/auth-server";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ThemeApplier } from "@/components/layout/theme-applier";
import { getApi } from "@/lib/agency/server-api";

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
  const api = await getApi();
  const settings = await api.getSettings();
  return (
    <LocaleProvider locale={locale}>
      <ThemeApplier theme={settings.theme} />
      <ConfirmProvider>{children}</ConfirmProvider>
    </LocaleProvider>
  );
}
