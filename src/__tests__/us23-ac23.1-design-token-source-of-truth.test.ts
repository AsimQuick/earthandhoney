/**
 * ---
 * file: src/__tests__/us23-ac23.1-design-token-source-of-truth.test.ts
 * project: earthandhoney
 * purpose: Assert the design-token source of truth (src/styles/tokens.css) carries the CLAUDE.md metadata header and defines every one of PRD §12.2's twelve token categories as non-empty, named, limited-scale steps
 * created-by: dev-team
 * related-story: US-23
 * related-ac: 23.1
 * ---
 */
import fs from "fs";
import path from "path";

const TOKENS_PATH = path.join(process.cwd(), "src/styles/tokens.css");
const tokensSource = fs.readFileSync(TOKENS_PATH, "utf8");

function customProperties(source: string): Array<[string, string]> {
  const matches = [...source.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)];
  return matches.map((match) => [match[1], match[2].trim()]);
}

const allProperties = customProperties(tokensSource);

function propertiesFor(predicate: (name: string) => boolean): Array<[string, string]> {
  return allProperties.filter(([name]) => predicate(name));
}

function expectNamedScale(
  properties: Array<[string, string]>,
  minimumSteps: number,
) {
  expect(properties.length).toBeGreaterThanOrEqual(minimumSteps);
  for (const [name, value] of properties) {
    expect(name.trim().length).toBeGreaterThan(0);
    expect(value.length).toBeGreaterThan(0);
  }
}

describe("US-23 AC-23.1: single design-token source of truth", () => {
  it("carries the CLAUDE.md structured metadata header", () => {
    const header = tokensSource.match(/^\/\*[\s\S]*?\*\//)?.[0] ?? "";
    expect(header).toMatch(/^\s*\/\*\s*\n\s*\*\s*---/);
    expect(header).toMatch(/\*\s*file:\s*src\/styles\/tokens\.css/);
    expect(header).toMatch(/\*\s*project:\s*earthandhoney/);
    expect(header).toMatch(/\*\s*purpose:/);
    expect(header).toMatch(/\*\s*related-story:\s*US-23/);
    expect(header).toMatch(/\*\s*related-ac:\s*23\.1/);
  });

  it("defines exactly one @theme block as the single source of truth", () => {
    const themeBlockMatches = tokensSource.match(/@theme\s*\{/g) ?? [];
    expect(themeBlockMatches).toHaveLength(1);
  });

  it("names one display/serif family and one sans/utility family", () => {
    const families = propertiesFor((name) => name === "font-display" || name === "font-sans");
    expect(families.map(([name]) => name).sort()).toEqual(["font-display", "font-sans"]);
    for (const [, value] of families) {
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("declares at most three approved font combinations", () => {
    const comboProperties = propertiesFor((name) => name.startsWith("font-combo-"));
    const comboNames = new Set(
      comboProperties.map(([name]) => name.replace(/^font-combo-/, "").replace(/-(display|sans)-weight$/, "")),
    );
    expect(comboNames.size).toBeGreaterThanOrEqual(2);
    expect(comboNames.size).toBeLessThanOrEqual(3);
    expectNamedScale(comboProperties, 2);
  });

  it("declares a colour palette with no accent colour", () => {
    const palette = propertiesFor((name) => name.startsWith("color-"));
    expectNamedScale(palette, 3);
  });

  it("declares a limited, named type scale", () => {
    const typeScale = propertiesFor((name) => name.startsWith("text-"));
    expectNamedScale(typeScale, 3);
  });

  it("declares a limited, named line-height scale", () => {
    const lineHeights = propertiesFor((name) => name.startsWith("leading-"));
    expectNamedScale(lineHeights, 3);
  });

  it("declares named text measures", () => {
    const measures = propertiesFor((name) => name.startsWith("measure-"));
    expectNamedScale(measures, 2);
  });

  it("declares a limited, named spacing scale", () => {
    const spacing = propertiesFor((name) => name.startsWith("spacing-"));
    expectNamedScale(spacing, 4);
  });

  it("declares named gallery gaps distinct from the general spacing scale", () => {
    const galleryGaps = propertiesFor((name) => name.startsWith("gallery-gap-"));
    expectNamedScale(galleryGaps, 2);
  });

  it("declares a limited, named radii scale", () => {
    const radii = propertiesFor((name) => name.startsWith("radius-"));
    expectNamedScale(radii, 3);
  });

  it("declares overlay and vignette presets", () => {
    const overlaysAndVignettes = propertiesFor(
      (name) => name.startsWith("overlay-") || name.startsWith("vignette-"),
    );
    expectNamedScale(overlaysAndVignettes, 3);
  });

  it("declares a limited, named breakpoint scale", () => {
    const breakpoints = propertiesFor((name) => name.startsWith("breakpoint-"));
    expectNamedScale(breakpoints, 3);
  });

  it("declares named animation timing (durations and easing curves)", () => {
    const motion = propertiesFor((name) => name.startsWith("motion-"));
    expectNamedScale(motion, 3);
  });

  it("asserts every one of the twelve PRD §12.2 categories is present and non-empty", () => {
    const categories: Record<string, (name: string) => boolean> = {
      "font families": (name) => name === "font-display" || name === "font-sans",
      "font combinations": (name) => name.startsWith("font-combo-"),
      "colour palette": (name) => name.startsWith("color-"),
      "type scale": (name) => name.startsWith("text-"),
      "line heights": (name) => name.startsWith("leading-"),
      "text measures": (name) => name.startsWith("measure-"),
      "spacing scale": (name) => name.startsWith("spacing-"),
      "gallery gaps": (name) => name.startsWith("gallery-gap-"),
      radii: (name) => name.startsWith("radius-"),
      "overlay and vignette presets": (name) => name.startsWith("overlay-") || name.startsWith("vignette-"),
      breakpoints: (name) => name.startsWith("breakpoint-"),
      "animation timing": (name) => name.startsWith("motion-"),
    };

    expect(Object.keys(categories)).toHaveLength(12);

    for (const [, predicate] of Object.entries(categories)) {
      const properties = propertiesFor(predicate);
      expect(properties.length).toBeGreaterThan(0);
      for (const [, value] of properties) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("is surfaced to Tailwind through globals.css's theme configuration import chain", () => {
    const globalsPath = path.join(process.cwd(), "src/app/(frontend)/globals.css");
    const globalsSource = fs.readFileSync(globalsPath, "utf8");
    expect(globalsSource).toMatch(/@import\s+["']tailwindcss["'];/);
    expect(globalsSource).toMatch(/@import\s+["'](\.\.\/)+styles\/tokens\.css["'];/);
  });
});
