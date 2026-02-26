import { Calc } from "./calc";
import type { Signer, SignatureResult } from "./contracts/signer";
import { XMLDocument } from "./parser/index";
import defaultSimplifiedTaxInvoice, {
  ZATCAInvoiceTypeSchema,
  ZATCAPaymentMethodSchema,
  InvoiceCodeSchema,
  INVOICE_TYPE_CODES,
  PAYMENT_METHOD_CODES,
  INVOICE_CODE_VALUES,
} from "./templates/simplified-tax-invoice-template";
import type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
  ZATCAInvoiceType,
  ZATCAPaymentMethod,
  InvoiceCode,
} from "./templates/simplified-tax-invoice-template";

export type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
  ZATCAInvoiceType,
  ZATCAPaymentMethod,
  InvoiceCode,
};
export {
  ZATCAInvoiceTypeSchema,
  ZATCAPaymentMethodSchema,
  InvoiceCodeSchema,
  INVOICE_TYPE_CODES,
  PAYMENT_METHOD_CODES,
  INVOICE_CODE_VALUES,
};

/**
 * Core invoice object for ZATCA e-invoicing.
 *
 * Wraps the UBL 2.1 XML document for a ZATCA simplified or standard tax invoice.
 * Can be constructed from raw props (to generate a new invoice) or from an existing
 * XML string (to parse and re-sign a previously generated invoice).
 *
 * @example
 * // Build a new invoice from props
 * const invoice = new ZATCAInvoice({ props, signer });
 * const { signedXml, invoiceHash } = await invoice.sign(privateKey);
 *
 * @example
 * // Parse an existing XML string
 * const invoice = new ZATCAInvoice({ invoice_xml_str: xmlString });
 */
export class ZATCAInvoice {
  /** Internal UBL XML document. Mutated in-place during signing. */
  private invoice_xml: XMLDocument;
  /**
   * Optional signing implementation.
   *
   * Must be provided when calling {@link sign}. Typically a `NodeSigner` from
   * `@jaicome/zatca-server`. Omit when only building or parsing XML without signing.
   */
  private signer?: Signer;

  /**
   * Constructs a `ZATCAInvoice` instance.
   *
   * Provide either `invoice_xml_str` (to parse an existing XML) or `props` (to generate
   * a new invoice from structured data). Exactly one of the two must be supplied.
   *
   * @param invoice_xml_str - Raw UBL 2.1 XML string of a previously generated invoice.
   * @param props - Structured invoice data. See {@link ZATCAInvoiceProps}.
   * @param acceptWarning - When `true`, suppresses non-fatal ZATCA validation warnings
   *   (e.g. rounding discrepancies). Defaults to `false`.
   * @param signer - Signing implementation. Required only if you intend to call {@link sign}.
   * @throws {Error} If neither `invoice_xml_str` nor `props` is provided.
   * @throws {Error} If the provided XML string cannot be parsed.
   */
  constructor({
    invoice_xml_str,
    props,
    acceptWarning,
    signer,
  }: {
    invoice_xml_str?: string;
    props?: ZATCAInvoiceProps;
    /**
     * Controls rounding tolerance in tax calculations.
     *
     * When `true`, allows minor rounding differences (< 0.01 SAR) that ZATCA's
     * validator may flag as warnings. Recommended: `true` for production use.
     * Defaults to `false`.
     */
    acceptWarning?: boolean;
    signer?: Signer;
  }) {
    this.signer = signer;

    if (invoice_xml_str) {
      this.invoice_xml = new XMLDocument(invoice_xml_str);
      if (!this.invoice_xml) {
        throw new Error("Error parsing invoice XML string.");
      }
    } else {
      if (!props) {
        throw new Error("Unable to create new XML invoice.");
      }
      this.invoice_xml = new XMLDocument(defaultSimplifiedTaxInvoice(props));
      this.parseLineItems(props.lineItems ?? [], props, acceptWarning);
    }
  }

  private parseLineItems(
    lineItems: ZATCAInvoiceLineItem[],
    props: ZATCAInvoiceProps,
    acceptWarning = false
  ) {
    Calc(lineItems, props, this.invoice_xml, acceptWarning);
  }

  /**
   * Returns the internal XML document.
   *
   * Use this to inspect or serialize the invoice XML before or after signing.
   *
   * @returns The mutable {@link XMLDocument} instance.
   */
  getXML(): XMLDocument {
    return this.invoice_xml;
  }

  /**
   * Signs the invoice using the provided private key.
   *
   * Delegates to the `Signer` implementation passed in the constructor.
   * The signer computes the invoice hash, embeds the digital signature in the XML,
   * and returns the signed artifacts.
   *
   * @param private_key_string - PEM-encoded ECDSA private key matching the certificate.
   * @returns A promise resolving to {@link SignatureResult} with `signedXml` and `invoiceHash`.
   * @throws {Error} If no `signer` was provided to the constructor.
   */
  sign(private_key_string: string): Promise<SignatureResult> {
    if (!this.signer) {
      throw new Error(
        "Signing requires a server-side Signer implementation. " +
          "Pass a `signer` to the ZATCAInvoice constructor."
      );
    }
    const invoice_xml_str = this.invoice_xml.toString({});
    return this.signer.sign({
      // invoiceHash is required by the interface; NodeSigner computes it internally
      invoiceHash: "",
      invoiceXml: invoice_xml_str,
      privateKeyReference: private_key_string,
    });
  }
}
