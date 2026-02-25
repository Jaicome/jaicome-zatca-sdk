/**
 * Input data required to sign a ZATCA invoice.
 *
 * Passed to {@link Signer.sign} by the signing implementation.
 * The `invoiceHash` and `privateKeyReference` fields may be empty strings
 * when first constructed via `prepareSigningInput()` and are populated by the signer.
 */
export interface SigningInput {
  /** Serialized UBL 2.1 XML of the invoice to be signed. Must be non-empty. */
  invoiceXml: string;
  /**
   * SHA-256 hash of the canonical invoice XML, base64-encoded.
   *
   * Computed by the signer during the signing process. Pass an empty string
   * when calling `prepareSigningInput()` before signing.
   */
  invoiceHash: string;
  /**
   * Reference to the private key used for signing.
   *
   * For `NodeSigner` from `@jaicome/zatca-server`, this is a PEM-encoded ECDSA private key string.
   * The exact format depends on the `Signer` implementation.
   */
  privateKeyReference: string;
}

/**
 * Artifacts produced after successfully signing a ZATCA invoice.
 *
 * Returned by {@link Signer.sign}.
 */
export interface SignatureResult {
  /** The signed UBL 2.1 XML string with the digital signature embedded. */
  signedXml: string;
  /** Base64-encoded ECDSA signature value. */
  signatureValue: string;
  /** PEM-encoded X.509 signing certificate used to produce the signature. */
  signingCertificate: string;
  /**
   * SHA-256 hash of the signed invoice XML, base64-encoded (KSA-13 PIH for the next invoice).
   *
   * Store this value as the `previousInvoiceHash` for the next invoice in the chain.
   */
  invoiceHash: string;
}

/**
 * @deprecated Use {@link SignatureResult} instead.
 *
 * Alias kept for backwards compatibility.
 */
export type SignedInvoiceArtifacts = SignatureResult;

/**
 * Contract for a ZATCA invoice signing implementation.
 *
 * Implementations must compute the invoice hash, embed the XAdES digital signature
 * in the UBL XML, and return the signed artifacts.
 *
 * The `NodeSigner` class in `@jaicome/zatca-server` is the reference implementation.
 * Custom implementations can be provided for other runtimes.
 *
 * @example
 * // Using NodeSigner from @jaicome/zatca-server
 * import { NodeSigner } from '@jaicome/zatca-server';
 * const signer = new NodeSigner(certificate_string);
 * const invoice = new ZATCAInvoice({ props, signer });
 */
export interface Signer {
  /**
   * Signs the invoice and returns the signed artifacts.
   *
   * @param input - Signing input containing the invoice XML and key reference.
   * @returns A promise resolving to {@link SignatureResult}.
   */
  sign(input: SigningInput): Promise<SignatureResult>;
}
