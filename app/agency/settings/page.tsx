import { RiSettings4Line } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/agency/settings-form";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const { t } = await getT();
  const api = await getApi();
  const settings = await api.getSettings();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[720px]">
        <div className="flex flex-wrap items-center justify-between gap-[16px]">
          <div className="flex items-center gap-[14px]">
            <span className="flex size-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
              <RiSettings4Line size={20} />
            </span>
            <div className="flex flex-col">
              <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
                {t("settings.title")}
              </h1>
              <p className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-soft)]">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-[24px]">
          <SettingsForm initial={settings} />
        </div>
      </div>
    </AppShell>
  );
}
