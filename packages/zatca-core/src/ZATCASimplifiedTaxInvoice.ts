import { XMLDocument } from "./parser/index.js";
import { Calc } from "./calc.js";
import { Signer, SignatureResult } from "./contracts/signer.js";
import defaultSimplifiedTaxInvoice, {
  ZATCAInvoiceTypes,
  ZATCAPaymentMethods,
  ZATCAInvoiceTypeSchema,
  ZATCAPaymentMethodSchema,
  InvoiceCodeSchema,
  INVOICE_TYPE_CODES,
  PAYMENT_METHOD_CODES,
  INVOICE_CODE_VALUES,
} from "./templates/simplified_tax_invoice_template.js";
import type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
  ZATCAInvoiceType,
  ZATCAPaymentMethod,
  InvoiceCode,
} from "./templates/simplified_tax_invoice_template.js";

export type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
  ZATCAInvoiceType,
  ZATCAPaymentMethod,
  InvoiceCode,
};
export {
  ZATCAInvoiceTypes,
  ZATCAPaymentMethods,
  ZATCAInvoiceTypeSchema,
  ZATCAPaymentMethodSchema,
  InvoiceCodeSchema,
  INVOICE_TYPE_CODES,
  PAYMENT_METHOD_CODES,
  INVOICE_CODE_VALUES,
};

export class ZATCAInvoice {
  private invoice_xml: XMLDocument;
  private signer?: Signer;

  constructor({
    invoice_xml_str,
    props,
    acceptWarning,
    signer,
  }: {
    invoice_xml_str?: string;
    props?: ZATCAInvoiceProps;
    acceptWarning?: boolean;
    signer?: Signer;
  }) {
    this.signer = signer;

    if (invoice_xml_str) {
      this.invoice_xml = new XMLDocument(invoice_xml_str);
      if (!this.invoice_xml)
        throw new Error("Error parsing invoice XML string.");
    } else {
      if (!props) throw new Error("Unable to create new XML invoice.");
      this.invoice_xml = new XMLDocument(defaultSimplifiedTaxInvoice(props));
      this.parseLineItems(props.lineItems ?? [], props, acceptWarning);
    }
  }

  private parseLineItems(
    lineItems: ZATCAInvoiceLineItem[],
    props: ZATCAInvoiceProps,
    acceptWarning: boolean = false
  ) {
    Calc(lineItems, props, this.invoice_xml, acceptWarning);
  }

  getXML(): XMLDocument {
    return this.invoice_xml;
  }

  sign(
    certificate_string: string,
    private_key_string: string
  ): Promise<SignatureResult> {
    if (!this.signer) {
      throw new Error(
        "Signing requires a server-side Signer implementation. " +
          "Pass a `signer` to the ZATCAInvoice constructor."
      );
    }
    const invoice_xml_str = this.invoice_xml.toString({});
    return this.signer.sign({
      invoiceXml: invoice_xml_str,
      invoiceHash: "",
      privateKeyReference: private_key_string,
    });
  }
}
