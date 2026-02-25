import { createHash, createSign, X509Certificate } from "node:crypto";

import { Certificate } from "@fidm/x509";
import type {
  Signer,
  SigningInput,
  SignatureResult,
} from "@jaicome/zatca-core";
import {
  XMLDocument,
  log,
  defaultUBLExtensions,
  defaultUBLExtensionsSignedProperties,
  defaultUBLExtensionsSignedPropertiesForSigning,
} from "@jaicome/zatca-core";
import moment from "moment";

import { generateQR } from "../qr/index.js";
import { getPureInvoiceString, getInvoiceHash } from "../utils/invoice-hash.js";

export { getPureInvoiceString, getInvoiceHash };

/**
 * Hashes Certificate according to ZATCA.
 * @param certificate_string String base64 encoded certificate body.
 * @returns String certificate hash encoded in base64.
 */
export const getCertificateHash = (certificate_string: string): string => {
  const certificate_hash = Buffer.from(
    createHash("sha256").update(certificate_string).digest("hex")
  ).toString("base64");
  return certificate_hash;
};

/**
 * Creates invoice digital signature according to ZATCA.
 * @param invoice_hash String base64 encoded invoice hash.
 * @param private_key_string String base64 encoded EC prime256v1 private key body.
 * @returns String base64 encoded digital signature.
 */
export const createInvoiceDigitalSignature = (
  invoice_hash: string,
  private_key_string: string
): string => {
  const invoice_hash_bytes = Buffer.from(invoice_hash, "base64");
  const sign = createSign("sha256");
  sign.update(invoice_hash_bytes);
  const signature = Buffer.from(sign.sign(private_key_string)).toString(
    "base64"
  );
  return signature;
};

/**
 * Gets certificate hash, x509IssuerName, and X509SerialNumber and formats them according to ZATCA.
 * @param certificate_string String base64 encoded certificate body.
 * @returns {hash: string, issuer: string, serial_number: string, public_key: Buffer, signature: Buffer}.
 */
export const getCertificateInfo = (
  certificate_string: string
): {
  hash: string;
  issuer: string;
  serial_number: string;
  public_key: Buffer;
  signature: Buffer;
} => {
  const cleanedup_certificate_string: string =
    cleanUpCertificateString(certificate_string);
  const wrapped_certificate_string: string = `-----BEGIN CERTIFICATE-----\n${cleanedup_certificate_string}\n-----END CERTIFICATE-----`;

  const hash = getCertificateHash(cleanedup_certificate_string);
  const x509 = new X509Certificate(wrapped_certificate_string);

  const cert = Certificate.fromPEM(Buffer.from(wrapped_certificate_string));

  return {
    hash: hash,
    issuer: x509.issuer.split("\n").toReversed().join(", "),
    public_key: cert.publicKeyRaw,
    serial_number: BigInt(`0x${x509.serialNumber}`).toString(10),
    signature: cert.signature,
  };
};

/**
 * Removes header and footer from certificate string.
 * @param certificate_string.
 * @returns String base64 encoded certificate body.
 */
export const cleanUpCertificateString = (certificate_string: string): string =>
  certificate_string
    .replace(`-----BEGIN CERTIFICATE-----\n`, "")
    .replace("-----END CERTIFICATE-----", "")
    .trim();

/**
 * Removes header and footer from private key string.
 * @param private_key_string EC prime256v1 private key string.
 * @returns String base64 encoded private key body.
 */
export const cleanUpPrivateKeyString = (private_key_string: string): string =>
  private_key_string
    .replace(`-----BEGIN EC PRIVATE KEY-----\n`, "")
    .replace("-----END EC PRIVATE KEY-----", "")
    .trim();

/**
 * Parameters for {@link generateSignedXMLString}.
 *
 * @property {XMLDocument} invoice_xml - Parsed UBL XML document of the invoice to sign.
 * @property {string} certificate_string - PEM-encoded CSID (compliance or production) issued by ZATCA.
 * @property {string} private_key_string - PEM-encoded EC prime256v1 private key.
 *   Despite the name `privateKeyReference`, this is the actual PEM key content, not a path or reference.
 */
export interface GenerateSignedXMLStringParams {
  invoice_xml: XMLDocument;
  certificate_string: string;
  private_key_string: string;
}

/**
 * The result of {@link generateSignedXMLString}.
 *
 * @property {string} signed_invoice_string - The fully signed UBL XML string, ready for submission to ZATCA.
 * @property {string} invoice_hash - SHA-256 hash of the canonical invoice XML, base64-encoded.
 *   This is the PIH (Previous Invoice Hash) for the next invoice in the chain.
 * @property {string} signature_value - Base64-encoded ECDSA digital signature over the invoice hash.
 * @property {string} qr - Base64-encoded TLV QR code string to embed in the invoice.
 */
export interface SignedXMLResult {
  signed_invoice_string: string;
  invoice_hash: string;
  signature_value: string;
  qr: string;
}

/**
 * Main signing function.
 * @param invoice_xml XMLDocument of invoice to be signed.
 * @param certificate_string String signed EC certificate.
 * @param private_key_string String EC prime256v1 private key.
 * @returns signed_invoice_string: string, invoice_hash: string, qr: string
 */
