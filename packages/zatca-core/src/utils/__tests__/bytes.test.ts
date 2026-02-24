import { describe, it, expect } from "vitest";
import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  utf8ToUint8Array,
  uint8ArrayToUtf8,
  uint8ArrayToHex,
  hexToUint8Array,
  concatUint8Arrays,
} from "../bytes.js";

describe("uint8ArrayToBase64", () => {
  it("encodes known vector: empty array", () => {
    expect(uint8ArrayToBase64(new Uint8Array([]))).toBe("");
  });

  it("encodes known vector: [72, 101, 108, 108, 111] -> 'SGVsbG8='", () => {
    expect(uint8ArrayToBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe(
      "SGVsbG8="
    );
  });

  it("encodes known vector: [1, 2, 3] -> 'AQID'", () => {
    expect(uint8ArrayToBase64(new Uint8Array([1, 2, 3]))).toBe("AQID");
  });
});

describe("base64ToUint8Array", () => {
  it("decodes known vector: 'SGVsbG8=' -> [72,101,108,108,111]", () => {
    expect(base64ToUint8Array("SGVsbG8=")).toEqual(
      new Uint8Array([72, 101, 108, 108, 111])
    );
  });

  it("decodes known vector: '' -> empty", () => {
    expect(base64ToUint8Array("")).toEqual(new Uint8Array([]));
  });

  it("throws on malformed base64 input", () => {
    expect(() => base64ToUint8Array("!!!not_base64!!!")).toThrow(
      /Invalid base64 string/
    );
  });
});

describe("base64 roundtrip", () => {
  it("encodes then decodes back to original bytes", () => {
    const original = new Uint8Array([0, 127, 128, 255, 42, 100]);
    expect(base64ToUint8Array(uint8ArrayToBase64(original))).toEqual(original);
  });
});

describe("utf8ToUint8Array", () => {
  it("encodes ASCII string to bytes", () => {
    expect(utf8ToUint8Array("Hello")).toEqual(
      new Uint8Array([72, 101, 108, 108, 111])
    );
  });

  it("encodes empty string to empty bytes", () => {
    expect(utf8ToUint8Array("")).toEqual(new Uint8Array([]));
  });
});

describe("uint8ArrayToUtf8", () => {
  it("decodes bytes to ASCII string", () => {
    expect(uint8ArrayToUtf8(new Uint8Array([72, 101, 108, 108, 111]))).toBe(
      "Hello"
    );
  });

  it("decodes empty bytes to empty string", () => {
    expect(uint8ArrayToUtf8(new Uint8Array([]))).toBe("");
  });
});

describe("utf8 roundtrip", () => {
  it("encodes then decodes back to original string", () => {
    const original = "Hello, World! مرحبا";
    expect(uint8ArrayToUtf8(utf8ToUint8Array(original))).toBe(original);
  });
});

describe("uint8ArrayToHex", () => {
  it("encodes known vector: [0,1,255] -> '0001ff'", () => {
    expect(uint8ArrayToHex(new Uint8Array([0, 1, 255]))).toBe("0001ff");
  });

  it("encodes empty array to empty string", () => {
    expect(uint8ArrayToHex(new Uint8Array([]))).toBe("");
  });

  it("pads single-digit hex values", () => {
    expect(uint8ArrayToHex(new Uint8Array([0, 15, 16]))).toBe("000f10");
  });
});

describe("hexToUint8Array", () => {
  it("decodes known vector: '0001ff' -> [0,1,255]", () => {
    expect(hexToUint8Array("0001ff")).toEqual(new Uint8Array([0, 1, 255]));
  });

  it("decodes uppercase hex", () => {
    expect(hexToUint8Array("0001FF")).toEqual(new Uint8Array([0, 1, 255]));
  });

  it("decodes empty string to empty array", () => {
    expect(hexToUint8Array("")).toEqual(new Uint8Array([]));
  });

  it("throws on odd-length hex string", () => {
    expect(() => hexToUint8Array("abc")).toThrow(/odd length/);
  });

  it("throws on non-hex characters", () => {
    expect(() => hexToUint8Array("zz")).toThrow(/non-hex/);
  });
});

describe("hex roundtrip", () => {
  it("encodes then decodes back to original bytes", () => {
    const original = new Uint8Array([0, 127, 128, 255]);
    expect(hexToUint8Array(uint8ArrayToHex(original))).toEqual(original);
  });
});

describe("concatUint8Arrays", () => {
  it("concatenates two arrays", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    expect(concatUint8Arrays(a, b)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("concatenates three arrays", () => {
    const a = new Uint8Array([1]);
    const b = new Uint8Array([2]);
    const c = new Uint8Array([3]);
    expect(concatUint8Arrays(a, b, c)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("handles empty arrays", () => {
    expect(concatUint8Arrays(new Uint8Array([]))).toEqual(new Uint8Array([]));
  });

  it("handles mix of empty and non-empty arrays", () => {
    const a = new Uint8Array([]);
    const b = new Uint8Array([1, 2]);
    const c = new Uint8Array([]);
    expect(concatUint8Arrays(a, b, c)).toEqual(new Uint8Array([1, 2]));
  });

  it("returns empty array when called with no arguments", () => {
    expect(concatUint8Arrays()).toEqual(new Uint8Array([]));
  });
});
