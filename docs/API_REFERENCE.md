# API Reference

This document provides a schema-driven reference for the public APIs of `@jaicome/zatca-core` and `@jaicome/zatca-server`.

## @jaicome/zatca-core

The core package contains universal logic for building and parsing invoices, compatible with Node.js, browsers, and React Native.

### Functions

#### `buildInvoice(props: ZATCAInvoiceProps, signer?: Signer): ZATCAInvoice`
- **Description**: The primary entry point for creating a new invoice.
- **Input Validation**: ✅ Validated against `ZATCAInvoicePropsSchema`.
- **Parameters**:
  - `props`: Configuration object for the invoice.
  - `signer` (Optional): An implementation of the `Signer` interface.
- **Returns**: A `ZATCAInvoice` instance.

#### `parseInvoice(xml: string, signer?: Signer): ZATCAInvoice`
- **Description**: Reconstructs an invoice instance from an existing XML string.
- **Input Validation**: ❌ No schema validation on the raw XML string.
- **Parameters**:
  - `xml`: The invoice XML string.
  - `signer` (Optional): An implementation of the `Signer` interface.
- **Returns**: A `ZATCAInvoice` instance.

#### `prepareSigningInput(invoice: ZATCAInvoice): SigningInput`
- **Description**: Extracts the necessary data from an invoice instance to prepare for digital signing.
- **Input Validation**: ✅ Validated against `SigningInputSchema`.
- **Parameters**:
  - `invoice`: The invoice instance.
- **Returns**: A `SigningInput` object.

#### `generatePhaseOneQR(invoice: ZATCAInvoice): string`
- **Description**: Generates a Base64 encoded Phase 1 (simplified) QR code string.
- **Parameters**:
  - `invoice`: The invoice instance.
- **Returns**: Base64 encoded QR string.

### Schemas

The following Zod schemas are exported for manual validation or type inference:

- `ZATCAInvoicePropsSchema`
- `ZATCAInvoiceLineItemSchema`
- `EGSUnitInfoSchema`
- `EGSUnitLocationSchema`
- `EGSUnitCustomerInfoSchema`
- `SigningInputSchema`

### Error Types

#### `ZodValidationError`
Thrown when input validation fails. Contains an `issues` property with detailed Zod errors.

---

## @jaicome/zatca-server

The server package provides Node.js specific functionality for cryptographic operations, EGS on-boarding, and ZATCA API integration.

### Classes

#### `EGS`
- **Constructor**: `new EGS(info: EGSUnitInfo, env?: "production" | "simulation" | "development")`
- **Validation**: ✅ Constructor validates `info` against `EGSUnitInfoSchema`.
- **Methods**:
  - `generateNewKeysAndCSR(production: boolean, solution_name: string)`: Generates a new ECDSA key pair and CSR.
  - `issueComplianceCertificate(OTP: string)`: Requests a compliance certificate from ZATCA.
  - `issueProductionCertificate(compliance_request_id: string)`: Requests a production certificate.
  - `signInvoice(invoice: ZATCAInvoice, production?: boolean)`: Signs an invoice using the EGS certificates.
  - `reportInvoice(signed_invoice_string: string, invoice_hash: string)`: Reports a simplified invoice to ZATCA.
  - `clearanceInvoice(signed_invoice_string: string, invoice_hash: string)`: Submits a standard invoice for clearance.

#### `NodeSigner`
- **Description**: A Node.js implementation of the `Signer` interface using the `crypto` module.
- **Constructor**: `new NodeSigner(certificate_string: string)`

### Functions

#### `generateSignedXMLString(params: GenerateSignedXMLStringParams): SignedXMLResult`
- **Description**: The core signing function that produces a ZATCA-compliant signed XML.
- **Parameters**:
  - `params.invoice_xml`: `XMLDocument` instance.
  - `params.certificate_string`: Base64 encoded certificate.
  - `params.private_key_string`: EC private key.
- **Returns**: `SignedXMLResult` (signed string, hash, and QR).

#### `generateQR(params: GenerateQRParams): string`
- **Description**: Generates a full Phase 2 QR code including the digital signature.
- **Returns**: Base64 encoded QR string.

### Re-exports

The server package re-exports the following from core for convenience:
- `ZodValidationError`
- `EGSUnitInfoSchema`
- `EGSUnitLocation`
- `EGSUnitCustomerInfo`
- `EGSUnitInfo`
