import type { Invoice, Client } from "./types";

function fmtMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderInvoiceMarkdown(
  invoice: Invoice,
  client: Client | null,
  currency = "USD",
): string {
  const billTo = invoice.billToName || client?.name || "Client";
  const billToEmail = invoice.billToEmail || client?.email || "";
  const billToAddr = invoice.billToAddress || client?.address || "";
  const billFrom = invoice.billFromName || "";
  const billFromAddr = invoice.billFromAddress || "";
  const billFromEmail = invoice.billFromEmail || "";

  const lines: string[] = [];
  lines.push(`# Invoice ${invoice.number}`);
  lines.push("");
  lines.push(`**Status:** ${invoice.status}`);
  if (invoice.subject) lines.push(`**Subject:** ${invoice.subject}`);
  lines.push(`**Period:** ${fmtDate(invoice.periodStart)} to ${fmtDate(invoice.periodEnd)}`);
  if (invoice.issuedAt) lines.push(`**Issued:** ${fmtDate(invoice.issuedAt)}`);
  if (invoice.dueAt) lines.push(`**Due:** ${fmtDate(invoice.dueAt)}`);
  if (invoice.paidAt) lines.push(`**Paid:** ${fmtDate(invoice.paidAt)}`);
  lines.push("");

  lines.push("## Bill From");
  if (billFrom) lines.push(billFrom);
  if (billFromAddr) lines.push(billFromAddr);
  if (billFromEmail) lines.push(billFromEmail);
  lines.push("");

  lines.push("## Bill To");
  lines.push(billTo);
  if (billToAddr) lines.push(billToAddr);
  if (billToEmail) lines.push(billToEmail);
  if (invoice.billToCcEmails?.length) {
    lines.push(`CC: ${invoice.billToCcEmails.join(", ")}`);
  }
  lines.push("");

  lines.push("## Line items");
  lines.push("");
  lines.push("| # | Description | Qty | Unit price | Amount |");
  lines.push("|---|---|---:|---:|---:|");
  invoice.lineItems.forEach((li, i) => {
    const desc = li.skillName ? `${li.description} (${li.skillName})` : li.description;
    lines.push(
      `| ${i + 1} | ${desc.replace(/\|/g, "\\|")} | ${li.quantity} | ${fmtMoney(li.unitPrice, currency)} | ${fmtMoney(li.amount, currency)} |`,
    );
  });
  lines.push("");

  lines.push(`**Subtotal:** ${fmtMoney(invoice.subtotalUsd, currency)}`);
  if (invoice.discountAmount > 0) {
    lines.push(`**Discount:** -${fmtMoney(invoice.discountAmount, currency)}`);
  }
  if (invoice.taxPct > 0) {
    lines.push(`**Tax (${invoice.taxPct}%):** ${fmtMoney(invoice.taxUsd, currency)}`);
  }
  lines.push(`**Total:** ${fmtMoney(invoice.totalUsd, currency)}`);

  if (invoice.notes) {
    lines.push("");
    lines.push("## Notes");
    lines.push(invoice.notes);
  }

  return lines.join("\n") + "\n";
}

