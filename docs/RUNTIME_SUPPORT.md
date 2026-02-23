# Runtime Support and Guarantees

The @jaicome/zatca SDK is split into two packages with different runtime requirements and guarantees.

## Runtime Matrix

| Runtime          | @jaicome/zatca-core | @jaicome/zatca-server | Notes                                                                 |
|------------------|---------------------|-----------------------|-----------------------------------------------------------------------|
| **Node.js 16+**  | Supported           | Supported             | Full support for all features including signing and EGS lifecycle.     |
| **Web Browser**  | Supported           | Not Supported         | Browser-side signing is restricted to protect private key material.     |
| **React Native** | Supported           | Not Supported         | Server package depends on Node.js internal modules like `crypto`.      |

## Prerequisites

### @jaicome/zatca-core
This package is designed to be as portable as possible. It relies on standard modern JavaScript APIs available in all targeted runtimes.

**Minimum runtime versions:**
*   **Node.js ≥ 16.0.0** — required for global `atob` / `btoa` availability (added in Node 16.0.0).
*   **React Native ≥ 0.65** — required for global `atob` / `btoa` and `TextEncoder` / `TextDecoder`.
*   **Modern browsers** — Chrome 67+, Firefox 58+, Safari 13.1+, Edge 79+ (all support these APIs natively).

**Required Web APIs:**
*   `atob` / `btoa`: Used for Base64 encoding and decoding. **Not available in Node.js < 16.** If you must support Node.js 14 or older, provide a polyfill (e.g. `globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary')`).
*   `TextEncoder` / `TextDecoder`: Used for UTF-8 string processing.
*   `ES2020` support or newer: The codebase uses modern JavaScript features.

### @jaicome/zatca-server
This package is restricted to Node.js because it integrates directly with the underlying system.

*   **Node.js `crypto` module**: Essential for cryptographic signing and `X509Certificate` processing.
*   **Node.js `child_process` module**: Used to spawn `openssl` for key and CSR generation.
*   **Node.js `fs` module**: Used for temporary file management during EGS on-boarding.
*   **OpenSSL**: Must be installed and available in the system path for EGS key generation and CSR creation.

## Runtime Guarantees

### Server-Only Signing
Signing invoices using `NodeSigner` is strictly for server-side environments. This is a deliberate security design choice. The server package uses the Node.js `crypto` library and `Buffer` for high-performance, secure signing.

### Core Portability
The `@jaicome/zatca-core` package does not use `Buffer` or any other Node-only globals. It uses `Uint8Array` for binary data handling, ensuring it runs natively in browsers and React Native without needing complex polyfills.

### Versioning
All packages in the `@jaicome/zatca` family are versioned together to ensure compatibility. Always use matching versions of `@jaicome/zatca-core` and `@jaicome/zatca-server`.
