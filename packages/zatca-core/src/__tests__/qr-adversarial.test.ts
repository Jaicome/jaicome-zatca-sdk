import { describe, expect, it } from "vitest";
import { buildInvoice, generatePhaseOneQR } from "../api";
import { ZATCAInvoiceTypes } from "../ZATCASimplifiedTaxInvoice";
import type { ZATCAInvoiceProps } from "../ZATCASimplifiedTaxInvoice";

// TLV binary format: [tag (1 byte)] [length (1 byte)] [value (length bytes)]
function parseTLVTags(
  bytes: Buffer,
): Array<{ tag: number; length: number; value: Buffer }> {
  const tags: Array<{ tag: number; length: number; value: Buffer }> = [];
  let offset = 0;
  while (offset + 2 <= bytes.length) {
    const tag = bytes[offset];
    const length = bytes[offset + 1];
    const value = bytes.slice(offset + 2, offset + 2 + length);
    tags.push({ tag, length, value });
    offset += 2 + length;
  }
  return tags;
}

function makeQRProps(vatName?: string): ZATCAInvoiceProps {
  return {
    egs_info: {
      uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
      custom_id: "QR-TEST",
      model: "IOS",
      CRN_number: "7032256278",
      VAT_name: vatName ?? "QR Test Company",
      VAT_number: "311497191800003",
      branch_name: "Main",
      branch_industry: "Software",
    },
    invoice_counter_number: 1,
    invoice_serial_number: "QR-001",
    issue_date: "2024-01-15",
    issue_time: "10:00:00",
    previous_invoice_hash:
      "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
    line_items: [
      {
        id: "1",
        name: "QR Test Product",
        quantity: 1,
        tax_exclusive_price: 100,
        VAT_percent: 0.15,
      },
    ],
    invoice_type: ZATCAInvoiceTypes.INVOICE,
    invoice_code: "0200000",
  };
}

