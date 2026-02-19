import { XMLDocument } from "./parser";
import { Calc } from "./calc";
import { Signer, SignatureResult } from "./contracts/signer";
import defaultSimplifiedTaxInvoice, {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
  ZATCAInvoiceTypes,
  ZATCAPaymentMethods,
} from "./templates/simplified_tax_invoice_template";

export {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
  ZATCAInvoiceTypes,
  ZATCAPaymentMethods,
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
      this.parseLineItems(props.line_items ?? [], props, acceptWarning);
    }
  }

  private parseLineItems(
    line_items: ZATCAInvoiceLineItem[],
    props: ZATCAInvoiceProps,
    acceptWarning: boolean = false
  ) {
    Calc(line_items, props, this.invoice_xml, acceptWarning);
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
