# @jaicome/zatca-core

[![npm version](https://img.shields.io/npm/v/@jaicome/zatca-core.svg)](https://www.npmjs.com/package/@jaicome/zatca-core)

Universal logic for building and parsing ZATCA invoices. Compatible with browsers, React Native, and Node.js.

## Installation

```bash
npm install @jaicome/zatca-core
```

## Quick Start

```typescript
import { ZATCAInvoice } from "@jaicome/zatca-core";

// Create an invoice instance
const invoice = new ZATCAInvoice({
  props: {
    // invoice properties
  },
  signer: yourSigner,
  acceptWarning: true,
});

// Sign the invoice
const result = await invoice.sign(certificate, privateKey);
console.log(result.signedXml);
console.log(result.invoiceHash);
```

## Features

- Build and parse ZATCA-compliant invoices
- XML generation and validation
- Cryptographic stamp generation
- Compliance checking
- Works in browsers, React Native, and Node.js

## Documentation

For detailed guides, tutorials, and API documentation, see the [main README](../../README.md).

## License

MIT
