import {
  RiHome5Line,
  RiArrowRightUpLine,
  RiMailLine,
  RiPulseLine,
  RiBarChartBoxLine,
  RiShieldCheckLine,
  RiBillLine,
  RiStackLine,
  type RemixiconComponentType,
} from "@remixicon/react";

export type NavLeaf = {
  label: string;
  href: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: RemixiconComponentType;
  href?: string;
  external?: boolean;
  children?: NavLeaf[];
};

export const sidebarNav: NavGroup[] = [
  { id: "home", label: "Home", icon: RiHome5Line, href: "/agency/runs" },
  { id: "runs", label: "Runs", icon: RiPulseLine, href: "/agency/runs" },
  {
    id: "leverage",
    label: "Leverage",
    icon: RiBarChartBoxLine,
    href: "/agency/leverage",
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: RiShieldCheckLine,
    href: "/agency/approvals",
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: RiStackLine,
    children: [
      { label: "Skills", href: "/agency/skills" },
      { label: "Clients", href: "/agency/clients" },
      { label: "Projects", href: "/agency/projects" },
    ],
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: RiBillLine,
    href: "/agency/invoices",
  },
];

export const externalIcon = RiArrowRightUpLine;
export const mailIcon = RiMailLine;
