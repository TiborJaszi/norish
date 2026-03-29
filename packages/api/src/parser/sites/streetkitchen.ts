/**
 * Site-specific parser for streetkitchen.hu
 *
 * streetkitchen.hu is a Next.js app that ships recipe data via RSC flight
 * payloads (`self.__next_f.push`). The page's own JSON-LD schema intentionally
 * omits `recipeIngredient` and `recipeInstructions`, so the generic JSON-LD
 * parser always fails and falls back to AI.
 *
 * This parser extracts the structured data directly from the flight payloads
 * and converts it to a normalised recipe — no AI needed.
 */

import * as cheerio from "cheerio";

import type { FullRecipeInsertDTO } from "@norish/shared/contracts/dto/recipe";

import { normalizeRecipeFromJson } from "../normalize";

export function isStreetKitchenUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("streetkitchen.hu");
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ingredient extraction
// ---------------------------------------------------------------------------

/**
 * Extract ingredients from the double-escaped JSON inside `__next_f.push`
 * flight payloads. Returns formatted strings like "1 kg csiperkegomba" that
 * the shared `parseIngredientWithDefaults` helper can re-parse.
 */
export function extractIngredientStrings(html: string): string[] {
  const escapedPattern =
    /\\"ingredientName\\":\\"([^\\"]+)\\",\\"unitName\\":\\"([^\\"]*)\\",\\"quantityMin\\":([\d.]+|null)/g;

  const results: string[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;

  while ((match = escapedPattern.exec(html)) !== null) {
    const name = match[1];

    if (seen.has(name)) continue;

    seen.add(name);

    const qty = match[3] !== "null" ? match[3] + " " : "";
    const unit = match[2] ? match[2] + " " : "";

    results.push(`${qty}${unit}${name}`.trim());
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step extraction
// ---------------------------------------------------------------------------

/**
 * Extract the recipe preparation HTML directly from the Next.js RSC flight
 * payload, bypassing the fully-rendered page DOM (which includes related
 * article teasers, social CTAs, etc.).
 *
 * Strategy:
 * 1. Find the RSC reference ID assigned to `htmlContent` in the recipe object.
 *    In the double-escaped JSON it looks like: \"htmlContent\":\"$2e\"
 * 2. Locate the RSC text-blob push that defines that reference.
 *    Format: self.__next_f.push([1,"<refId>:T<hexLen>,<jsonEscapedHtml>"])
 * 3. JSON-decode the escaped string to recover the actual HTML.
 * 4. Parse with cheerio and return paragraph/heading texts.
 */
function extractStepsFromRSC(html: string): string[] {
  // Step 1: find the RSC reference ID for htmlContent
  const refMatch = html.match(/\\"htmlContent\\":\\"\\$([0-9a-f]+)\\"/);
  if (!refMatch) return [];
  const refId = refMatch[1];

  // Step 2: find the blob push that defines this reference
  // The raw HTML contains:  self.__next_f.push([1,"2e:Tff3,<jsonEscaped>"])
  const blobRegex = new RegExp(
    String.raw`self\.__next_f\.push\(\[1,"${refId}:T[0-9a-f]+,((?:[^"\\]|\\.)*)"\]\)`
  );
  const blobMatch = blobRegex.exec(html);
  if (!blobMatch) return [];

  // Step 3: JSON-decode the escaped content
  let htmlContent: string;
  try {
    htmlContent = JSON.parse('"' + blobMatch[1] + '"');
  } catch {
    return [];
  }

  // Step 4: extract step text from the HTML
  const $steps = cheerio.load(htmlContent);
  const steps: string[] = [];
  const seen = new Set<string>();

  $steps("p, h3, h4").each((_, el) => {
    // Skip elements that are just links to related recipes / external pages
    if ($steps(el).find("a").length > 0) return;

    const text = $steps(el).text().replace(/\s+/g, " ").trim();

    if (text.length < 20 || seen.has(text)) return;
    // Skip domain references and social CTAs
    if (text.includes("www.") || text.includes("lájkolj") || text.includes("kövessetek")) return;

    seen.add(text);
    steps.push(text);
  });

  return steps;
}

/**
 * Extract steps from the rendered page DOM.
 *
 * streetkitchen.hu renders preparation steps inside
 * `<article class="recipe-preparation">` — a semantic element that does NOT
 * contain the ingredients list, sidebar links, related articles, or social CTAs.
 * We target it directly instead of scraping all of `<main>`.
 *
 * Within the article, any `<p>` that contains a hyperlink is a cross-promotion
 * or CTA (e.g. "További gombás receptek..."), not an actual step — skip those.
 */
export function extractStepsFromHtml($: cheerio.CheerioAPI): string[] {
  const steps: string[] = [];
  const seen = new Set<string>();

  // Primary: the specific preparation article
  const $root = $("article.recipe-preparation").first().length
    ? $("article.recipe-preparation").first()
    : $("main").first().length
      ? $("main").first()
      : $("body");

  $root.find("p, h3, h4").each((_, el) => {
    const $el = $(el);

    // Skip paragraphs that are just links to related recipes / CTAs
    if ($el.find("a").length > 0) return;

    // Skip headings that introduce a related-recipes block:
    // their immediate next sibling is a link-only paragraph
    const tagName = ((el as { tagName?: string }).tagName ?? "").toLowerCase();
    if ((tagName === "h3" || tagName === "h4") && $el.next().find("a").length > 0) return;

    const text = $el.text().replace(/\s+/g, " ").trim();

    if (text.length < 20 || seen.has(text)) return;

    seen.add(text);
    steps.push(text);
  });

  return steps;
}

// ---------------------------------------------------------------------------
// Numeric field extraction helpers
// ---------------------------------------------------------------------------

function extractServings(html: string): number | undefined {
  const match = html.match(/\\"basePortion\\":(\d+)/);

  return match ? parseInt(match[1], 10) : undefined;
}

function extractMinutes(html: string, fieldName: string): number | undefined {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\\\"${escaped}\\\\":(\\d+)`);
  const match = html.match(regex);
  const minutes = match ? parseInt(match[1], 10) : 0;

  return minutes > 0 ? minutes : undefined;
}

function toIsoDuration(minutes: number): string {
  return `PT${minutes}M`;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Attempt to extract a recipe from a streetkitchen.hu page.
 *
 * Returns `null` if:
 * - The URL is not streetkitchen.hu
 * - No ingredients could be found in the flight data
 *
 * Otherwise returns a fully normalised `FullRecipeInsertDTO` (image downloaded,
 * ingredients and steps parsed) without any AI involvement.
 */
export async function tryExtractRecipeFromStreetKitchen(
  url: string,
  html: string,
  recipeId: string
): Promise<FullRecipeInsertDTO | null> {
  if (!isStreetKitchenUrl(url)) return null;

  const $ = cheerio.load(html);

  // -- Title --
  // og:title often has a " recept" suffix; strip it for a cleaner name.
  const ogTitle = ($('meta[property="og:title"]').attr("content") ?? "").replace(
    /\s+recept\s*$/i,
    ""
  );
  const name = ogTitle.trim() || $("h1").first().text().trim();

  if (!name) return null;

  // -- Description --
  const description =
    $('meta[property="og:description"]').attr("content") ??
    $('meta[name="description"]').attr("content") ??
    undefined;

  // -- Image --
  const ogImage = $('meta[property="og:image"]').attr("content") ?? undefined;

  // -- Servings & times from flight data --
  const servings = extractServings(html);
  const prepMinutes = extractMinutes(html, "preparationTime");
  const cookMinutes = extractMinutes(html, "cookingTime");

  // -- Ingredients --
  const ingredientStrings = extractIngredientStrings(html);

  if (ingredientStrings.length === 0) {
    // No structured data found — let the generic parsers handle it
    return null;
  }

  // -- Steps: DOM approach with stop-marker is most reliable since the
  //    "Bevásárlólistához adás" button cleanly separates recipe content
  //    from unrelated page content. RSC blob is used as fallback.
  const domSteps = extractStepsFromHtml($);
  const stepStrings = domSteps.length > 0 ? domSteps : extractStepsFromRSC(html);

  // -- Assemble a synthetic JSON-LD Recipe node --
  const jsonLdNode: Record<string, unknown> = {
    "@type": "Recipe",
    name,
    description,
    image: ogImage,
    recipeYield: servings,
    recipeIngredient: ingredientStrings,
    recipeInstructions: stepStrings,
    ...(prepMinutes ? { prepTime: toIsoDuration(prepMinutes) } : {}),
    ...(cookMinutes ? { cookTime: toIsoDuration(cookMinutes) } : {}),
  };

  const recipe = await normalizeRecipeFromJson(jsonLdNode, recipeId);

  if (!recipe) return null;

  // Preserve the source URL (normalizeRecipeFromJson always sets url: "")
  return { ...recipe, url };
}
