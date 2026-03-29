import { describe, expect, it } from "vitest";

import { extractSanitizedBody } from "@norish/shared-server/ai/helpers";

// @vitest-environment node

// Minimal HTML fixture that replicates what streetkitchen.hu serves:
// Next.js flight data with double-escaped JSON inside a <script> tag.
// The key pattern is: \"ingredientName\":\"value\",\"unitName\":\"unit\",\"quantityMin\":N
const STREETKITCHEN_FIXTURE = String.raw`<!DOCTYPE html>
<html lang="hu">
<head><title>Tejszínes gombás csirke</title></head>
<body>
<h1>Tejszínes gombás csirke</h1>
<script>self.__next_f.push([1,"[{\"id\":\"yUNhqGV0VTzrqdem\",\"title\":\"Tejszínes gombás csirke\",\"ingredients\":[{\"isSponsored\":false},\"ingredientName\":\"csiperkegomba\",\"unitName\":\"kg\",\"quantityMin\":1,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"egész csirkemell\",\"unitName\":\"db\",\"quantityMin\":1,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"só, bors\",\"unitName\":\"\",\"quantityMin\":null,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"olaj\",\"unitName\":\"ek\",\"quantityMin\":3,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"vöröshagyma\",\"unitName\":\"fej\",\"quantityMin\":1,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"fokhagyma\",\"unitName\":\"gerezd\",\"quantityMin\":2,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"kakukkfű\",\"unitName\":\"tk\",\"quantityMin\":1,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"tejszín\",\"unitName\":\"ml\",\"quantityMin\":500,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"citrom\",\"unitName\":\"db\",\"quantityMin\":0.5,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"friss petrezselyem\",\"unitName\":\"csokor\",\"quantityMin\":1,\"recipeId\":\"yUNhqGV0VTzrqdem\"},{\"isSponsored\":false},\"ingredientName\":\"főtt rizs a tálaláshoz\",\"unitName\":\"\",\"quantityMin\":null,\"recipeId\":\"yUNhqGV0VTzrqdem\"}]}]"])</script>
</body>
</html>`;

describe("extractSanitizedBody — streetkitchen.hu (Next.js flight data)", () => {
  it("extracts all 11 ingredients via structured JSON (early return path)", () => {
    const result = extractSanitizedBody(STREETKITCHEN_FIXTURE);

    expect(result).toMatch(/^Ingredients\n/);

    const expectedIngredients = [
      "csiperkegomba",
      "egész csirkemell",
      "só, bors",
      "olaj",
      "vöröshagyma",
      "fokhagyma",
      "kakukkfű",
      "tejszín",
      "citrom",
      "friss petrezselyem",
      "főtt rizs a tálaláshoz",
    ];

    for (const ingredient of expectedIngredients) {
      expect(result).toContain(ingredient);
    }
  });

  it("includes quantities and units in the output", () => {
    const result = extractSanitizedBody(STREETKITCHEN_FIXTURE);

    // Spot-check a few quantity+unit+name combinations
    expect(result).toContain("1 kg csiperkegomba");
    expect(result).toContain("500 ml tejszín");
    expect(result).toContain("3 ek olaj");
    expect(result).toContain("0.5 db citrom");
  });

  it("handles null quantityMin (no prefix for those ingredients)", () => {
    const result = extractSanitizedBody(STREETKITCHEN_FIXTURE);

    // Ingredients with null quantityMin should appear without a numeric prefix
    const lines = result.split("\n");
    const soBors = lines.find((l) => l.includes("só, bors"));
    expect(soBors).toBeDefined();
    expect(soBors).not.toMatch(/^\d/);
  });

  it("does not return raw HTML or script tags to the AI", () => {
    const result = extractSanitizedBody(STREETKITCHEN_FIXTURE);

    expect(result).not.toContain("<script");
    expect(result).not.toContain("__next_f");
    expect(result).not.toContain("recipeId");
  });
});
