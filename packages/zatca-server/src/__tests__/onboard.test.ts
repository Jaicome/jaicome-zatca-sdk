import { generateKeyPairSync } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { EGSInfo } from "@jaicome/zatca-core";
import { GENESIS_PREVIOUS_INVOICE_HASH } from "@jaicome/zatca-core";
import { Result } from "better-result";

import { EGS, type ComplianceCheckPayload } from "../egs/index.js";
import type { OnboardResult, ZATCAComplianceStep } from "../index.js";

const SAMPLE_ZATCA_TEST_CERT_BODY =
  "MIID9jCCA5ugAwIBAgITbwAAeCy9aKcLA99HrAABAAB4LDAKBggqhkjOPQQDAjBjMRUwEwYKCZImiZPyLGQBGRYFbG9jYWwxEzARBgoJkiaJk/IsZAEZFgNnb3YxFzAVBgoJkiaJk/IsZAEZFgdleHRnYXp0MRwwGgYDVQQDExNUU1pFSU5WT0lDRS1TdWJDQS0xMB4XDTIyMDQxOTIwNDkwOVoXDTI0MDQxODIwNDkwOVowWTELMAkGA1UEBhMCU0ExEzARBgNVBAoTCjMxMjM0NTY3ODkxDDAKBgNVBAsTA1RTVDEnMCUGA1UEAxMeVFNULS05NzA1NjAwNDAtMzEyMzQ1Njc4OTAwMDAzMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYYMMoOaFYAhMO/steotfZyavr6p11SSlwsK9azmsLY7b1b+FLhqMArhB2dqHKboxqKNfvkKDePhpqjui5hcn0aOCAjkwggI1MIGaBgNVHREEgZIwgY+kgYwwgYkxOzA5BgNVBAQMMjEtVFNUfDItVFNUfDMtNDdmMTZjMjYtODA2Yi00ZTE1LWIyNjktN2E4MDM4ODRiZTljMR8wHQYKCZImiZPyLGQBAQwPMzEyMzQ1Njc4OTAwMDAzMQ0wCwYDVQQMDAQxMTAwMQwwCgYDVQQaDANUU1QxDDAKBgNVBA8MA1RTVDAdBgNVHQ4EFgQUO5ZiU7NakU3eejVa3I2S1B2sDwkwHwYDVR0jBBgwFoAUdmCM+wagrGdXNZ3PmqynK5k1tS8wTgYDVR0fBEcwRTBDoEGgP4Y9aHR0cDovL3RzdGNybC56YXRjYS5nb3Yuc2EvQ2VydEVucm9sbC9UU1pFSU5WT0lDRS1TdWJDQS0xLmNybDCBrQYIKwYBBQUHAQEEgaAwgZ0wbgYIKwYBBQUHMAGGYmh0dHA6Ly90c3RjcmwuemF0Y2EuZ292LnNhL0NlcnRFbnJvbGwvVFNaRWludm9pY2VTQ0ExLmV4dGdhenQuZ292LmxvY2FsX1RTWkVJTlZPSUNFLVN1YkNBLTEoMSkuY3J0MCsGCCsGAQUFBzABhh9odHRwOi8vdHN0Y3JsLnphdGNhLmdvdi5zYS9vY3NwMA4GA1UdDwEB/wQEAwIHgDAdBgNVHSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwMwJwYJKwYBBAGCNxUKBBowGDAKBggrBgEFBQcDAjAKBggrBgEFBQcDAzAKBggqhkjOPQQDAgNJADBGAiEA7mHT6yg85jtQGWp3M7tPT7Jk2+zsvVHGs3bU5Z7YE68CIQD60ebQamYjYvdebnFjNfx4X4dop7LsEBFCNSsLY0IFaQ==";

const SAMPLE_CERT_PEM = `-----BEGIN CERTIFICATE-----\n${SAMPLE_ZATCA_TEST_CERT_BODY}\n-----END CERTIFICATE-----`;

const validEGSUnit: EGSInfo = {
  branchIndustry: "Software",
  branchName: "Main",
  id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  model: "IOS",
  name: "EGS1",
  vatName: "Jaicome Information Technology",
  vatNumber: "311497191800003",
};

const expectedExecutionOrder: readonly ZATCAComplianceStep[] = [
  "standard-debit-note-compliant",
  "standard-compliant",
  "standard-credit-note-compliant",
  "simplified-debit-note-compliant",
  "simplified-compliant",
  "simplified-credit-note-compliant",
];

