import type { Client, Invoice, InvoiceLineItem } from "./types";

export type InvoiceDocumentLanguage = "en" | "ro";

type Labels = {
  amount: string;
  billFrom: string;
  billTo: string;
  customerSignature: string;
  date: string;
  description: string;
  discount: string;
  due: string;
  issued: string;
  lineItems: string;
  name: string;
  notes: string;
  period: string;
  physicalSignatureNote: string;
  quantity: string;
  signature: string;
  signatures: string;
  status: string;
  subject: string;
  subtotal: string;
  supplierSignature: string;
  tax: string;
  title: string;
  total: string;
  unitPrice: string;
};

const LABELS: Record<InvoiceDocumentLanguage, Labels> = {
  en: {
    amount: "Amount",
    billFrom: "Bill from",
    billTo: "Bill to",
    customerSignature: "Customer signature",
    date: "Date",
    description: "Description",
    discount: "Discount",
    due: "Due",
    issued: "Issued",
    lineItems: "Line items",
    name: "Name",
    notes: "Notes",
    period: "Period",
    physicalSignatureNote:
      "Prepared for physical signature by both parties.",
    quantity: "Qty",
    signature: "Signature",
    signatures: "Signatures",
    status: "Status",
    subject: "Subject",
    subtotal: "Subtotal",
    supplierSignature: "Supplier signature",
    tax: "VAT",
    title: "Tax invoice",
    total: "Total due",
    unitPrice: "Unit price",
  },
  ro: {
    amount: "Valoare",
    billFrom: "Furnizor",
    billTo: "Beneficiar",
    customerSignature: "Semnătura beneficiarului",
    date: "Data",
    description: "Descriere",
    discount: "Reducere",
    due: "Scadență",
    issued: "Data emiterii",
    lineItems: "Articole facturate",
    name: "Nume",
    notes: "Note",
    period: "Perioadă",
    physicalSignatureNote:
      "Document pregătit pentru semnare fizică de către ambele părți.",
    quantity: "Cant.",
    signature: "Semnătură",
    signatures: "Semnături",
    status: "Status",
    subject: "Subiect",
    subtotal: "Subtotal",
    supplierSignature: "Semnătura furnizorului",
    tax: "TVA",
    title: "Factură fiscală",
    total: "Total de plată",
    unitPrice: "Preț unitar",
  },
};

function xml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmtDate(iso: string | undefined, language: InvoiceDocumentLanguage) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function fmtMoney(
  amount: number,
  currency: string,
  language: InvoiceDocumentLanguage,
) {
  try {
    return new Intl.NumberFormat(language === "ro" ? "ro-RO" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function fmtNumber(n: number, language: InvoiceDocumentLanguage) {
  return new Intl.NumberFormat(language === "ro" ? "ro-RO" : "en-US", {
    maximumFractionDigits: 2,
  }).format(n);
}

function textRuns(text: string): string {
  const lines = text.split(/\r?\n/);
  return lines
    .map((line, i) => `${i > 0 ? "<w:br/>" : ""}<w:t>${xml(line)}</w:t>`)
    .join("");
}

function paragraph(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string; align?: string } = {},
) {
  const props = [
    opts.align ? `<w:jc w:val="${opts.align}"/>` : "",
  ].join("");
  const runProps = [
    opts.bold ? "<w:b/>" : "",
    opts.size ? `<w:sz w:val="${opts.size}"/>` : "",
    opts.color ? `<w:color w:val="${opts.color}"/>` : "",
  ].join("");
  return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}<w:r>${
    runProps ? `<w:rPr>${runProps}</w:rPr>` : ""
  }${textRuns(text)}</w:r></w:p>`;
}

function spacer() {
  return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
}

function cell(
  content: string,
  width: number,
  opts: { shade?: string; align?: string; bold?: boolean } = {},
) {
  const shade = opts.shade ? `<w:shd w:fill="${opts.shade}"/>` : "";
  const body = content.startsWith("<w:p")
    ? content
    : paragraph(content, { align: opts.align, bold: opts.bold });
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shade}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>${body}</w:tc>`;
}

function row(cells: string[]) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function table(widths: number[], rows: string[]) {
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce(
    (s, w) => s + w,
    0,
  )}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9D9D9"/><w:left w:val="single" w:sz="4" w:color="D9D9D9"/><w:bottom w:val="single" w:sz="4" w:color="D9D9D9"/><w:right w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders></w:tblPr><w:tblGrid>${widths
    .map((w) => `<w:gridCol w:w="${w}"/>`)
    .join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
}

function partyBlock(title: string, name: string, address: string, email: string) {
  const lines = [name, address, email].filter(Boolean).join("\n");
  return `${paragraph(title, { bold: true, color: "555555" })}${paragraph(lines || "-")}`;
}

function itemRows(
  items: InvoiceLineItem[],
  labels: Labels,
  currency: string,
  language: InvoiceDocumentLanguage,
) {
  const widths = [500, 4600, 900, 1500, 1500];
  const rows = [
    row([
      cell("#", widths[0], { shade: "F3F4F6", bold: true, align: "center" }),
      cell(labels.description, widths[1], { shade: "F3F4F6", bold: true }),
      cell(labels.quantity, widths[2], { shade: "F3F4F6", bold: true, align: "right" }),
      cell(labels.unitPrice, widths[3], { shade: "F3F4F6", bold: true, align: "right" }),
      cell(labels.amount, widths[4], { shade: "F3F4F6", bold: true, align: "right" }),
    ]),
  ];
  items.forEach((item, i) => {
    const desc = item.skillName
      ? `${item.description} (${item.skillName})`
      : item.description;
    rows.push(
      row([
        cell(String(i + 1), widths[0], { align: "center" }),
        cell(desc, widths[1]),
        cell(fmtNumber(item.quantity, language), widths[2], { align: "right" }),
        cell(fmtMoney(item.unitPrice, currency, language), widths[3], {
          align: "right",
        }),
        cell(fmtMoney(item.amount, currency, language), widths[4], {
          align: "right",
        }),
      ]),
    );
  });
  return table(widths, rows);
}

