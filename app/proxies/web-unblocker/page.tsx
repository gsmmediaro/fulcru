import { RiShieldKeyholeLine } from "@remixicon/react";
import { ProxyProductPage } from "@/components/proxies/proxy-product-page";

export default function WebUnblockerPage() {
  return (
    <ProxyProductPage
      title="Web Unblocker"
      productLabel="Web Unblocker"
      ordersTitle="Web Unblocker orders"
      icon={RiShieldKeyholeLine}
      accent="orange"
      nextPayment="2026-05-12"
      willBeAdded="1000 requests"
      price="$0.70"
      docsHref="https://docs.iproyal.com/proxies/web-unblocker"
      guideHref="https://iproyal.com/blog/web-unblocker-quick-start-guide"
    />
  );
}