describe("eGS.onboard()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("automates full onboarding and returns chain state after six compliance invoices", async () => {
    const egs = new EGS(validEGSUnit, "simulation");
    const { privateKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      privateKeyEncoding: { format: "pem", type: "sec1" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });

    let capturedChecks: Partial<
      Record<ZATCAComplianceStep, ComplianceCheckPayload>
    > = {};
    const seenInvoiceCounters: number[] = [];
    const seenInvoiceCodeNames: string[] = [];
    const seenInvoiceTypeCodes: string[] = [];

    const generateSpy = vi
      .spyOn(EGS.prototype, "generateNewKeysAndCSR")
      .mockImplementation(async function (_solutionName: string): Promise<void> {
        (this as unknown as { privateKey?: string }).privateKey = privateKey;
      });

    const issueComplianceSpy = vi
      .spyOn(EGS.prototype, "issueComplianceCertificate")
      .mockImplementation(async function (_otp: string) {
        (this as unknown as {
          complianceApiSecret?: string;
          complianceCertificate?: string;
        }).complianceApiSecret = "compliance-secret";
        (this as unknown as {
          complianceCertificate?: string;
        }).complianceCertificate = SAMPLE_CERT_PEM;
        return Result.ok("compliance-request-id");
      });

    const runComplianceSpy = vi
      .spyOn(EGS.prototype, "runComplianceChecksForProduction")
      .mockImplementation(async (checks) => {
        capturedChecks = checks;
        return Result.ok({} as Record<ZATCAComplianceStep, never>);
      });

    let signCounter = 0;
    vi.spyOn(EGS.prototype, "signInvoice").mockImplementation((invoice) => {
      signCounter += 1;
      const xml = invoice.getXML().toString({});

      const icvMatch = xml.match(
        /<cbc:ID>ICV<\/cbc:ID>\s*<cbc:UUID>(\d+)<\/cbc:UUID>/
      );
      const invoiceTypeMatch = xml.match(
        /<cbc:InvoiceTypeCode name="([^"]+)">([^<]+)<\/cbc:InvoiceTypeCode>/
      );
      const pihMatch = xml.match(
        /<cbc:ID>PIH<\/cbc:ID>\s*<cac:Attachment>\s*<cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">([^<]+)<\/cbc:EmbeddedDocumentBinaryObject>/
      );

      if (!icvMatch || !invoiceTypeMatch || !pihMatch) {
        throw new Error("Could not parse compliance invoice XML in onboarding test");
      }

      seenInvoiceCounters.push(Number(icvMatch[1]));
      seenInvoiceCodeNames.push(invoiceTypeMatch[1]);
      seenInvoiceTypeCodes.push(invoiceTypeMatch[2]);

      const invoiceHash = `hash-${signCounter}`;
      return {
        invoiceHash,
        qr: `qr-${signCounter}`,
        signedInvoiceString: `signed-xml-${pihMatch[1]}`,
      };
    });

    const issueProductionSpy = vi
      .spyOn(EGS.prototype, "issueProductionCertificate")
      .mockImplementation(async function (_complianceRequestId: string) {
        (this as unknown as {
          productionApiSecret?: string;
          productionCertificate?: string;
        }).productionApiSecret = "production-secret";
        (this as unknown as {
          productionCertificate?: string;
        }).productionCertificate = SAMPLE_CERT_PEM;
        return Result.ok("production-request-id");
      });

    const result = await egs.onboard({
      otp: "123456",
      solutionName: "Onboard Test Solution",
    });

    expect(generateSpy).toHaveBeenCalledWith("Onboard Test Solution");
    expect(issueComplianceSpy).toHaveBeenCalledWith("123456");
    expect(runComplianceSpy).toHaveBeenCalledTimes(1);
    expect(issueProductionSpy).toHaveBeenCalledWith("compliance-request-id");

    const orderedSteps = Object.keys(capturedChecks) as ZATCAComplianceStep[];
    expect(orderedSteps).toEqual(expectedExecutionOrder);
    expect(seenInvoiceCounters).toEqual([1, 2, 3, 4, 5, 6]);
    expect(seenInvoiceCodeNames).toEqual([
      "0100000",
      "0100000",
      "0100000",
      "0200000",
      "0200000",
      "0200000",
    ]);
    expect(seenInvoiceTypeCodes).toEqual(["383", "388", "381", "383", "388", "381"]);

    const checksByStep = capturedChecks as Record<
      ZATCAComplianceStep,
      ComplianceCheckPayload
    >;
    let expectedPreviousHash = GENESIS_PREVIOUS_INVOICE_HASH;
    for (const step of expectedExecutionOrder) {
      const payload = checksByStep[step];
      const signedXml = payload.signedInvoiceString;
      expect(signedXml).toContain(expectedPreviousHash);
      expectedPreviousHash = payload.invoiceHash;
    }

    const typedResult: OnboardResult = result;
    expect(typedResult.privateKey).toContain("BEGIN EC PRIVATE KEY");
    expect(typedResult.productionCertificate).toContain("BEGIN CERTIFICATE");
    expect(typedResult.productionApiSecret).toBe("production-secret");
    expect(typedResult.nextInvoiceCounter).toBe(7);
    expect(typedResult.lastInvoiceHash).toBe(
      checksByStep["simplified-credit-note-compliant"].invoiceHash
    );
    expect(typedResult.lastInvoiceHash).not.toBe(GENESIS_PREVIOUS_INVOICE_HASH);
  });
});
