import { buildInvoice } from "../api.js";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice.js";
import { describe, expect, it } from "vitest";

const GENESIS_PREVIOUS_INVOICE_HASH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

const makeBaseProps = (): ZATCAInvoiceProps => ({
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    location: {
      building: "0000",
      city: "Khobar",
      citySubdivision: "West",
      plotIdentification: "0000",
      postalZone: "31952",
      street: "King Fahd st",
    },
    model: "IOS",
    name: "EGS1-GOLDEN-SNAPSHOT",
    vatName: "Jaicome Information Technology",
    vatNumber: "311497191800003",
  },
  invoiceCode: "0200000",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "EGS1-GOLDEN-SNAPSHOT-001",
  invoiceType: "INVOICE",
  issueDate: new Date("2024-01-15T10:00:00Z"),
  lineItems: [
    {
      id: "1",
      name: "Standard Product",
      quantity: 1,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  paymentMethod: "CASH",
  previousInvoiceHash: GENESIS_PREVIOUS_INVOICE_HASH,
});

const buildXml = (props: ZATCAInvoiceProps): string =>
  buildInvoice(props).getXML().toString({});

describe("golden XML snapshots for invoice variants", () => {
  it("simplified tax invoice (388/0200000)", () => {
    const xml = buildXml(makeBaseProps());

    expect(xml).toMatchSnapshot();
  });

  it("credit note (381/0200000)", () => {
    const xml = buildXml({
      ...makeBaseProps(),
      cancelation: {
        canceledSerialInvoiceNumber: "EGS1-GOLDEN-SNAPSHOT-000",
        paymentMethod: "CASH",
        reason: "Credit correction",
      },
      invoiceSerialNumber: "EGS1-GOLDEN-SNAPSHOT-002",
      invoiceType: "CREDIT_NOTE",
    });

    expect(xml).toMatchSnapshot();
  });

  it("debit note (383/0200000)", () => {
    const xml = buildXml({
      ...makeBaseProps(),
      cancelation: {
        canceledSerialInvoiceNumber: "EGS1-GOLDEN-SNAPSHOT-001",
        paymentMethod: "CREDIT",
        reason: "Debit correction",
      },
      invoiceSerialNumber: "EGS1-GOLDEN-SNAPSHOT-003",
      invoiceType: "DEBIT_NOTE",
    });

    expect(xml).toMatchSnapshot();
  });

  it("zero-rated invoice", () => {
    const xml = buildXml({
      ...makeBaseProps(),
      invoiceSerialNumber: "EGS1-GOLDEN-SNAPSHOT-004",
      lineItems: [
        {
          id: "1",
          name: "Zero-Rated Product",
          quantity: 1,
          taxExclusivePrice: 125,
          vatCategory: {
            code: "Z",
            reason: "Zero-rated supply",
            reasonCode: "VATEX-SA-32",
          },
          vatPercent: 0,
        },
      ],
    });

    expect(xml).toMatchSnapshot();
  });

  it("exempt invoice", () => {
    const xml = buildXml({
      ...makeBaseProps(),
      invoiceSerialNumber: "EGS1-GOLDEN-SNAPSHOT-005",
      lineItems: [
        {
          id: "1",
          name: "Exempt Product",
          quantity: 1,
          taxExclusivePrice: 80,
          vatCategory: {
            code: "E",
            reason: "Exempt supply",
            reasonCode: "VATEX-SA-29",
          },
          vatPercent: 0,
        },
      ],
    });

    expect(xml).toMatchSnapshot();
  });

  it("multi-line-item invoice", () => {
    const xml = buildXml({
      ...makeBaseProps(),
      invoiceSerialNumber: "EGS1-GOLDEN-SNAPSHOT-006",
      lineItems: [
        {
          id: "1",
          name: "Standard 15%",
          quantity: 1,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "Reduced 5%",
          quantity: 2,
          taxExclusivePrice: 60,
          vatPercent: 0.05,
        },
        {
          id: "3",
          name: "Out of Scope",
          quantity: 1,
          taxExclusivePrice: 25,
          vatCategory: {
            code: "O",
            reason: "Out of scope",
            reasonCode: "VATEX-SA-OOS",
          },
          vatPercent: 0,
        },
      ],
    });

    expect(xml).toMatchSnapshot();
  });
});
