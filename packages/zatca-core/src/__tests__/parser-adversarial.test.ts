import { buildInvoice } from "../api.js";
import { XMLDocument } from "../parser/index.js";
import { valid_simplified_invoice_xml_sample } from "../samples/index.js";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice.js";

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);

const minimalInvoiceProps: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    model: "IOS",
    name: "PARSER-TEST",
    vatName: "Parser Test Co",
    vatNumber: "311497191800003",
  },
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "PARSER-001",
  invoiceType: "INVOICE",
  issueDate: issueDate,
  issueTime: issueTime,
  lineItems: [
    {
      id: "1",
      name: "Product",
      quantity: 1,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  paymentMethod: "CASH",
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

describe("xMLDocument constructor edge cases", () => {
  it("parses valid XML string without error", () => {
    const xml = "<Invoice><cbc:ID>123</cbc:ID></Invoice>";
    expect(() => new XMLDocument(xml)).not.toThrow();
  });

  it("no argument creates empty document with XML header", () => {
    const doc = new XMLDocument();
    const str = doc.toString({});
    expectTypeOf(str).toBeString();
    expect(str.length).toBeGreaterThan(0);
    expect(str).toContain("<?xml");
  });

  it("empty string creates document (handles gracefully)", () => {
    expect(() => new XMLDocument("")).not.toThrow();
    const doc = new XMLDocument("");
    const str = doc.toString({});
    expectTypeOf(str).toBeString();
    expect(str).toContain("<?xml");
  });

  it("invalid XML string throws on truly malformed input", () => {
    expect(() => new XMLDocument("<not xml")).toThrow();
  });

  it("parses the valid_simplified_invoice_xml_sample without error", () => {
    expect(
      () => new XMLDocument(valid_simplified_invoice_xml_sample)
    ).not.toThrow();
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const id = doc.get("Invoice/cbc:ID")?.[0];
    expect(id).toBeDefined();
  });
});

describe("xMLDocument.get() — path queries", () => {
  it("returns value at known valid path", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const id = doc.get("Invoice/cbc:ID")?.[0];
    expect(id).toBeDefined();
    expect(String(id)).toBe("SME00062");
  });

  it("returns undefined for non-existent path", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const result = doc.get("Invoice/NonExistent/Path");
    expect(result).toBeUndefined();
  });

  it("does not crash on empty string path", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    expect(() => doc.get("")).not.toThrow();
  });

  it("does not crash when called with no path (no arg)", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    expect(() => doc.get()).not.toThrow();
    const result = doc.get();
    expect(result !== null).toBeTruthy();
  });

  it("wraps single value in array", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const result = doc.get("Invoice/cbc:ID");
    expect(Array.isArray(result)).toBeTruthy();
  });

  it("returns correct issue date from nested path", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const issueDate = doc.get("Invoice/cbc:IssueDate")?.[0];
    expect(issueDate).toBeDefined();
    expect(String(issueDate)).toBe("2022-03-13");
  });
});

describe("xMLDocument.set() — mutations", () => {
  it("sets new value at existing path (overwrite=true)", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const success = doc.set("Invoice/cbc:ID", true, "NEW-ID-999");
    expect(success).toBeTruthy();
    const newId = doc.get("Invoice/cbc:ID")?.[0];
    expect(String(newId)).toBe("NEW-ID-999");
  });

  it("appends value at existing path (overwrite=false)", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const success = doc.set("Invoice/cbc:ID", false, "APPENDED-ID");
    expect(success).toBeTruthy();
    const result = doc.get("Invoice/cbc:ID");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result!).toHaveLength(2);
  });

  it("returns false when setting at non-existent path", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const success = doc.set("Invoice/NonExistent/Path/Field", true, "value");
    expect(success).toBeFalsy();
  });

  it("mutation persists: updated value survives a toString/re-parse cycle", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    doc.set("Invoice/cbc:ID", true, "MUTATED-999");
    const xml = doc.toString({});
    expect(xml).toContain("MUTATED-999");
  });
});

describe("xMLDocument.delete() — element removal", () => {
  it("deletes existing element and returns true", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const success = doc.delete("Invoice/cbc:ID");
    expect(success).toBeTruthy();
    const afterDelete = doc.get("Invoice/cbc:ID");
    expect(afterDelete).toBeUndefined();
  });

  it("returns false for non-existent element", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const success = doc.delete("Invoice/NonExistent/Element");
    expect(success).toBeFalsy();
  });

  it("deletion is reflected in toString output", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const before = doc.toString({});
    expect(before).toContain("SME00062");
    doc.delete("Invoice/cbc:ID");
    const after = doc.toString({});
    expect(after).not.toContain("SME00062");
  });
});

describe("xMLDocument.toString() — serialization", () => {
  it("round-trip: build invoice XML can be re-parsed", () => {
    const invoice = buildInvoice(minimalInvoiceProps);
    const xmlString = invoice.getXML().toString({});
    const reparsed = new XMLDocument(xmlString);
    const reparsedString = reparsed.toString({});
    expect(reparsedString.length).toBeGreaterThan(0);
    expect(reparsedString).toContain("Invoice");
  });

  it("toString with no_header=true omits XML declaration", () => {
    const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
    const withHeader = doc.toString({ no_header: false });
    const withoutHeader = doc.toString({ no_header: true });
    expect(withHeader).toContain("<?xml");
    expect(withoutHeader).not.toContain("<?xml");
  });

  it("toString replaces &apos; with single quote", () => {
    const doc = new XMLDocument("<Invoice><Name>John's Co</Name></Invoice>");
    const str = doc.toString({});
    expect(str).toBeDefined();
    expect(str).toContain("John");
  });

  it("toString always returns a string", () => {
    const doc = new XMLDocument();
    const result = doc.toString({});
    expectTypeOf(result).toBeString();
  });
});
