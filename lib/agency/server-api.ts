import { requireUserId } from "@/lib/auth-server";
import { store } from "./store";
import type {
  Approval,
  ApprovalStatus,
  Client,
  Invoice,
  LeverageSnapshot,
  Project,
  Run,
  RunEvent,
  RunEventKind,
  RunStatus,
  Skill,
  SkillCategory,
} from "./types";

export async function getApi() {
  const userId = await requireUserId();
  return bindApi(userId);
}

export function bindApi(userId: string) {
  return {
    listClients: (): Promise<Client[]> => store.listClients(userId),
    getClient: (id: string) => store.getClient(userId, id),
    createClient: (input: Parameters<typeof store.createClient>[1]) =>
      store.createClient(userId, input),

    listProjects: (clientId?: string): Promise<Project[]> =>
      store.listProjects(userId, clientId),
    getProject: (id: string) => store.getProject(userId, id),
    createProject: (input: Parameters<typeof store.createProject>[1]) =>
      store.createProject(userId, input),

    listSkills: (): Promise<Skill[]> => store.listSkills(userId),
    getSkill: (id: string) => store.getSkill(userId, id),
    createSkill: (input: Parameters<typeof store.createSkill>[1]) =>
      store.createSkill(userId, input),

    listRuns: (filter?: Parameters<typeof store.listRuns>[1]): Promise<Run[]> =>
      store.listRuns(userId, filter),
    getRun: (id: string) => store.getRun(userId, id),
    listRunEvents: (runId: string): Promise<RunEvent[]> =>
      store.listRunEvents(userId, runId),
    startRun: (input: Parameters<typeof store.startRun>[1]) =>
      store.startRun(userId, input),
    recordEvent: (input: Parameters<typeof store.recordEvent>[1]) =>
      store.recordEvent(userId, input),
    requestApproval: (input: Parameters<typeof store.requestApproval>[1]) =>
      store.requestApproval(userId, input),
    resolveApproval: (input: Parameters<typeof store.resolveApproval>[1]) =>
      store.resolveApproval(userId, input),
    endRun: (input: Parameters<typeof store.endRun>[1]) =>
      store.endRun(userId, input),

    listApprovals: (status?: ApprovalStatus): Promise<Approval[]> =>
      store.listApprovals(userId, status),

    listInvoices: (clientId?: string): Promise<Invoice[]> =>
      store.listInvoices(userId, clientId),
    getInvoice: (id: string) => store.getInvoice(userId, id),
    createInvoice: (input: Parameters<typeof store.createInvoice>[1]) =>
      store.createInvoice(userId, input),
    issueInvoice: (id: string) => store.issueInvoice(userId, id),
    payInvoice: (id: string) => store.payInvoice(userId, id),

    leverage: (windowDays?: number): Promise<LeverageSnapshot> =>
      store.leverage(userId, windowDays),
  };
}

export type BoundApi = ReturnType<typeof bindApi>;
export type { RunStatus, RunEventKind, ApprovalStatus, SkillCategory };
