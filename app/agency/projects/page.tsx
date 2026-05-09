import { RiFolder3Line } from "@remixicon/react";
import { AppShell } from "@/components/layout/app-shell";
import { NewProjectButton } from "@/components/agency/new-project-modal";
import { ProjectsGrid } from "@/components/agency/projects-grid";
import { EmptyState } from "@/components/agency/empty-state";
import { getApi } from "@/lib/agency/server-api";
import { getT } from "@/lib/i18n/server";

export default async function ProjectsPage() {
  const { t } = await getT();
  const api = await getApi();
  const [clients, projects] = await Promise.all([
    api.listClients(),
    api.listProjects(),
  ]);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const runsByProject = await Promise.all(
    projects.map((p) => api.listRuns({ projectId: p.id })),
  );
  const projectCards = projects.map((p, i) => {
    const client = clientById.get(p.clientId);
    const runs = runsByProject[i];
    const shipped = runs.filter((r) => r.status === "shipped");
    return {
      ...p,
      clientName: client?.name ?? "-",
      runsCount: runs.length,
      effectiveHours: shipped.reduce((s, r) => s + r.baselineHours, 0),
      billableUsd: shipped.reduce((s, r) => s + r.billableUsd, 0),
    };
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[14px]">
          <span className="flex size-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-400)]">
            <RiFolder3Line size={20} />
          </span>
          <div className="flex flex-col">
            <h1 className="text-[26px] font-semibold leading-[32px] tracking-tight sm:text-[28px] sm:leading-[34px]">
              {t("projects.title")}
            </h1>
            <p className="mt-[2px] text-[13px] leading-[18px] text-[var(--color-text-soft)]">
              {t("projects.subtitle")}
            </p>
          </div>
        </div>
        <NewProjectButton clients={clients} />
      </div>

      {projects.length === 0 ? (
        <div className="enter-stagger mt-[24px]">
          <EmptyState
            icon={<RiFolder3Line size={22} />}
            title={t("projects.empty.title")}
            description={t("projects.empty.body")}
            action={<NewProjectButton clients={clients} />}
          />
        </div>
      ) : (
        <ProjectsGrid clients={clients} projects={projectCards} />
      )}
    </AppShell>
  );
}
