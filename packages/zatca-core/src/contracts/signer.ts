export interface SigningInput {
  invoiceXml: string;
  invoiceHash: string;
  privateKeyReference: string;
}

export interface SignatureResult {
  signedXml: string;
  signatureValue: string;
  signingCertificate: string;
  invoiceHash: string;
}

export type SignedInvoiceArtifacts = SignatureResult;

export interface Signer {
  sign(input: SigningInput): Promise<SignatureResult>;
}
