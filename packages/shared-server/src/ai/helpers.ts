import * as cheerio from "cheerio";
import { MeasurementSystem } from "@norish/shared/contracts/dto/recipe";

export function normalizeIngredient(i: any, system: MeasurementSystem) {
  return {
    ingredientId: null,
    ingredientName: String(i.ingredientName || "").trim(),
    order: i.order ?? 0,
    amount: i.amount == null ? null : Number(i.amount),
    unit: i.unit ? String(i.unit).trim() : null,
    systemUsed: system,
  };
}

export function normalizeStep(s: any, system: MeasurementSystem) {
  return {
    step: String(s.step || "").trim(),
    order: s.order ?? 0,
    systemUsed: system,
  };
}

function extractJsonIngredients(html: string): string | null {
  // Pattern for double-escaped JSON (e.g. Next.js flight data: \"ingredientName\":\"value\")
  const escapedPattern = /\\"ingredientName\\":\\"([^\\"]+)\\",\\"unitName\\":\\"([^\\"]*)\\",\\"quantityMin\\":([\d.]+|null)/g;
  // Pattern for plain JSON: "ingredientName":"value"
  const plainPattern = /"ingredientName":"([^"]+)","unitName":"([^"]*)","quantityMin":([\d.]+|null)/g;
  const seen = new Map<string, string>();
  for (const pattern of [escapedPattern, plainPattern]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const name = match[1];
      if (!seen.has(name)) {
        const qty = match[3] !== 'null' ? match[3] + ' ' : '';
        const unit = match[2] ? match[2] + ' ' : '';
        seen.set(name, `${qty}${unit}${name}`.trim());
      }
    }
    if (seen.size > 0) break;
  }
  if (seen.size === 0) return null;
  return 'Ingredients\n' + [...seen.values()].join('\n');
}

export function extractSanitizedBody(html: string): string {
  // Extract structured ingredient data from Next.js flight/script JSON (if present)
  const jsonIngredients = extractJsonIngredients(html);

  // Check if input looks like HTML (has tags) or is plain text
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(html);

  if (!hasHtmlTags) {
    // Plain text input - just clean up whitespace and return
    return html.replace(/\s+/g, " ").trim();
  }

  try {
    const $ = cheerio.load(html);
    const $body = $("body");

    if (!$body.length) {
      return html.replace(/\s+/g, " ").trim();
    }

    // Remove obvious non-content
    $body
      .find(
        `
      script,
      style,
      noscript,
      svg,
      iframe,
      canvas,
      link,
      meta,
      header,
      footer,
      nav,
      aside,
      form,
      button,
      input,
      textarea
    `
      )
      .remove();

    const blocks: string[] = [];
    const seen = new Set<string>();

    const push = (text?: string) => {
      if (!text) return;
      const t = text.replace(/\s+/g, " ").trim();

      if (t.length < 2) return;
      if (seen.has(t)) return;

      seen.add(t);
      blocks.push(t);
    };

    // Prefer main/article if present
    const $root = $body.find("main").first().length
      ? $body.find("main").first()
      : $body.find("article").first().length
        ? $body.find("article").first()
        : $body;

    // Title
    const title =
      $root.find('h1[itemprop="name"]').first().text().trim() ||
      $root.find("h1").first().text().trim();

    if (title) push(title);

    // Extract text from standard semantic elements
    $root.find("h2,h3,h4,h5,h6,p,li,dt,dd,figcaption").each((_, el) => {
      push($(el).text());
    });

    // Extract div content with space-aware tag stripping (prevents word mashing)
    $root.find("div").each((_, el) => {
      const text = ($(el).html() ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) push(text);
    });

    const htmlContent = blocks.join("\n");

    // Prepend JSON ingredients if found, so the AI sees clean ingredient data
    // alongside the HTML-extracted steps/instructions
    if (jsonIngredients) {
      return jsonIngredients + "\n\n" + htmlContent;
    }

    return htmlContent;
  } catch {
    return jsonIngredients ?? "";
  }
}
