// NO Buffer: this module is runtime-agnostic (web/RN/Node)

/**
 * Portable base64 encoding using btoa() (browser, React Native, Node 16+).
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Portable base64 decoding. Throws on malformed input.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error(`Invalid base64 string: "${base64}"`);
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function utf8ToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function stringToUint8Array(str: string): Uint8Array {
  return utf8ToUint8Array(str);
}

export function uint8ArrayToUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

export function uint8ArrayToString(bytes: Uint8Array): string {
  return uint8ArrayToUtf8(bytes);
}

export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decodes hex string to Uint8Array.
 * Throws on odd-length strings or non-hex characters.
 */
export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string (odd length): "${hex}"`);
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error(`Invalid hex string (non-hex characters): "${hex}"`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
