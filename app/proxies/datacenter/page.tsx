import { RiServerLine } from "@remixicon/react";
import { ProxyProductPage } from "@/components/proxies/proxy-product-page";

export default function DatacenterProxiesPage() {
  return (
    <ProxyProductPage
      title="Datacenter Proxies"
      productLabel="Datacenter"
      ordersTitle="Datacenter orders"
      icon={RiServerLine}
      accent="green"
      nextPayment="2026-05-22"
      willBeAdded="10 proxies"
      price="$13.90"
      docsHref="https://docs.iproyal.com/proxies/datacenter"
      guideHref="https://iproyal.com/blog/datacenter-proxies-quick-start-guide"
    />
  );
}
