import { RiSmartphoneLine } from "@remixicon/react";
import { ProxyProductPage } from "@/components/proxies/proxy-product-page";

export default function MobileProxiesPage() {
  return (
    <ProxyProductPage
      title="Mobile Proxies"
      productLabel="Mobile"
      ordersTitle="Mobile orders"
      icon={RiSmartphoneLine}
      accent="blue"
      nextPayment="2026-05-06"
      willBeAdded="1 day"
      price="$10.11"
      docsHref="https://docs.iproyal.com/proxies/4g-mobile"
      guideHref="https://iproyal.com/blog/mobile-proxies-quick-start-guide"
    />
  );
}
