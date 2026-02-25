import { XMLDocument } from "../parser/index.js";
import { valid_simplified_invoice_xml_sample } from "../samples/index.js";

describe("XMLDocument.set() — strict mode opt-in", () => {
  describe("default behavior (no options) — backward compatible", () => {
    it("returns false when path does not exist (no options)", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      const result = doc.set("Invoice/NonExistent/Path/Field", true, "value");
      expect(result).toBe(false);
    });

    it("returns false when path does not exist (options.strict=false explicit)", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      const result = doc.set("Invoice/NonExistent/Path/Field", true, "value", {
        strict: false,
      });
      expect(result).toBe(false);
    });

    it("does NOT throw when path does not exist (default mode)", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      expect(() =>
        doc.set("Invoice/NonExistent/Path/Field", true, "value")
      ).not.toThrow();
    });

    it("returns true when path exists and set succeeds (default mode)", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      const result = doc.set("Invoice/cbc:ID", true, "NEW-ID");
      expect(result).toBe(true);
    });
  });

  describe("strict mode (options.strict=true) — throws on failure", () => {
    it("throws Error when path does not exist (strict=true)", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      expect(() =>
        doc.set("Invoice/NonExistent/Path/Field", true, "value", {
          strict: true,
        })
      ).toThrow(Error);
    });

    it("throws an error with a descriptive message (strict=true)", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      expect(() =>
        doc.set("Invoice/NonExistent/Path/Field", true, "value", {
          strict: true,
        })
      ).toThrow("Invoice/NonExistent/Path/Field");
    });

    it("returns true when path exists and set succeeds (strict=true)", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      const result = doc.set("Invoice/cbc:ID", true, "NEW-ID-STRICT", {
        strict: true,
      });
      expect(result).toBe(true);
    });

    it("value is correctly set when using strict=true on valid path", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      doc.set("Invoice/cbc:ID", true, "STRICT-VALUE", { strict: true });
      const value = doc.get("Invoice/cbc:ID")?.[0];
      expect(String(value)).toBe("STRICT-VALUE");
    });

    it("throws Error (not string or other value) in strict mode", () => {
      const doc = new XMLDocument(valid_simplified_invoice_xml_sample);
      let thrown: unknown;
      try {
        doc.set("Invoice/NonExistent/Path", true, "val", { strict: true });
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(Error);
    });
  });
});