describe("generatePhaseOneQR — output format", () => {
  it("returns a non-empty base64 string", () => {
    const invoice = buildInvoice(makeQRProps());
    const qr = generatePhaseOneQR(invoice);

    expect(typeof qr).toBe("string");
    expect(qr.length).toBeGreaterThan(0);
    expect(qr).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("base64 decodes to bytes starting with tag byte 0x01 (seller name tag)", () => {
    const invoice = buildInvoice(makeQRProps());
    const qr = generatePhaseOneQR(invoice);

    const bytes = Buffer.from(qr, "base64");
    expect(bytes[0]).toBe(0x01);
  });

  it("decoded TLV has exactly 5 tags", () => {
    const invoice = buildInvoice(makeQRProps());
    const qr = generatePhaseOneQR(invoice);

    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    expect(tags).toHaveLength(5);
  });
});

describe("TLV structure verification", () => {
  it("TLV tag 1 = seller name (VAT_name from egs_info)", () => {
    const sellerName = "Test Seller Co";
    const invoice = buildInvoice(makeQRProps(sellerName));
    const qr = generatePhaseOneQR(invoice);

    const bytes = Buffer.from(qr, "base64");
    expect(bytes[0]).toBe(1);

    const tags = parseTLVTags(bytes);
    expect(tags[0].tag).toBe(1);
    const decoded = new TextDecoder().decode(tags[0].value);
    expect(decoded).toBe(sellerName);
  });

  it("TLV tag 2 = VAT number matching egs_info.VAT_number", () => {
    const invoice = buildInvoice(makeQRProps());
    const qr = generatePhaseOneQR(invoice);

    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    expect(tags[1].tag).toBe(2);
    const decoded = new TextDecoder().decode(tags[1].value);
    expect(decoded).toBe("311497191800003");
  });

  it("TLV tag 3 = datetime in ISO format YYYY-MM-DDTHH:mm:ss", () => {
    const invoice = buildInvoice(makeQRProps());
    const qr = generatePhaseOneQR(invoice);

    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    expect(tags[2].tag).toBe(3);
    const decoded = new TextDecoder().decode(tags[2].value);
    expect(decoded).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(decoded).toBe("2024-01-15T10:00:00");
  });

  it("TLV tag 4 = tax-inclusive total (~115 for price=100 + 15% VAT)", () => {
    const invoice = buildInvoice(makeQRProps());
    const qr = generatePhaseOneQR(invoice);

    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    expect(tags[3].tag).toBe(4);
    const decoded = new TextDecoder().decode(tags[3].value);
    expect(parseFloat(decoded)).toBeCloseTo(115, 1);
  });

  it("TLV tag 5 has tag byte = 5 (VAT total tag)", () => {
    const invoice = buildInvoice(makeQRProps());
    const qr = generatePhaseOneQR(invoice);
    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    expect(tags[4].tag).toBe(5);
    const decoded = new TextDecoder().decode(tags[4].value);
    expect(typeof decoded).toBe("string");
  });
});

describe("TLV byte limit — 255 bytes per field", () => {
  it("255-byte seller name (ASCII) at boundary — should succeed", () => {
    // ASCII chars are 1 byte each → 255 'A' = exactly 255 bytes
    const longName = "A".repeat(255);
    const props = makeQRProps(longName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).not.toThrow();
  });

  it("256-byte seller name (ASCII) — should throw TLV exceeds 255 bytes error", () => {
    // 256 ASCII chars = 256 bytes → 1 byte over the TLV limit
    const tooLongName = "A".repeat(256);
    const props = makeQRProps(tooLongName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).toThrow(/exceeds 255 bytes/i);
  });

  it("short Arabic seller name — multi-byte UTF-8 stays within limit and decodes correctly", () => {
    // Arabic chars are 2 bytes in UTF-8; ~21 chars ≈ 42 bytes — well under 255
    const arabicName = "شركة الاختبار للتقنية";
    const props = makeQRProps(arabicName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).not.toThrow();

    const qr = generatePhaseOneQR(invoice);
    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    const decoded = new TextDecoder().decode(tags[0].value);
    expect(decoded).toBe(arabicName);
  });

  it("120 Arabic chars (120 × 2 = 240 bytes) approaching limit — should succeed", () => {
    // "ش" (U+0634) encodes to 2 bytes in UTF-8
    const longArabicName = "ش".repeat(120);
    const props = makeQRProps(longArabicName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).not.toThrow();
  });

  it("130 Arabic chars (130 × 2 = 260 bytes) — should throw TLV exceeds 255 bytes error", () => {
    // 130 × 2 = 260 bytes → over the 255-byte TLV limit
    const tooLongArabicName = "ش".repeat(130);
    const props = makeQRProps(tooLongArabicName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).toThrow(/exceeds 255 bytes/i);
  });
});

describe("QR is deterministic", () => {
  it("same invoice props produce identical QR on two independent calls", () => {
    const props = makeQRProps();
    const invoice1 = buildInvoice(props);
    const invoice2 = buildInvoice(props);

    const qr1 = generatePhaseOneQR(invoice1);
    const qr2 = generatePhaseOneQR(invoice2);
    expect(qr1).toBe(qr2);
  });

  it("different tax_exclusive_price produces a different QR string", () => {
    const props1 = makeQRProps();
    const props2: ZATCAInvoiceProps = {
      ...makeQRProps(),
      line_items: [
        {
          id: "1",
          name: "QR Test Product",
          quantity: 1,
          tax_exclusive_price: 200,
          VAT_percent: 0.15,
        },
      ],
    };

    const qr1 = generatePhaseOneQR(buildInvoice(props1));
    const qr2 = generatePhaseOneQR(buildInvoice(props2));
    expect(qr1).not.toBe(qr2);
  });
});

describe("Unicode edge cases", () => {
  it("emoji in seller name — UTF-8 multi-byte sequence encodes and decodes correctly", () => {
    // 🚀 (U+1F680) is 4 bytes in UTF-8
    const emojiName = "Company 🚀";
    const props = makeQRProps(emojiName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).not.toThrow();

    const qr = generatePhaseOneQR(invoice);
    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    const decoded = new TextDecoder().decode(tags[0].value);
    expect(decoded).toBe(emojiName);
  });

  it("mixed ASCII and Arabic seller name — correct UTF-8 round-trip", () => {
    const mixedName = "شركة ABC للتقنية";
    const props = makeQRProps(mixedName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).not.toThrow();

    const qr = generatePhaseOneQR(invoice);
    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    const decoded = new TextDecoder().decode(tags[0].value);
    expect(decoded).toBe(mixedName);
  });

  it("seller name with XML-special characters (ampersand, angle brackets) — encodes correctly", () => {
    // These chars should be stored in XML-escaped form in the XML but the
    // TLV value should carry the decoded seller name as-is
    const specialName = "Smith & Co.";
    const props = makeQRProps(specialName);
    const invoice = buildInvoice(props);
    expect(() => generatePhaseOneQR(invoice)).not.toThrow();

    const qr = generatePhaseOneQR(invoice);
    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    expect(tags[0].value.length).toBeGreaterThan(0);
    const decoded = new TextDecoder().decode(tags[0].value);
    expect(decoded).toContain("Smith");
  });

  it("seller name with numbers and hyphens — encodes as plain ASCII bytes", () => {
    const numericName = "Company-123-XYZ";
    const props = makeQRProps(numericName);
    const invoice = buildInvoice(props);
    const qr = generatePhaseOneQR(invoice);

    const bytes = Buffer.from(qr, "base64");
    const tags = parseTLVTags(bytes);
    const decoded = new TextDecoder().decode(tags[0].value);
    expect(decoded).toBe(numericName);
    // Each ASCII character is exactly 1 byte
    expect(tags[0].length).toBe(numericName.length);
  });
});