export function renderInvoiceHtml(
  invoice: Invoice,
  client: Client | null,
  currency = "USD",
): string {
  const billTo = invoice.billToName || client?.name || "Client";
  const billToEmail = invoice.billToEmail || client?.email || "";
  const billToAddr = invoice.billToAddress || client?.address || "";
  const billFrom = invoice.billFromName || "";
  const billFromAddr = invoice.billFromAddress || "";
  const billFromEmail = invoice.billFromEmail || "";

  const itemRows = invoice.lineItems
    .map((li, i) => {
      const desc = li.skillName
        ? `${escapeHtml(li.description)} <span class="muted">(${escapeHtml(li.skillName)})</span>`
        : escapeHtml(li.description);
      return `      <tr>
        <td class="num">${i + 1}</td>
        <td>${desc}</td>
        <td class="num">${li.quantity}</td>
        <td class="num">${escapeHtml(fmtMoney(li.unitPrice, currency))}</td>
        <td class="num">${escapeHtml(fmtMoney(li.amount, currency))}</td>
      </tr>`;
    })
    .join("\n");

  const subjectLine = invoice.subject
    ? `<div class="meta"><strong>Subject:</strong> ${escapeHtml(invoice.subject)}</div>`
    : "";
  const issuedLine = invoice.issuedAt
    ? `<div class="meta"><strong>Issued:</strong> ${fmtDate(invoice.issuedAt)}</div>`
    : "";
  const dueLine = invoice.dueAt
    ? `<div class="meta"><strong>Due:</strong> ${fmtDate(invoice.dueAt)}</div>`
    : "";
  const ccLine = invoice.billToCcEmails?.length
    ? `<div class="muted">CC: ${invoice.billToCcEmails.map((e) => escapeHtml(e)).join(", ")}</div>`
    : "";
  const discountLine =
    invoice.discountAmount > 0
      ? `<tr><td>Discount</td><td class="num">-${escapeHtml(fmtMoney(invoice.discountAmount, currency))}</td></tr>`
      : "";
  const taxLine =
    invoice.taxPct > 0
      ? `<tr><td>Tax (${invoice.taxPct}%)</td><td class="num">${escapeHtml(fmtMoney(invoice.taxUsd, currency))}</td></tr>`
      : "";
  const notesBlock = invoice.notes
    ? `<section class="notes"><h2>Notes</h2><p>${escapeHtml(invoice.notes).replace(/\n/g, "<br/>")}</p></section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.number)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; margin: 40px; color: #111; line-height: 1.5; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 28px; margin: 0 0 4px 0; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin: 24px 0 8px 0; }
    .meta { font-size: 13px; color: #333; }
    .muted { color: #666; font-size: 12px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
    .parties .block { font-size: 13px; }
    .parties .block strong { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    table.items th, table.items td { padding: 10px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
    table.items th { text-align: left; background: #f6f6f6; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .num { text-align: right; white-space: nowrap; }
    .totals { width: 320px; margin-left: auto; margin-top: 16px; font-size: 13px; }
    .totals td { padding: 6px 8px; }
    .totals tr.grand td { border-top: 2px solid #111; font-weight: 700; font-size: 15px; padding-top: 10px; }
    .notes { margin-top: 32px; font-size: 13px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: #eee; color: #333; }
    .status.draft { background: #fde68a; color: #78350f; }
    .status.sent { background: #bfdbfe; color: #1e3a8a; }
    .status.paid { background: #bbf7d0; color: #14532d; }
    .status.overdue { background: #fecaca; color: #7f1d1d; }
    .status.void { background: #e5e7eb; color: #4b5563; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Invoice ${escapeHtml(invoice.number)}</h1>
      <span class="status ${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span>
      ${subjectLine}
    </div>
    <div>
      <div class="meta"><strong>Period:</strong> ${fmtDate(invoice.periodStart)} - ${fmtDate(invoice.periodEnd)}</div>
      ${issuedLine}
      ${dueLine}
    </div>
  </header>

  <section class="parties">
    <div class="block">
      <strong>Bill from</strong>
      ${billFrom ? `<div>${escapeHtml(billFrom)}</div>` : ""}
      ${billFromAddr ? `<div>${escapeHtml(billFromAddr).replace(/\n/g, "<br/>")}</div>` : ""}
      ${billFromEmail ? `<div>${escapeHtml(billFromEmail)}</div>` : ""}
    </div>
    <div class="block">
      <strong>Bill to</strong>
      <div>${escapeHtml(billTo)}</div>
      ${billToAddr ? `<div>${escapeHtml(billToAddr).replace(/\n/g, "<br/>")}</div>` : ""}
      ${billToEmail ? `<div>${escapeHtml(billToEmail)}</div>` : ""}
      ${ccLine}
    </div>
  </section>

  <section>
    <h2>Line items</h2>
    <table class="items">
      <thead>
        <tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>
${itemRows}
      </tbody>
    </table>

    <table class="totals">
      <tr><td>Subtotal</td><td class="num">${escapeHtml(fmtMoney(invoice.subtotalUsd, currency))}</td></tr>
      ${discountLine}
      ${taxLine}
      <tr class="grand"><td>Total</td><td class="num">${escapeHtml(fmtMoney(invoice.totalUsd, currency))}</td></tr>
    </table>
  </section>

  ${notesBlock}
</body>
</html>
`;
}