export const generateSignedXMLString = ({
  invoice_xml,
  certificate_string,
  private_key_string,
}: GenerateSignedXMLStringParams): SignedXMLResult => {
  const invoice_copy: XMLDocument = new XMLDocument(
    invoice_xml.toString({ no_header: false })
  );

  // 1: Invoice Hash
  const invoice_hash = getInvoiceHash(invoice_xml);
  log("Info", "Signer", `Invoice hash:  ${invoice_hash}`);

  // 2: Certificate hash and certificate info
  const cert_info = getCertificateInfo(certificate_string);
  log("Info", "Signer", `Certificate info:  ${JSON.stringify(cert_info)}`);

  // 3: Digital Certificate
  const digital_signature = createInvoiceDigitalSignature(
    invoice_hash,
    private_key_string
  );
  log("Info", "Signer", `Digital signature: ${digital_signature}`);

  // 4: QR
  const qr = generateQR({
    certificate_signature: cert_info.signature,
    digital_signature: digital_signature,
    invoice_xml: invoice_xml,
    public_key: cert_info.public_key,
  });
  log("Info", "Signer", `QR: ${qr}`);

  // Set Signed properties
  const signed_properties_props = {
    certificate_hash: cert_info.hash,
    certificate_issuer: cert_info.issuer,
    certificate_serial_number: cert_info.serial_number,
    sign_timestamp: `${moment(new Date()).format("YYYY-MM-DDTHH:mm:ss")}Z`,
  };
  const ubl_signature_signed_properties_xml_string_for_signing =
    defaultUBLExtensionsSignedPropertiesForSigning(signed_properties_props);
  const ubl_signature_signed_properties_xml_string =
    defaultUBLExtensionsSignedProperties(signed_properties_props);

  // 5: Get SignedProperties hash
  const signed_properties_bytes = Buffer.from(
    ubl_signature_signed_properties_xml_string_for_signing
  );
  let signed_properties_hash = createHash("sha256")
    .update(signed_properties_bytes)
    .digest("hex");
  signed_properties_hash = Buffer.from(signed_properties_hash).toString(
    "base64"
  );
  log("Info", "Signer", `Signed properties hash: ${signed_properties_hash}`);

  // UBL Extensions
  const ubl_signature_xml_string = defaultUBLExtensions(
    invoice_hash,
    signed_properties_hash,
    digital_signature,
    cleanUpCertificateString(certificate_string),
    ubl_signature_signed_properties_xml_string
  );

  // Set signing elements
  let unsigned_invoice_str: string = invoice_copy.toString({
    no_header: false,
  });
  unsigned_invoice_str = unsigned_invoice_str.replace(
    "SET_UBL_EXTENSIONS_STRING",
    ubl_signature_xml_string
  );
  unsigned_invoice_str = unsigned_invoice_str.replace("SET_QR_CODE_DATA", qr);
  const signed_invoice: XMLDocument = new XMLDocument(unsigned_invoice_str);

  let signed_invoice_string: string = signed_invoice.toString({
    no_header: false,
  });
  signed_invoice_string = signedPropertiesIndentationFix(signed_invoice_string);

  return {
    invoice_hash,
    qr,
    signature_value: digital_signature,
    signed_invoice_string,
  };
};

/**
 * Fixes indentation in signed properties to match ZATCA validator hashing expectations.
 */
const signedPropertiesIndentationFix = (
  signed_invoice_string: string
): string => {
  let fixer = signed_invoice_string;
  let signed_props_lines: string[] = fixer
    .split("<ds:Object>")[1]
    .split("</ds:Object>")[0]
    .split("\n");
  let fixed_lines: string[] = [];
  // Stripping first 4 spaces
  signed_props_lines.map((line) => fixed_lines.push(line.slice(4)));
  signed_props_lines = signed_props_lines.slice(0, -1);
  fixed_lines = fixed_lines.slice(0, -1);

  fixer = fixer.replace(signed_props_lines.join("\n"), fixed_lines.join("\n"));
  return fixer;
};

/**
 * `NodeSigner` implements the {@link Signer} interface for Node.js environments.
 * It wraps {@link generateSignedXMLString} and handles the certificate lifecycle
 * that the generic `Signer` interface cannot carry.
 *
 * The certificate is provided at construction time because the `SigningInput` type
 * only carries `privateKeyReference` (the PEM private key content) — not the certificate.
 *
 * **Note on `privateKeyReference`:** despite the field name, this is the PEM-encoded
 * private key string itself, not a file path or key ID.
 *
 * @example
 * ```typescript
 * const signer = new NodeSigner(certificatePemString);
 * const invoice = new ZATCAInvoice({ props, signer, acceptWarning: true });
 * const result = await invoice.sign(certificatePemString, privateKeyPemString);
 * // result.signedXml, result.invoiceHash, result.signingCertificate
 * ```
 */
export class NodeSigner implements Signer {
  constructor(private certificate_string: string) {}

  // eslint-disable-next-line require-await -- Interface contract requires Promise return type
  async sign(input: SigningInput): Promise<SignatureResult> {
    const invoice_xml = new XMLDocument(input.invoiceXml);

    const { signed_invoice_string, invoice_hash, signature_value } =
      generateSignedXMLString({
        certificate_string: this.certificate_string,
        invoice_xml,
        private_key_string: input.privateKeyReference,
      });

    return {
      invoiceHash: invoice_hash,
      signatureValue: signature_value,
      signedXml: signed_invoice_string,
      signingCertificate: cleanUpCertificateString(this.certificate_string),
    };
  }
}
