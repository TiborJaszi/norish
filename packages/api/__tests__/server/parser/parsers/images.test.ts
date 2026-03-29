// @vitest-environment node
import { describe, expect, it } from "vitest";

import { extractImageCandidates } from "@norish/api/parser/parsers/images";

describe("extractImageCandidates", () => {
  it("filters header, footer, and nav images", () => {
    const html = `
      <html>
        <body>
          <header><img src="/logo.jpg" alt="site logo" width="180" height="50" /></header>
          <nav><img src="/menu.jpg" alt="menu icon" width="40" height="40" /></nav>
          <main>
            <article>
              <img src="/food.jpg" alt="Tomato pasta in bowl" width="1200" height="800" />
            </article>
          </main>
          <footer><img src="/footer.jpg" alt="footer badge" width="80" height="80" /></footer>
        </body>
      </html>
    `;

    const urls = extractImageCandidates(html, "https://example.com/recipes/pasta");

    expect(urls).toContain("https://example.com/food.jpg");
    expect(urls).not.toContain("https://example.com/logo.jpg");
    expect(urls).not.toContain("https://example.com/menu.jpg");
    expect(urls).not.toContain("https://example.com/footer.jpg");
  });

  it("supports lazy attributes and resolves relative urls", () => {
    const html = `
      <html>
        <body>
          <main>
            <article>
              <img data-src="/images/lasagna.jpg" alt="Baked lasagna" width="1024" height="768" />
            </article>
          </main>
        </body>
      </html>
    `;

    const urls = extractImageCandidates(html, "https://example.com/recipes/lasagna");

    expect(urls).toContain("https://example.com/images/lasagna.jpg");
  });

  it("returns only og:image when present, ignoring all img tags", () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://cdn.example.com/social-card.jpg" />
        </head>
        <body>
          <main>
            <img src="/assets/brand-logo.jpg" alt="brand logo" width="300" height="100" />
            <img src="/images/curry.jpg" alt="Spicy curry" width="900" height="650" />
          </main>
        </body>
      </html>
    `;

    const urls = extractImageCandidates(html, "https://example.com");

    // og:image is trusted and returned exclusively — no HTML img candidates added
    expect(urls).toContain("https://cdn.example.com/social-card.jpg");
    expect(urls).toHaveLength(1);
    expect(urls).not.toContain("https://example.com/images/curry.jpg");
    expect(urls).not.toContain("https://example.com/assets/brand-logo.jpg");
  });
});
