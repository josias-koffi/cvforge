import { emptySearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { poolDepartments } from "./job-digest.selection";

describe("poolDepartments", () => {
  it("reads every department a radius reaches", () => {
    const project = {
      ...emptySearchProject("profile-1"),
      locations: [
        {
          department: "75",
          inseeCode: "75056",
          label: "Paris",
          latitude: 48.8589,
          longitude: 2.347,
          radiusKm: 25,
        },
        {
          department: "59",
          inseeCode: "",
          label: "Nord",
          latitude: null,
          longitude: null,
          radiusKm: 25,
        },
      ],
    };

    expect(poolDepartments(project)).toEqual(
      expect.arrayContaining(["75", "92", "93", "94", "59"]),
    );
    expect(poolDepartments(project)).not.toContain("13");
  });

  it("reads nothing without a location", () => {
    expect(poolDepartments(emptySearchProject("profile-1"))).toEqual([]);
  });
});
