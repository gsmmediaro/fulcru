import { requireUserId } from "@/lib/auth-server";
import { store } from "./store";
import type {
  AgencySettings,
  Approval,
  ApprovalStatus,
  Client,
  Expense,
  ExpenseCategory,
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
    updateClient: (
      id: string,
      patch: Parameters<typeof store.updateClient>[2],
    ) => store.updateClient(userId, id, patch),

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
    startManualRun: (input: Parameters<typeof store.startManualRun>[1]) =>
      store.startManualRun(userId, input),
    startBreakRun: (input: Parameters<typeof store.startBreakRun>[1]) =>
      store.startBreakRun(userId, input),
    appendManualEntry: (input: Parameters<typeof store.appendManualEntry>[1]) =>
      store.appendManualEntry(userId, input),
    stopRun: (runId: string) => store.stopRun(userId, runId),
    updateRun: (runId: string, patch: Parameters<typeof store.updateRun>[2]) =>
      store.updateRun(userId, runId, patch),
    deleteRun: (runId: string) => store.deleteRun(userId, runId),
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
    voidInvoice: (id: string) => store.voidInvoice(userId, id),
    deleteInvoice: (id: string) => store.deleteInvoice(userId, id),
    duplicateInvoice: (id: string) => store.duplicateInvoice(userId, id),
    updateInvoice: (
      id: string,
      patch: Parameters<typeof store.updateInvoice>[2],
    ) => store.updateInvoice(userId, id, patch),

    listExpenses: (
      filter?: Parameters<typeof store.listExpenses>[1],
    ): Promise<Expense[]> => store.listExpenses(userId, filter),
    getExpense: (id: string) => store.getExpense(userId, id),
    createExpense: (input: Parameters<typeof store.createExpense>[1]) =>
      store.createExpense(userId, input),
    updateExpense: (
      id: string,
      patch: Parameters<typeof store.updateExpense>[2],
    ) => store.updateExpense(userId, id, patch),
    deleteExpense: (id: string) => store.deleteExpense(userId, id),
    attachExpensesToInvoice: (expenseIds: string[], invoiceId: string) =>
      store.attachExpensesToInvoice(userId, expenseIds, invoiceId),

    leverage: (windowDays?: number): Promise<LeverageSnapshot> =>
      store.leverage(userId, windowDays),

    getSettings: (): Promise<AgencySettings> => store.getSettings(userId),
    updateSettings: (patch: Parameters<typeof store.updateSettings>[1]) =>
      store.updateSettings(userId, patch),
  };
}

export type BoundApi = ReturnType<typeof bindApi>;
export type { RunStatus, RunEventKind, ApprovalStatus, SkillCategory, ExpenseCategory };
