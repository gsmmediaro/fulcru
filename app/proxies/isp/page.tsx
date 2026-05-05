import { RiFlashlightLine } from "@remixicon/react";
import { ProxyProductPage } from "@/components/proxies/proxy-product-page";

export default function ISPProxiesPage() {
  return (
    <ProxyProductPage
      title="ISP Proxies"
      productLabel="ISP"
      ordersTitle="ISP orders"
      icon={RiFlashlightLine}
      accent="rose"
      nextPayment="2026-05-18"
      willBeAdded="5 proxies"
      price="$12.00"
      docsHref="https://docs.iproyal.com/proxies/static-residential"
      guideHref="https://iproyal.com/blog/isp-proxies-quick-start-guide"
    />
  );
}
