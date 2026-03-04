import { buildInvoice } from "../api";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice";

const validBase: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    model: "IOS",
    name: "EGS1",
    vatName: "Test Co",
    vatNumber: "311497191800003",
  },
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "TEST-001",
  invoiceType: "INVOICE",
  issueDate: new Date("2024-01-15T10:00:00Z"),
  lineItems: [
    {
      id: "uuid-1",
      name: "Test Product",
      quantity: 1,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

describe("Line Item IDs — sequential numbering for BT-126 compliance", () => {
  it("converts UUID line item ids to sequential numbers (1, 2, ...)", () => {
    const invoice = buildInvoice({
      ...validBase,
      lineItems: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "Product A",
          quantity: 2,
          taxExclusivePrice: 50,
          vatPercent: 0.15,
        },
        {
          id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          name: "Product B",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
      ],
    });

    const xml = invoice.getXML().toString({});

    // Should contain sequential IDs, not UUIDs
    expect(xml).toContain("<cbc:ID>1</cbc:ID>");
    expect(xml).toContain("<cbc:ID>2</cbc:ID>");

    // Should NOT contain UUID strings
    expect(xml).not.toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(xml).not.toContain("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
  });

  it("assigns sequential IDs to 3 line items in order", () => {
    const invoice = buildInvoice({
      ...validBase,
      lineItems: [
        {
          id: "item-1",
          name: "Product A",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "item-2",
          name: "Product B",
          quantity: 2,
          taxExclusivePrice: 200,
          vatPercent: 0.15,
        },
        {
          id: "item-3",
          name: "Product C",
          quantity: 3,
          taxExclusivePrice: 300,
          vatPercent: 0.15,
        },
      ],
    });

    const xml = invoice.getXML().toString({});

    // Should contain all three sequential IDs
    expect(xml).toContain("<cbc:ID>1</cbc:ID>");
    expect(xml).toContain("<cbc:ID>2</cbc:ID>");
    expect(xml).toContain("<cbc:ID>3</cbc:ID>");

    // Verify order by checking positions
    const id1Pos = xml.indexOf("<cbc:ID>1</cbc:ID>");
    const id2Pos = xml.indexOf("<cbc:ID>2</cbc:ID>");
    const id3Pos = xml.indexOf("<cbc:ID>3</cbc:ID>");

    expect(id1Pos).toBeLessThan(id2Pos);
    expect(id2Pos).toBeLessThan(id3Pos);
  });

  it("assigns ID 1 to single line item", () => {
    const invoice = buildInvoice({
      ...validBase,
      lineItems: [
        {
          id: "single-item",
          name: "Only Product",
          quantity: 5,
          taxExclusivePrice: 250,
          vatPercent: 0.15,
        },
      ],
    });

    const xml = invoice.getXML().toString({});

    // Single item should have ID 1
    expect(xml).toContain("<cbc:ID>1</cbc:ID>");

    // Should not contain ID 2
    expect(xml).not.toContain("<cbc:ID>2</cbc:ID>");
  });
});
