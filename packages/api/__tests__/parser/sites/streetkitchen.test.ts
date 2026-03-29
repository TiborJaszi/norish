import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import {
  extractIngredientStrings,
  extractStepsFromHtml,
  isStreetKitchenUrl,
} from "@norish/api/parser/sites/streetkitchen";

const FIXTURE_HTML = fs.readFileSync(
  path.join(__dirname, "streetkitchen-tejszines-gombas-csirke.html"),
  "utf8"
);

// ---------------------------------------------------------------------------
// URL detection
// ---------------------------------------------------------------------------

describe("isStreetKitchenUrl", () => {
  it("matches streetkitchen.hu URLs", () => {
    expect(isStreetKitchenUrl("https://streetkitchen.hu/receptek/foo")).toBe(true);
    expect(isStreetKitchenUrl("https://www.streetkitchen.hu/receptek/foo")).toBe(true);
  });

  it("does not match other domains", () => {
    expect(isStreetKitchenUrl("https://nosalty.hu/recept/foo")).toBe(false);
    expect(isStreetKitchenUrl("https://example.com")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ingredient extraction
// ---------------------------------------------------------------------------

describe("extractIngredientStrings – tejszínes-gombás-csirke", () => {
  let ingredients: string[];

  beforeEach(() => {
    ingredients = extractIngredientStrings(FIXTURE_HTML);
  });

  it("extracts all 11 ingredients", () => {
    expect(ingredients).toHaveLength(11);
  });

  it("includes numeric quantities", () => {
    expect(ingredients).toContain("1 kg csiperkegomba");
    expect(ingredients).toContain("500 ml tejszín");
    expect(ingredients).toContain("0.5 db citrom");
    expect(ingredients).toContain("3 ek olaj");
  });

  it("includes null-quantity ingredients without amount prefix", () => {
    expect(ingredients).toContain("só, bors");
    expect(ingredients).toContain("főtt rizs a tálaláshoz");
  });

  it("does not contain raw HTML or JSON artifacts", () => {
    for (const ing of ingredients) {
      expect(ing).not.toMatch(/<[^>]+>/); // no HTML tags
      expect(ing).not.toMatch(/\\"/); // no escaped quotes
    }
  });
});

// ---------------------------------------------------------------------------
// Step extraction
// ---------------------------------------------------------------------------

describe("extractStepsFromHtml – tejszínes-gombás-csirke", () => {
  let steps: string[];

  beforeEach(() => {
    const $ = cheerio.load(FIXTURE_HTML);
    steps = extractStepsFromHtml($);
  });

  it("extracts exactly 4 steps", () => {
    expect(steps).toHaveLength(4);
  });

  it("includes the intro paragraph", () => {
    expect(steps[0]).toContain("A tejszínes gombás csirke receptekben");
  });

  it("includes the section heading", () => {
    expect(steps[1]).toBe("Tejszínes csirkemell gombával:");
  });

  it("includes both preparation paragraphs", () => {
    expect(steps[2]).toContain("A gombát 2-3 mm vastagra felszeleteljük");
    expect(steps[3]).toContain("Ha üvegesre pirult, felöntjük a tejszínnel");
  });

  it("does not include the related-recipes CTA heading", () => {
    const cta = steps.find((s) => s.includes("További isteni"));
    expect(cta).toBeUndefined();
  });

  it("does not include linked related-recipe titles", () => {
    expect(steps.find((s) => s.includes("Citromos csirkemell"))).toBeUndefined();
    expect(steps.find((s) => s.includes("Csirkés-gombás"))).toBeUndefined();
  });

  it("does not include the domain name or social CTAs", () => {
    expect(steps.find((s) => s.includes("www.streetkitchen"))).toBeUndefined();
    expect(steps.find((s) => s.includes("lájkolj"))).toBeUndefined();
    expect(steps.find((s) => s.includes("kövessetek"))).toBeUndefined();
  });

  it("does not include duplicate entries", () => {
    const unique = new Set(steps);
    expect(unique.size).toBe(steps.length);
  });
});