function totalsRows(
  invoice: Invoice,
  labels: Labels,
  currency: string,
  language: InvoiceDocumentLanguage,
) {
  const widths = [6500, 2500];
  const rows = [
    row([
      cell(labels.subtotal, widths[0], { align: "right" }),
      cell(fmtMoney(invoice.subtotalUsd, currency, language), widths[1], {
        align: "right",
      }),
    ]),
  ];
  if (invoice.discountAmount > 0) {
    rows.push(
      row([
        cell(labels.discount, widths[0], { align: "right" }),
        cell(`-${fmtMoney(invoice.discountAmount, currency, language)}`, widths[1], {
          align: "right",
        }),
      ]),
    );
  }
  if (invoice.taxPct > 0) {
    rows.push(
      row([
        cell(`${labels.tax} (${fmtNumber(invoice.taxPct, language)}%)`, widths[0], {
          align: "right",
        }),
        cell(fmtMoney(invoice.taxUsd, currency, language), widths[1], {
          align: "right",
        }),
      ]),
    );
  }
  rows.push(
    row([
      cell(labels.total, widths[0], { shade: "F3F4F6", bold: true, align: "right" }),
      cell(fmtMoney(invoice.totalUsd, currency, language), widths[1], {
        shade: "F3F4F6",
        bold: true,
        align: "right",
      }),
    ]),
  );
  return table(widths, rows);
}

function signatureTable(labels: Labels) {
  const widths = [4400, 4400];
  const left = `${paragraph(labels.supplierSignature, { bold: true })}${paragraph(
    `${labels.name}: ______________________________\n${labels.signature}: ___________________________\n${labels.date}: ______________________________`,
  )}`;
  const right = `${paragraph(labels.customerSignature, { bold: true })}${paragraph(
    `${labels.name}: ______________________________\n${labels.signature}: ___________________________\n${labels.date}: ______________________________`,
  )}`;
  return table(widths, [row([cell(left, widths[0]), cell(right, widths[1])])]);
}

function documentXml(
  invoice: Invoice,
  client: Client | null,
  currency: string,
  language: InvoiceDocumentLanguage,
) {
  const labels = LABELS[language];
  const billTo = invoice.billToName || client?.name || "Client";
  const billToAddr = invoice.billToAddress || client?.address || "";
  const billToEmail = invoice.billToEmail || client?.email || "";
  const billFrom = invoice.billFromName || "";
  const billFromAddr = invoice.billFromAddress || "";
  const billFromEmail = invoice.billFromEmail || "";
  const meta = [
    `${labels.status}: ${invoice.status}`,
    `${labels.period}: ${fmtDate(invoice.periodStart, language)} - ${fmtDate(
      invoice.periodEnd,
      language,
    )}`,
    invoice.issuedAt ? `${labels.issued}: ${fmtDate(invoice.issuedAt, language)}` : "",
    invoice.dueAt ? `${labels.due}: ${fmtDate(invoice.dueAt, language)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const partyWidths = [4400, 4400];
  const body = [
    paragraph(`${labels.title} ${invoice.number}`, {
      bold: true,
      size: 36,
      color: "111111",
    }),
    paragraph(labels.physicalSignatureNote, { color: "555555" }),
    invoice.subject
      ? paragraph(`${labels.subject}: ${invoice.subject}`, { bold: true })
      : "",
    paragraph(meta),
    spacer(),
    table(partyWidths, [
      row([
        cell(partyBlock(labels.billFrom, billFrom, billFromAddr, billFromEmail), partyWidths[0]),
        cell(partyBlock(labels.billTo, billTo, billToAddr, billToEmail), partyWidths[1]),
      ]),
    ]),
    paragraph(labels.lineItems, { bold: true, size: 24, color: "111111" }),
    itemRows(invoice.lineItems, labels, currency, language),
    spacer(),
    totalsRows(invoice, labels, currency, language),
    invoice.notes
      ? `${spacer()}${paragraph(labels.notes, {
          bold: true,
          size: 24,
        })}${paragraph(invoice.notes)}`
      : "",
    spacer(),
    paragraph(labels.signatures, { bold: true, size: 24, color: "111111" }),
    signatureTable(labels),
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="21"/></w:rPr>
  </w:style>
</w:styles>`;

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer) {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = Math.max(1, date.getDate());
  const dosDate =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | day;
  return { time, date: dosDate };
}

function zip(files: Array<{ name: string; data: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const dt = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.data, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dt.time, 10);
    local.writeUInt16LE(dt.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dt.time, 12);
    central.writeUInt16LE(dt.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

export function renderInvoiceDocx(
  invoice: Invoice,
  client: Client | null,
  currency = "USD",
  language: InvoiceDocumentLanguage = "en",
): Buffer {
  const lang = language === "ro" ? "ro" : "en";
  return zip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES },
    { name: "_rels/.rels", data: RELS },
    { name: "word/document.xml", data: documentXml(invoice, client, currency, lang) },
    { name: "word/styles.xml", data: STYLES },
  ]);
}
