import { createHash } from "node:crypto";

import { XMLDocument } from "@jaicome/zatca-core";
import xmldom from "xmldom";
import { XmlCanonicalizer } from "xmldsigjs";

/**
 * Removes (UBLExtensions (Signing), Signature Envelope, and QR data) Elements. Then canonicalizes the XML to c14n.
 * In Order to prep for hashing.
 * @param {XMLDocument} invoice_xml XMLDocument.
 * @returns {string} purified Invoice XML string.
 */
export const getPureInvoiceString = (invoice_xml: XMLDocument): string => {
  const invoice_copy = new XMLDocument(
    invoice_xml.toString({ no_header: false })
  );
  invoice_copy.delete("Invoice/ext:UBLExtensions");
  invoice_copy.delete("Invoice/cac:Signature");
  invoice_copy.delete("Invoice/cac:AdditionalDocumentReference", {
    "cbc:ID": "QR",
  });

  const invoice_xml_dom = new xmldom.DOMParser().parseFromString(
    invoice_copy.toString({ no_header: false })
  );

  const canonicalizer = new XmlCanonicalizer(false, false);
  const canonicalized_xml_str: string =
    canonicalizer.Canonicalize(invoice_xml_dom);

  return canonicalized_xml_str;
};

/**
 * Hashes Invoice according to ZATCA.
 * @param {XMLDocument} invoice_xml XMLDocument.
 * @returns {string} String invoice hash encoded in base64.
 */
export const getInvoiceHash = (invoice_xml: XMLDocument): string => {
  let pure_invoice_string: string = getPureInvoiceString(invoice_xml);
  // A dumb workaround for whatever reason ZATCA XML devs decided to include those trailing spaces and newlines.
  pure_invoice_string = pure_invoice_string.replace(
    "<cbc:ProfileID>",
    "\n    <cbc:ProfileID>"
  );
  pure_invoice_string = pure_invoice_string.replace(
    "<cac:AccountingSupplierParty>",
    "\n    \n    <cac:AccountingSupplierParty>"
  );

  return createHash("sha256").update(pure_invoice_string).digest("base64");
};
