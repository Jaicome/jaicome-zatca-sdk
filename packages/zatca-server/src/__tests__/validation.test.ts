import { EGS } from "../egs/index.js";
import type { EGSInfo } from "../egs/index.js";
import { ZodValidationError } from "../schemas/index.js";

const validEGSUnit: EGSInfo = {
  branchIndustry: "Software",
  branchName: "Main",
  id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  model: "IOS",
  name: "EGS1",
  vatName: "Jaicome Information Technology",
  vatNumber: "311497191800003",
};

describe("validation contracts - zatca-server", () => {
  it("eGS constructor succeeds with valid EGSUnitInfo", () => {
    const egs = new EGS(validEGSUnit);
    expect(egs.getInfo().id).toBe(validEGSUnit.id);
  });

  it("eGS constructor throws ZodValidationError when uuid is missing", () => {
    const invalid = { ...validEGSUnit, id: "" };
    expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
  });

  it("zodValidationError includes field path for missing uuid", () => {
    const invalid = { ...validEGSUnit, id: "" };
    try {
      new EGS(invalid as EGSUnitInfo);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("id"))).toBeTruthy();
    }
  });

  it("eGS constructor throws ZodValidationError when VAT_number is empty", () => {
    const invalid = { ...validEGSUnit, vatNumber: "" };
    expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
  });

  it("eGS constructor throws ZodValidationError when VAT_name is missing", () => {
    const invalid = { ...validEGSUnit, vatName: "" };
    expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
  });

  it("eGS constructor throws ZodValidationError when required field name is empty", () => {
    const invalid = { ...validEGSUnit, name: "" };
    expect(() => new EGS(invalid as EGSUnitInfo)).toThrow(ZodValidationError);
  });

  it("zodValidationError message contains Validation failed prefix", () => {
    const invalid = { ...validEGSUnit, vatNumber: "" };
    try {
      new EGS(invalid as EGSUnitInfo);
      throw new Error("should have thrown");
    } catch (error) {
      const zodErr = error as ZodValidationError;
      expect(zodErr.message).toContain("Validation failed");
      expect(zodErr.name).toBe("ZodValidationError");
    }
  });
});
