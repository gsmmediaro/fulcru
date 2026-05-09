import {
  RiHome5Line,
  RiArrowRightUpLine,
  RiMailLine,
  RiPulseLine,
  RiBarChartBoxLine,
  RiFileChart2Line,
  RiShieldCheckLine,
  RiBillLine,
  RiReceiptLine,
  RiSettings4Line,
  RiStackLine,
  type RemixiconComponentType,
} from "@remixicon/react";

export type NavLeaf = {
  labelKey: string;
  href: string;
};

export type NavGroup = {
  id: string;
  labelKey: string;
  icon: RemixiconComponentType;
  href?: string;
  external?: boolean;
  children?: NavLeaf[];
};

export const sidebarNav: NavGroup[] = [
  { id: "home", labelKey: "nav.home", icon: RiHome5Line, href: "/agency" },
  {
    id: "runs",
    labelKey: "nav.runs",
    icon: RiPulseLine,
    href: "/agency/runs",
  },
  {
    id: "leverage",
    labelKey: "nav.leverage",
    icon: RiBarChartBoxLine,
    href: "/agency/leverage",
  },
  {
    id: "value",
    labelKey: "nav.value",
    icon: RiFileChart2Line,
    href: "/agency/value",
  },
  {
    id: "approvals",
    labelKey: "nav.approvals",
    icon: RiShieldCheckLine,
    href: "/agency/approvals",
  },
  {
    id: "catalog",
    labelKey: "nav.catalog",
    icon: RiStackLine,
    children: [
      { labelKey: "nav.skills", href: "/agency/skills" },
      { labelKey: "nav.clients", href: "/agency/clients" },
      { labelKey: "nav.projects", href: "/agency/projects" },
    ],
  },
  {
    id: "invoices",
    labelKey: "nav.invoices",
    icon: RiBillLine,
    href: "/agency/invoices",
  },
  {
    id: "expenses",
    labelKey: "nav.expenses",
    icon: RiReceiptLine,
    href: "/agency/expenses",
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    icon: RiSettings4Line,
    href: "/agency/settings",
  },
];

export const externalIcon = RiArrowRightUpLine;
export const mailIcon = RiMailLine;
