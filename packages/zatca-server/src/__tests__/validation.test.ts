import { describe, expect, it } from "vitest";
import { EGS } from "../egs/index.js";
import { ZodValidationError } from "../schemas/index.js";
import type { EGSUnitInfo } from "../egs/index.js";

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

describe("validation contracts - zatca-server", () => {
	it("EGS constructor succeeds with valid EGSUnitInfo", () => {
		const egs = new EGS(validEGSUnit);
		expect(egs.get().uuid).toBe(validEGSUnit.uuid);
	});

	it("EGS constructor throws ZodValidationError when uuid is missing", () => {
		const invalid = { ...validEGSUnit, uuid: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("ZodValidationError includes field path for missing uuid", () => {
		const invalid = { ...validEGSUnit, uuid: "" };
		try {
			new EGS(invalid as EGSUnitInfo);
			expect.fail("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			const paths = zodErr.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("uuid"))).toBe(true);
		}
	});

	it("EGS constructor throws ZodValidationError when VAT_number is empty", () => {
		const invalid = { ...validEGSUnit, VAT_number: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("EGS constructor throws ZodValidationError when VAT_name is missing", () => {
		const invalid = { ...validEGSUnit, VAT_name: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("EGS constructor throws ZodValidationError when required field CRN_number is empty", () => {
		const invalid = { ...validEGSUnit, CRN_number: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("ZodValidationError message contains Validation failed prefix", () => {
		const invalid = { ...validEGSUnit, VAT_number: "" };
		try {
			new EGS(invalid as EGSUnitInfo);
			expect.fail("should have thrown");
		} catch (err) {
			const zodErr = err as ZodValidationError;
			expect(zodErr.message).toContain("Validation failed");
			expect(zodErr.name).toBe("ZodValidationError");
		}
	});
});
