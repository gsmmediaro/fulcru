"use client";

import * as React from "react";
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SAMPLES: Record<string, string> = {
  curl: '$ curl -v -x http://8eS89cE1EzCE70dy:mstoin2005_country-us_session-7gBmgPRg_lifetime-30m@geo.iproyal.com:12321 -L https://ipv4.icanhazip.com',
  php: `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://ipv4.icanhazip.com');
curl_setopt($ch, CURLOPT_PROXY, 'http://geo.iproyal.com:12321');
curl_setopt($ch, CURLOPT_PROXYUSERPWD, '8eS89cE1EzCE70dy:PASSWORD');
$res = curl_exec($ch);`,
  python: `import requests
proxies = {"http": "http://USER:PASS@geo.iproyal.com:12321",
           "https": "http://USER:PASS@geo.iproyal.com:12321"}
print(requests.get("https://ipv4.icanhazip.com", proxies=proxies).text)`,
  node: `import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
const agent = new HttpsProxyAgent("http://USER:PASS@geo.iproyal.com:12321");
const r = await fetch("https://ipv4.icanhazip.com", { agent });
console.log(await r.text());`,
  go: `proxyURL, _ := url.Parse("http://USER:PASS@geo.iproyal.com:12321")
client := &http.Client{Transport: &http.Transport{Proxy: http.ProxyURL(proxyURL)}}
resp, _ := client.Get("https://ipv4.icanhazip.com")`,
  java: `Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress("geo.iproyal.com", 12321));
Authenticator.setDefault(new Authenticator() {
  protected PasswordAuthentication getPasswordAuthentication() {
    return new PasswordAuthentication("USER", "PASS".toCharArray());
  }
});`,
  csharp: `var proxy = new WebProxy("geo.iproyal.com", 12321) {
  Credentials = new NetworkCredential("USER", "PASS")
};
var handler = new HttpClientHandler { Proxy = proxy };
var client = new HttpClient(handler);`,
};

const TABS: { id: string; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "php", label: "PHP" },
  { id: "python", label: "Python" },
  { id: "node", label: "Node.js" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
];

export function ApiExamplesCard() {
  const [protocol, setProtocol] = React.useState("http|https");
  const [active, setActive] = React.useState("curl");
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLES[active]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <section
      className={cn(
        "rounded-[12px] bg-[var(--color-bg-surface)] p-[16px] sm:p-[20px] lg:p-[24px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
      )}
    >
      <header className="mb-[16px]">
        <h2 className="tp-overline text-[var(--color-brand-400)]">
          API Integration Examples
        </h2>
      </header>

      <label className="mb-[16px] flex max-w-[280px] flex-col gap-[8px]">
        <span className="text-[13px] font-semibold text-[var(--color-text-strong)]">
          Protocol
        </span>
        <Select value={protocol} onValueChange={setProtocol}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="http|https">http|https</SelectItem>
            <SelectItem value="socks5">socks5</SelectItem>
          </SelectContent>
        </Select>
      </label>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="-mx-[16px] overflow-x-auto px-[16px] sm:mx-0 sm:px-0">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id}>
            <div
              className={cn(
                "relative mt-[16px] rounded-[10px]",
                "bg-[color-mix(in_oklab,white_2.5%,var(--color-bg-surface))]",
                "ring-1 ring-[var(--color-stroke-soft)]",
              )}
            >
              <pre
                className={cn(
                  "scrollbar-thin overflow-x-auto px-[16px] py-[14px] pr-[48px]",
                  "text-[13px] leading-[20px] text-[var(--color-text-strong)]",
                  "whitespace-pre-wrap break-all",
                )}
              >
                <code>{SAMPLES[t.id]}</code>
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy code"}
                className={cn(
                  "absolute right-[10px] top-[10px] flex size-[32px] items-center justify-center rounded-[6px]",
                  "text-[var(--color-text-soft)] hover:bg-white/5 hover:text-[var(--color-text-strong)]",
                  "transition-colors",
                )}
              >
                {copied ? (
                  <RiCheckLine
                    size={16}
                    className="text-[var(--color-brand-400)]"
                  />
                ) : (
                  <RiFileCopyLine size={16} />
                )}
              </button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
