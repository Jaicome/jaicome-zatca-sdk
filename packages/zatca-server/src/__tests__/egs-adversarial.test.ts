import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ZATCAInvoice } from "@jaicome/zatca-core";

import { EGS } from "../egs/index";
import type { EGSInfo } from "../egs/index";
import { ZodValidationError } from "../schemas/index";

const validEGSUnit: EGSInfo = {
  branchIndustry: "Software",
  branchName: "Main",
  id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  model: "IOS",
  name: "EGS1",
  vatName: "Jaicome Information Technology",
  vatNumber: "311497191800003",
};

function inspectCsrText(csr: string): string {
  const csrPath = path.join(os.tmpdir(), `egs-adversarial-${Date.now()}.csr`);
  try {
    fs.writeFileSync(csrPath, csr);
    return execFileSync("openssl", ["req", "-in", csrPath, "-noout", "-text"], {
      encoding: "utf8",
    });
  } finally {
    fs.unlink(csrPath, () => {});
  }
}

describe("eGS constructor — required field validation", () => {
  it("throws ZodValidationError when id is empty", () => {
    expect(() => new EGS({ ...validEGSUnit, id: "" })).toThrow(
      ZodValidationError
    );
  });

  it("throws ZodValidationError when name is empty", () => {
    expect(() => new EGS({ ...validEGSUnit, name: "" })).toThrow(
      ZodValidationError
    );
  });

  it("throws ZodValidationError when vatName is empty", () => {
    expect(() => new EGS({ ...validEGSUnit, vatName: "" })).toThrow(
      ZodValidationError
    );
  });

  it("throws ZodValidationError when vatNumber is empty", () => {
    expect(() => new EGS({ ...validEGSUnit, vatNumber: "" })).toThrow(
      ZodValidationError
    );
  });

  it("throws ZodValidationError when branchName is empty", () => {
    expect(() => new EGS({ ...validEGSUnit, branchName: "" })).toThrow(
      ZodValidationError
    );
  });

  it("throws ZodValidationError when branchIndustry is empty", () => {
    expect(() => new EGS({ ...validEGSUnit, branchIndustry: "" })).toThrow(
      ZodValidationError
    );
  });

  it("does not throw with valid EGSUnitInfo", () => {
    expect(() => new EGS(validEGSUnit)).not.toThrow();
  });

  it("getInfo() returns the unit info with correct id after construction", () => {
    const egs = new EGS(validEGSUnit);
    expect(egs.getInfo().id).toBe(validEGSUnit.id);
  });

  it("getInfo() returns the unit info with correct vatName after construction", () => {
    const egs = new EGS(validEGSUnit);
    expect(egs.getInfo().vatName).toBe(validEGSUnit.vatName);
  });
});

describe("eGS.getInfo()", () => {
  it("getInfo() returns all required fields from validEGSUnit", () => {
    const egs = new EGS(validEGSUnit);
    const info = egs.getInfo();
    expect(info.id).toBe(validEGSUnit.id);
    expect(info.vatName).toBe(validEGSUnit.vatName);
    expect(info.branchName).toBe(validEGSUnit.branchName);
    expect(info.branchIndustry).toBe(validEGSUnit.branchIndustry);
  });
});

describe("zodValidationError structure", () => {
  it("has name ZodValidationError, message containing 'Validation failed', and field path in issues for id", () => {
    try {
      new EGS({ ...validEGSUnit, id: "" });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      expect(zodErr.name).toBe("ZodValidationError");
      expect(zodErr.message).toContain("Validation failed");
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("id"))).toBeTruthy();
    }
  });

  it("zodValidationError.issues contains field path for vatNumber", () => {
    try {
      new EGS({ ...validEGSUnit, vatNumber: "" });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("vatNumber"))).toBeTruthy();
    }
  });
});

