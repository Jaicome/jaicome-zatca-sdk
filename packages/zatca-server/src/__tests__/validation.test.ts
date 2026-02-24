import { describe, expect, it } from "vitest";
import { EGS } from "../egs/index.js";
import { ZodValidationError } from "../schemas/index.js";
import type { EGSInfo } from "../egs/index.js";

const validEGSUnit: EGSInfo = {
	id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
	name: "EGS1",
	model: "IOS",
	vatName: "Jaicome Information Technology",
	vatNumber: "311497191800003",
	branchName: "Main",
	branchIndustry: "Software",
};

describe("validation contracts - zatca-server", () => {
	it("EGS constructor succeeds with valid EGSUnitInfo", () => {
		const egs = new EGS(validEGSUnit);
		expect(egs.getInfo().id).toBe(validEGSUnit.id);
	});

	it("EGS constructor throws ZodValidationError when uuid is missing", () => {
		const invalid = { ...validEGSUnit, id: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("ZodValidationError includes field path for missing uuid", () => {
		const invalid = { ...validEGSUnit, id: "" };
		try {
			new EGS(invalid as EGSUnitInfo);
			throw new Error("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodValidationError);
			const zodErr = err as ZodValidationError;
			const paths = zodErr.issues.map((i) => i.path.join("."));
			expect(paths.some((p) => p.includes("id"))).toBe(true);
		}
	});

	it("EGS constructor throws ZodValidationError when VAT_number is empty", () => {
		const invalid = { ...validEGSUnit, vatNumber: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("EGS constructor throws ZodValidationError when VAT_name is missing", () => {
		const invalid = { ...validEGSUnit, vatName: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("EGS constructor throws ZodValidationError when required field name is empty", () => {
		const invalid = { ...validEGSUnit, name: "" };
		expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
	});

	it("ZodValidationError message contains Validation failed prefix", () => {
		const invalid = { ...validEGSUnit, vatNumber: "" };
		try {
			new EGS(invalid as EGSUnitInfo);
			throw new Error("should have thrown");
		} catch (err) {
			const zodErr = err as ZodValidationError;
			expect(zodErr.message).toContain("Validation failed");
			expect(zodErr.name).toBe("ZodValidationError");
		}
	});
});
