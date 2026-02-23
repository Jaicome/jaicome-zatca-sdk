import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ZATCAInvoice } from "@jaicome/zatca-core";
import { describe, expect, it } from "vitest";
import { EGS, type EGSUnitInfo } from "../egs";
import { ZodValidationError } from "../schemas";

const validEGSUnit: EGSUnitInfo = {
	uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
	custom_id: "EGS1",
	model: "IOS",
	CRN_number: "7032256278",
	VAT_name: "Jaicome Information Technology",
	VAT_number: "311497191800003",
	branch_name: "Main",
	branch_industry: "Software",
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

describe("EGS constructor — required field validation", () => {
	it("throws ZodValidationError when uuid is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, uuid: "" })).toThrow(ZodValidationError);
	});

	it("throws ZodValidationError when custom_id is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, custom_id: "" })).toThrow(ZodValidationError);
	});

	it("throws ZodValidationError when model is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, model: "" })).toThrow(ZodValidationError);
	});

	it("throws ZodValidationError when CRN_number is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, CRN_number: "" })).toThrow(ZodValidationError);
	});

	it("throws ZodValidationError when VAT_name is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, VAT_name: "" })).toThrow(ZodValidationError);
	});

	it("throws ZodValidationError when VAT_number is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, VAT_number: "" })).toThrow(ZodValidationError);
	});

	it("throws ZodValidationError when branch_name is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, branch_name: "" })).toThrow(ZodValidationError);
	});

	it("throws ZodValidationError when branch_industry is empty", () => {
		expect(() => new EGS({ ...validEGSUnit, branch_industry: "" })).toThrow(ZodValidationError);
	});

	it("does not throw with valid EGSUnitInfo", () => {
		expect(() => new EGS(validEGSUnit)).not.toThrow();
	});

	it("get() returns the unit info with correct uuid after construction", () => {
		const egs = new EGS(validEGSUnit);
		expect(egs.get().uuid).toBe(validEGSUnit.uuid);
	});

	it("get() returns the unit info with correct VAT_name after construction", () => {
		const egs = new EGS(validEGSUnit);
		expect(egs.get().VAT_name).toBe(validEGSUnit.VAT_name);
	});
});

describe("EGS.get() and set()", () => {
	it("get() returns all required fields from validEGSUnit", () => {
		const egs = new EGS(validEGSUnit);
		const info = egs.get();
		expect(info.uuid).toBe(validEGSUnit.uuid);
		expect(info.VAT_name).toBe(validEGSUnit.VAT_name);
		expect(info.branch_name).toBe(validEGSUnit.branch_name);
		expect(info.branch_industry).toBe(validEGSUnit.branch_industry);
	});

	it("set() updates a field without affecting other fields", () => {
		const egs = new EGS(validEGSUnit);
		egs.set({ VAT_name: "Updated Company Name" });
		expect(egs.get().VAT_name).toBe("Updated Company Name");
		expect(egs.get().uuid).toBe(validEGSUnit.uuid);
		expect(egs.get().branch_name).toBe(validEGSUnit.branch_name);
	});
});

describe("ZodValidationError structure", () => {
	it("has name ZodValidationError, message containing 'Validation failed', and field path in issues for uuid", () => {
		try {
			new EGS({ ...validEGSUnit, uuid: "" });
			expect.fail("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			expect(zodErr.name).toBe("ZodValidationError");
			expect(zodErr.message).toContain("Validation failed");
			const paths = zodErr.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("uuid"))).toBe(true);
		}
	});

	it("ZodValidationError.issues contains field path for VAT_number", () => {
		try {
			new EGS({ ...validEGSUnit, VAT_number: "" });
			expect.fail("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			const paths = zodErr.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("VAT_number"))).toBe(true);
		}
	});
});

