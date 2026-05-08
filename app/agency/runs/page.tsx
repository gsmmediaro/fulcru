import { RiTimeLine } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";
import { TimerView } from "@/components/agency/timer/TimerView";

export default async function RunsPage() {
  const { t } = await getT();
  const api = await getApi();

  // Fetch last 14 days of runs plus clients and projects for display
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const [runs, clients, projects, settings] = await Promise.all([
    api.listRuns({ sinceDate: since }),
    api.listClients(),
    api.listProjects(),
    api.getSettings(),
  ]);

  return (
    <AppShell>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[12px]">
          <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiTimeLine size={18} />
          </span>
          <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight text-[var(--color-text-strong)] sm:text-[28px] sm:leading-[34px]">
            {t("nav.runs")}
          </h1>
        </div>
      </div>

      {/* Timer view */}
      <div className="mt-[20px]">
        <TimerView
          initialRuns={runs}
          clients={clients}
          projects={projects}
          currency={settings.businessCurrency}
        />
      </div>
    </AppShell>
  );
}
