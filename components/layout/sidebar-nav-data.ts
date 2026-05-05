import {
  RiHome5Line,
  RiListCheck2,
  RiMapPin2Line,
  RiToolsLine,
  RiInformationLine,
  RiLightbulbLine,
  RiUserFollowLine,
  RiArrowRightUpLine,
  RiMailLine,
  RiPulseLine,
  RiSparkling2Line,
  RiBarChartBoxLine,
  RiShieldCheckLine,
  RiBriefcase4Line,
  RiFolder3Line,
  RiBillLine,
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
  { id: "leverage", label: "Leverage", icon: RiBarChartBoxLine, href: "/agency/leverage" },
  { id: "approvals", label: "Approvals", icon: RiShieldCheckLine, href: "/agency/approvals" },
  { id: "skills", label: "Skills", icon: RiSparkling2Line, href: "/agency/skills" },
  { id: "projects", label: "Projects", icon: RiFolder3Line, href: "/agency/projects" },
  { id: "clients", label: "Clients", icon: RiBriefcase4Line, href: "/agency/clients" },
  { id: "invoices", label: "Invoices", icon: RiBillLine, href: "/agency/invoices" },
  { id: "orders", label: "My Orders", icon: RiListCheck2, href: "/orders" },
  {
    id: "proxies",
    label: "Proxies",
    icon: RiMapPin2Line,
    children: [
      { label: "Residential", href: "/proxies/residential" },
      { label: "ISP", href: "/proxies/isp" },
      { label: "Datacenter", href: "/proxies/datacenter" },
      { label: "Mobile", href: "/proxies/mobile" },
      { label: "Web Unblocker", href: "/proxies/web-unblocker" },
    ],
  },
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
