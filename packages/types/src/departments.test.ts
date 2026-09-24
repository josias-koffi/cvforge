import { describe, expect, it } from "vitest";
import {
  departmentLabel,
  frenchDepartments,
  isFrenchDepartment,
} from "./departments";

describe("frenchDepartments", () => {
  it("lists every department once, in code order", () => {
    const codes = frenchDepartments.map((department) => department.code);

    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
    expect(codes).toContain("2A");
    expect(codes).toContain("974");
  });

  it("agrees with the label lookup", () => {
    for (const { code, label } of frenchDepartments) {
      expect(departmentLabel(code)).toBe(label);
    }
  });
});

describe("isFrenchDepartment", () => {
  it.each(["44", "2B", "971"])("knows %s", (code) => {
    expect(isFrenchDepartment(code)).toBe(true);
  });

  it.each(["", "750", "20", "toString"])("refuses %j", (code) => {
    expect(isFrenchDepartment(code)).toBe(false);
  });
});