describe("EGS.signInvoice() — missing credentials", () => {
	it("throws when no private_key and no certificate are set", () => {
		const egs = new EGS(validEGSUnit);
		expect(() => egs.signInvoice({} as unknown as ZATCAInvoice)).toThrow(
			"EGS is missing a certificate/private key to sign the invoice.",
		);
	});

	it("throws when private_key is set but compliance_certificate is not", () => {
		const egs = new EGS(validEGSUnit);
		egs.set({ private_key: "-----BEGIN EC PRIVATE KEY-----\nfake\n-----END EC PRIVATE KEY-----" });
		expect(() => egs.signInvoice({} as unknown as ZATCAInvoice, false)).toThrow(
			"EGS is missing a certificate/private key to sign the invoice.",
		);
	});

	it("throws when compliance_certificate is set but private_key is not", () => {
		const egs = new EGS(validEGSUnit);
		egs.set({ compliance_certificate: "-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----" });
		expect(() => egs.signInvoice({} as unknown as ZATCAInvoice, false)).toThrow(
			"EGS is missing a certificate/private key to sign the invoice.",
		);
	});
});

describe("EGS API prerequisites — methods that require cert/CSR", () => {
	it("issueComplianceCertificate throws when no CSR available", async () => {
		const egs = new EGS(validEGSUnit);
		await expect(egs.issueComplianceCertificate("123456")).rejects.toThrow(
			"EGS needs to generate a CSR first.",
		);
	});

	it("issueProductionCertificate throws when no compliance certificate", async () => {
		const egs = new EGS(validEGSUnit);
		await expect(egs.issueProductionCertificate("fake-rid")).rejects.toThrow(
			"EGS is missing a certificate/private key/api secret to request a production certificate.",
		);
	});

	it("checkInvoiceCompliance throws when no compliance certificate", async () => {
		const egs = new EGS(validEGSUnit);
		await expect(
			egs.checkInvoiceCompliance("<Invoice></Invoice>", "fakehash"),
		).rejects.toThrow(
			"EGS is missing a certificate/private key/api secret to check the invoice compliance.",
		);
	});

	it("reportInvoice throws when no production certificate", async () => {
		const egs = new EGS(validEGSUnit);
		await expect(egs.reportInvoice("<Invoice></Invoice>", "fakehash")).rejects.toThrow(
			"EGS is missing a certificate/private key/api secret to report the invoice.",
		);
	});

	it("clearanceInvoice throws when no production certificate", async () => {
		const egs = new EGS(validEGSUnit);
		await expect(egs.clearanceInvoice("<Invoice></Invoice>", "fakehash")).rejects.toThrow(
			"EGS is missing a certificate/private key/api secret to report the invoice.",
		);
	});

	it("runComplianceChecksForProduction throws when required steps are missing", async () => {
		const egs = new EGS(validEGSUnit);
		await expect(egs.runComplianceChecksForProduction({})).rejects.toThrow(
			"Missing compliance check payloads",
		);
	});
});

describe("EGS environment selection", () => {
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

describe("CSR production flag behavior", () => {
	it("uses PREZATCA-Code-Signing OID value when production=false", async () => {
		const egs = new EGS(validEGSUnit);
		await egs.generateNewKeysAndCSR(false, "SDK-Test");
		const csr = egs.get().csr;

		expect(typeof csr).toBe("string");
		expect(csr).toContain("BEGIN CERTIFICATE REQUEST");

		const csrText = inspectCsrText(csr as string);
		expect(csrText).toContain("PREZATCA-Code-Signing");
	});

	it("uses ZATCA-Code-Signing OID value when production=true", async () => {
		const egs = new EGS(validEGSUnit);
		await egs.generateNewKeysAndCSR(true, "SDK-Test");
		const csr = egs.get().csr;

		expect(typeof csr).toBe("string");
		expect(csr).toContain("BEGIN CERTIFICATE REQUEST");

		const csrText = inspectCsrText(csr as string);
		expect(csrText).toContain("ZATCA-Code-Signing");
		expect(csrText).not.toContain("PREZATCA-Code-Signing");
	});
});
