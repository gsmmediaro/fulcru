import { RiHome4Line } from "@remixicon/react";
import { ProxyProductPage } from "@/components/proxies/proxy-product-page";

export default function ResidentialProxiesPage() {
  return (
    <ProxyProductPage
      title="Residential Proxies"
      productLabel="Residential"
      ordersTitle="Residential orders"
      icon={RiHome4Line}
      accent="teal"
      nextPayment="2026-05-11"
      willBeAdded="1 GB"
      price="$7.00"
      docsHref="https://docs.iproyal.com/proxies/royal-residential"
      guideHref="https://iproyal.com/blog/residential-proxies-quick-start-guide"
    />
  );
}
