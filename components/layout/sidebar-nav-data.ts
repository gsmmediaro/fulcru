import {
  RiHome5Line,
  RiListCheck2,
  RiToolsLine,
  RiInformationLine,
  RiLightbulbLine,
  RiUserFollowLine,
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
  { id: "home", label: "Home", icon: RiHome5Line, href: "/" },
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
  { id: "invoices", label: "Invoices", icon: RiBillLine, href: "/agency/invoices" },
  { id: "orders", label: "My Orders", icon: RiListCheck2, href: "/orders" },
  { id: "tools", label: "Tools", icon: RiToolsLine, href: "/tools" },
  {
    id: "help",
    label: "Help Center",
    icon: RiInformationLine,
    href: "/help",
  },
  {
    id: "suggestion",
    label: "Got a Suggestion?",
    icon: RiLightbulbLine,
    href: "/feedback",
  },
  {
    id: "referral",
    label: "Referral program",
    icon: RiUserFollowLine,
    href: "/referral",
  },
];

export const externalIcon = RiArrowRightUpLine;
export const mailIcon = RiMailLine;
