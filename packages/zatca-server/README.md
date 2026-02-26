# @jaicome/zatca-server

[![npm version](https://img.shields.io/npm/v/@jaicome/zatca-server.svg)](https://www.npmjs.com/package/@jaicome/zatca-server)

Node.js-only library for ZATCA signing, EGS on-boarding, and ZATCA HTTP API integration.

**⚠️ Node.js only** — Not compatible with browsers or React Native. Requires `@jaicome/zatca-core` as a peer dependency.

## Installation

```bash
npm install @jaicome/zatca-server @jaicome/zatca-core
```

## Quick Start

### Signing Invoices

```typescript
import { NodeSigner } from "@jaicome/zatca-server";
import { ZATCAInvoice } from "@jaicome/zatca-core";

const signer = new NodeSigner(certificate);
const invoice = new ZATCAInvoice({
  props: {
    /* invoice data */
  },
  signer,
  acceptWarning: true,
});

const result = await invoice.sign(certificate, privateKey);
```

### EGS On-boarding

```typescript
import { EGS } from "@jaicome/zatca-server";

const egs = new EGS(egsUnit);
await egs.generateNewKeysAndCSR("solution_name");
const complianceRid = await egs.issueComplianceCertificate("123345");
await egs.issueProductionCertificate(complianceRid);
```

## Features

- Invoice signing with cryptographic stamps
- EGS creation and on-boarding (Compliance & Production CSIDs)
- ZATCA HTTP API integration
- OpenSSL-based key generation and CSR signing

## Documentation

For detailed guides, tutorials, and API documentation, see the [main README](../../README.md).

## License

MIT
