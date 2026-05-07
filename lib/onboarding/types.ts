export const AGENCY_SIZES = [
  "solo",
  "s_2_5",
  "s_6_20",
  "s_21_50",
  "s_51_plus",
] as const;
export type AgencySize = (typeof AGENCY_SIZES)[number];

export const CONCURRENT_CLIENTS = [
  "c_1",
  "c_2_5",
  "c_6_15",
  "c_16_50",
  "c_50_plus",
] as const;
export type ConcurrentClients = (typeof CONCURRENT_CLIENTS)[number];

export const SERVICE_CATEGORIES = [
  "web_dev",
  "design",
  "content",
  "marketing",
  "data",
  "consulting",
  "ops",
  "other",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const USE_CASES = [
  "track_runs",
  "bill_clients",
  "approvals",
  "team_visibility",
  "leverage",
] as const;
export type UseCase = (typeof USE_CASES)[number];

export const ATTRIBUTIONS = [
  "search",
  "youtube",
  "twitter",
  "linkedin",
  "reddit",
  "tiktok",
  "friend",
  "claude_code",
  "other",
] as const;
export type Attribution = (typeof ATTRIBUTIONS)[number];

export type OnboardingPayload = {
  agencySize: AgencySize;
  concurrentClients: ConcurrentClients;
  serviceCategory: ServiceCategory;
  serviceCategoryOther?: string;
  useCases: UseCase[];
  attribution: Attribution;
  attributionOther?: string;
};
