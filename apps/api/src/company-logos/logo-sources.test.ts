import { describe, expect, it } from "vitest";
import { commonsThumbnailUrl, isAllowedLogoUrl } from "./logo-sources";

describe("isAllowedLogoUrl", () => {
  it("lets through France Travail's logos and Commons thumbnails only", () => {
    expect(
      isAllowedLogoUrl(
        "https://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise/MV3d7KZ8",
      ),
    ).toBe(true);
    expect(
      isAllowedLogoUrl(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Logo_OVH.svg/120px-Logo_OVH.svg.png",
      ),
    ).toBe(true);

    expect(
      isAllowedLogoUrl("https://api.francetravail.fr/partenaire/offres"),
    ).toBe(false);
    expect(
      isAllowedLogoUrl(
        "http://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise/x",
      ),
    ).toBe(false);
    expect(
      isAllowedLogoUrl(
        "https://evil.example/exp-rechercheoffre/v1/logo-entreprise/x",
      ),
    ).toBe(false);
    expect(isAllowedLogoUrl("http://169.254.169.254/latest/meta-data")).toBe(
      false,
    );
    expect(isAllowedLogoUrl("not a url")).toBe(false);
  });

  it("is not fooled by a path climbing out of the allowed prefix", () => {
    expect(
      isAllowedLogoUrl(
        "https://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise/../../../partenaire/x",
      ),
    ).toBe(false);
    expect(
      isAllowedLogoUrl(
        "https://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise@evil.example/x",
      ),
    ).toBe(false);
  });
});

describe("commonsThumbnailUrl", () => {
  it("builds Commons' own thumbnail path, a PNG even for an SVG", () => {
    // The URL checked live on 2026-09-24: 200, image/png, 2 KB.
    expect(commonsThumbnailUrl("Logo OVH.svg")).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Logo_OVH.svg/120px-Logo_OVH.svg.png",
    );
  });

  it("keeps a raster file's own extension, and refuses a path", () => {
    expect(commonsThumbnailUrl("A.png")).toMatch(/\/120px-A\.png$/);
    expect(commonsThumbnailUrl("a/../b.png")).toBeNull();
    expect(commonsThumbnailUrl("  ")).toBeNull();
  });
});
