import { generatePhaseOneQRFromXml } from "../qr";
import { XMLDocument } from "../parser/index";

describe("generatePhaseOneQRFromXml — throws on missing required fields", () => {
  function makeValidXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Test Company</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>311497191800003</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal>
    <cbc:TaxInclusiveAmount>115.00</cbc:TaxInclusiveAmount>
  </cac:LegalMonetaryTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount>15.00</cbc:TaxAmount>
  </cac:TaxTotal>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <cbc:IssueTime>10:00:00</cbc:IssueTime>
</Invoice>`;
  }

  it("throws when seller name (RegistrationName) is missing", () => {
    const xml = makeValidXml().replace(
      /<cbc:RegistrationName>.*?<\/cbc:RegistrationName>/,
      ""
    );
    const doc = new XMLDocument(xml);

    expect(() => generatePhaseOneQRFromXml(doc)).toThrow(
      /QR generation failed: missing required field 'RegistrationName'/
    );
  });

  it("throws when VAT number (CompanyID) is missing", () => {
    const xml = makeValidXml().replace(
      /<cbc:CompanyID>.*?<\/cbc:CompanyID>/,
      ""
    );
    const doc = new XMLDocument(xml);

    expect(() => generatePhaseOneQRFromXml(doc)).toThrow(
      /QR generation failed: missing required field 'CompanyID'/
    );
  });

  it("throws when invoice total (TaxInclusiveAmount) is missing", () => {
    const xml = makeValidXml().replace(
      /<cbc:TaxInclusiveAmount>.*?<\/cbc:TaxInclusiveAmount>/,
      ""
    );
    const doc = new XMLDocument(xml);

    expect(() => generatePhaseOneQRFromXml(doc)).toThrow(
      /QR generation failed: missing required field 'TaxInclusiveAmount'/
    );
  });

  it("throws when VAT total (TaxAmount) is missing", () => {
    const xml = makeValidXml().replace(
      /<cbc:TaxAmount>.*?<\/cbc:TaxAmount>/,
      ""
    );
    const doc = new XMLDocument(xml);

    expect(() => generatePhaseOneQRFromXml(doc)).toThrow(
      /QR generation failed: missing required field 'TaxAmount'/
    );
  });

  it("throws when issue date (IssueDate) is missing", () => {
    const xml = makeValidXml().replace(
      /<cbc:IssueDate>.*?<\/cbc:IssueDate>/,
      ""
    );
    const doc = new XMLDocument(xml);

    expect(() => generatePhaseOneQRFromXml(doc)).toThrow(
      /QR generation failed: missing required field 'IssueDate'/
    );
  });

  it("throws when issue time (IssueTime) is missing", () => {
    const xml = makeValidXml().replace(
      /<cbc:IssueTime>.*?<\/cbc:IssueTime>/,
      ""
    );
    const doc = new XMLDocument(xml);

    expect(() => generatePhaseOneQRFromXml(doc)).toThrow(
      /QR generation failed: missing required field 'IssueTime'/
    );
  });

  it("does not throw when all required fields are present", () => {
    const xml = makeValidXml();
    const doc = new XMLDocument(xml);

    expect(() => generatePhaseOneQRFromXml(doc)).not.toThrow();
  });
});