describe("eGS.signInvoice() — missing credentials", () => {
  it("throws when no privateKey and no certificate are set", () => {
    const egs = new EGS(validEGSUnit);
    expect(() => egs.signInvoice({} as unknown as ZATCAInvoice)).toThrow(
      "EGS is missing a certificate/private key to sign the invoice."
    );
  });

  it("throws when privateKey is set but complianceCertificate is not", () => {
    const privateKey =
      "-----BEGIN EC PRIVATE KEY-----\nfake\n-----END EC PRIVATE KEY-----";
    const restored = EGS.restore({ info: validEGSUnit, privateKey });
    expect(() =>
      restored.signInvoice({} as unknown as ZATCAInvoice, false)
    ).toThrow("EGS is missing a certificate/private key to sign the invoice.");
  });

  it("throws when complianceCertificate is set but privateKey is not", () => {
    const complianceCertificate =
      "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----";
    const restored = EGS.restore({ complianceCertificate, info: validEGSUnit });
    expect(() =>
      restored.signInvoice({} as unknown as ZATCAInvoice, false)
    ).toThrow("EGS is missing a certificate/private key to sign the invoice.");
  });
});

describe("eGS API prerequisites — methods that require cert/CSR", () => {
  it("issueComplianceCertificate throws when no CSR available", async () => {
    const egs = new EGS(validEGSUnit);
    await expect(egs.issueComplianceCertificate("123456")).rejects.toThrow(
      "EGS needs to generate a CSR first."
    );
  });

  it("issueProductionCertificate throws when no compliance certificate", async () => {
    const egs = new EGS(validEGSUnit);
    await expect(egs.issueProductionCertificate("fake-rid")).rejects.toThrow(
      "EGS is missing a certificate/private key/api secret to request a production certificate."
    );
  });

  it("checkInvoiceCompliance throws when no compliance certificate", async () => {
    const egs = new EGS(validEGSUnit);
    await expect(
      egs.checkInvoiceCompliance("<Invoice></Invoice>", "fakehash")
    ).rejects.toThrow(
      "EGS is missing a certificate/private key/api secret to check the invoice compliance."
    );
  });

  it("reportInvoice throws when no production certificate", async () => {
    const egs = new EGS(validEGSUnit);
    await expect(
      egs.reportInvoice("<Invoice></Invoice>", "fakehash")
    ).rejects.toThrow(
      "EGS is missing a certificate/private key/api secret to report the invoice."
    );
  });

  it("clearanceInvoice throws when no production certificate", async () => {
    const egs = new EGS(validEGSUnit);
    await expect(
      egs.clearanceInvoice("<Invoice></Invoice>", "fakehash")
    ).rejects.toThrow(
      "EGS is missing a certificate/private key/api secret to report the invoice."
    );
  });

  it("runComplianceChecksForProduction throws when required steps are missing", async () => {
    const egs = new EGS(validEGSUnit);
    await expect(egs.runComplianceChecksForProduction({})).rejects.toThrow(
      "Missing compliance check payloads"
    );
  });
});

describe("eGS environment selection", () => {
  it("constructor accepts 'development' environment without throwing", () => {
    expect(() => new EGS(validEGSUnit, "development")).not.toThrow();
  });

  it("constructor accepts 'simulation' environment without throwing", () => {
    expect(() => new EGS(validEGSUnit, "simulation")).not.toThrow();
  });

  it("constructor accepts 'production' environment without throwing", () => {
    expect(() => new EGS(validEGSUnit, "production")).not.toThrow();
  });
});

describe("cSR production flag behavior", () => {
  it("uses PREZATCA-Code-Signing OID value when environment is development", async () => {
    const egs = new EGS(validEGSUnit, "development");
    await egs.generateNewKeysAndCSR("SDK-Test");
    const csr = egs.getCsr();

    expectTypeOf(csr).toBeString();
    expect(csr).toContain("BEGIN CERTIFICATE REQUEST");

    const csrText = inspectCsrText(csr as string);
    expect(csrText).toContain("PREZATCA-Code-Signing");
  });

  it("uses ZATCA-Code-Signing OID value when environment is production", async () => {
    const egs = new EGS(validEGSUnit, "production");
    await egs.generateNewKeysAndCSR("SDK-Test");
    const csr = egs.getCsr();

    expectTypeOf(csr).toBeString();
    expect(csr).toContain("BEGIN CERTIFICATE REQUEST");

    const csrText = inspectCsrText(csr as string);
    expect(csrText).toContain("ZATCA-Code-Signing");
    expect(csrText).not.toContain("PREZATCA-Code-Signing");
  });
});
