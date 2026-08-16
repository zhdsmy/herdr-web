import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const webRoot = dirname(sourceRoot);

function readWebFile(...pathSegments: string[]) {
  return readFileSync(join(webRoot, ...pathSegments), "utf8");
}

const productionSourceFiles = readdirSync(sourceRoot)
  .filter((file) => /\.(?:ts|tsx)$/u.test(file) && !/\.test\.(?:ts|tsx)$/u.test(file))
  .sort();
const productionSource = productionSourceFiles
  .map((file) => readFileSync(join(sourceRoot, file), "utf8"))
  .join("\n");
const baseCss = readWebFile("src", "styles.css");
const themeCss = readWebFile("src", "animal-island-theme.css");

function cssClasses(css: string) {
  return new Set(Array.from(css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/gu), (match) => match[1]));
}

function sourceClasses(source: string) {
  const classes = new Set<string>();
  const addLiteral = (literal: string) => {
    for (const className of literal.split(/\s+/u)) {
      if (/^[a-zA-Z][a-zA-Z0-9_-]*$/u.test(className)) {
        classes.add(className);
      }
    }
  };

  for (const match of source.matchAll(/className\s*=\s*(["'`])([\s\S]*?)\1/gu)) {
    addLiteral(match[2]);
  }
  for (const expression of source.matchAll(/className\s*=\s*\{[\s\S]*?\}/gu)) {
    for (const literal of expression[0].matchAll(
      /["'`]([a-zA-Z][a-zA-Z0-9_-]*(?:\s+[a-zA-Z][a-zA-Z0-9_-]*)*)["'`]/gu,
    )) {
      addLiteral(literal[1]);
    }
  }

  return classes;
}

// These classes only provide layout, inherit from a themed parent/composed class, or stay hidden.
const inheritedOrStructuralClasses = new Set([
  "backend-color-actions",
  "backend-row-main",
  "brand-title",
  "bridge-chip-label",
  "host-scope",
  "note-editor-actions",
  "note-editor-toolbar-left",
  "notes-list-item-body",
  "notes-shell",
  "overlay-root",
  "pane-body",
  "pane-note-tab-new",
  "pane-title",
  "quick-note-expand",
  "quick-note-modal",
  "settings-slider-control",
  "settings-value-control",
  "space-body",
  "space-reorder-controls",
  "sr-only",
  "tab-line",
  "tab-split",
  "tabgrp",
  "term-key-icon",
  "terminal-file-input",
  "terminal-selection-actions",
]);

describe("Animal Island theme contract", () => {
  it("pins and imports the official package once", () => {
    const packageJson = JSON.parse(readWebFile("package.json")) as {
      dependencies: Record<string, string>;
    };
    const packageLock = JSON.parse(readWebFile("package-lock.json")) as {
      packages: Record<string, { version?: string }>;
    };

    expect(packageJson.dependencies["@fontsource-variable/noto-sans-mono"]).toBe("5.3.0");
    expect(packageJson.dependencies["animal-island-ui"]).toBe("1.6.0");
    expect(packageLock.packages["node_modules/@fontsource-variable/noto-sans-mono"]?.version).toBe(
      "5.3.0",
    );
    expect(packageLock.packages["node_modules/animal-island-ui"]?.version).toBe("1.6.0");
    expect(
      productionSource.match(/import\s+["']@fontsource-variable\/noto-sans-mono["']/gu),
    ).toHaveLength(1);
    expect(productionSource.match(/import\s+["']animal-island-ui\/style["']/gu)).toHaveLength(1);
  });

  it("uses official components on canonical app surfaces", () => {
    for (const component of ["Cursor", "Title", "Button", "Switch"]) {
      expect(productionSource).toMatch(new RegExp(`<${component}\\b`, "u"));
    }

    const checkedSwitchRule = themeCss.match(
      /\.backend-toggle\[aria-checked="true"\]\s*>\s*span:first-child\s*\{([^}]*)\}/u,
    );
    expect(checkedSwitchRule?.[1]).toContain("transform: translateY(-50%);");
  });

  it("keeps the bundled UI fonts and self-hosted matching terminal typography", () => {
    const terminalRenderer = readWebFile("src", "terminalRenderer.ts");
    const compactThemeCss = themeCss.replace(/\s+/gu, " ");
    const compactTerminalRenderer = terminalRenderer.replace(/\s+/gu, " ");
    const monoStack =
      '"Noto Sans Mono Variable", "SF Mono", "Fira Code", "Cascadia Code", "SFMono-Regular", Consolas, "Noto Sans SC", "PingFang SC", monospace';

    expect(compactThemeCss).toContain(
      '--animal-font: var(--animal-font-family), "Nunito", "Noto Sans SC", "PingFang SC",',
    );
    expect(compactThemeCss).toContain(`--animal-mono: ${monoStack};`);
    expect(compactTerminalRenderer).toContain(`const TERMINAL_FONT_FAMILY = '${monoStack}';`);
    expect(themeCss).toContain("--animal-terminal-bg: #fffaf0;");
    expect(terminalRenderer).toContain('const TERMINAL_BACKGROUND = "#fffaf0";');
    expect(terminalRenderer).toContain('foreground: "#5b452f"');
    expect(terminalRenderer).toContain('cursor: "#19c8b9"');
    expect(terminalRenderer).toContain('selectionBackground: "#bfe9e4"');
  });

  it("keeps compact terminal and settings controls readable without nested clipping", () => {
    const compactBaseCss = baseCss.replace(/\s+/gu, " ");
    const compactThemeCss = themeCss.replace(/\s+/gu, " ");
    const desktopThemeCss = themeCss.slice(0, themeCss.indexOf("@media (max-width: 760px)"));
    const compactDesktopThemeCss = desktopThemeCss.replace(/\s+/gu, " ");

    expect(compactThemeCss).toContain(
      ".term-stage-command:disabled { border-color: var(--animal-border-color);",
    );
    expect(compactDesktopThemeCss).toContain(
      ".tabbar { gap: 6px; min-height: 46px; padding: 5px 8px; border-bottom: 0; background: var(--animal-primary-color); }",
    );
    expect(compactDesktopThemeCss).toContain(
      ".tabbar-scroll { gap: 5px; background: transparent; box-shadow: none; }",
    );
    expect(compactDesktopThemeCss).toContain(
      ".sb-head, .stage-bar, .notes-head { color: #fffef5; background: var(--animal-primary-color); }",
    );
    expect(compactBaseCss).toContain(
      ".terminal-host .ghostty-hidden-input.ghostty-keyboard-input { left: 1px !important; top: 1px !important; opacity: 0.01 !important; clip-path: none !important; pointer-events: none !important; z-index: 0 !important; }",
    );
    expect(compactThemeCss).toContain(
      ".backend-list { max-height: none; overflow-y: visible; }",
    );
    expect(compactThemeCss).toContain(
      ".backend-list { padding: 8px; border: 1.5px solid var(--animal-border-color-light);",
    );
    expect(compactThemeCss).toContain(".backend-form { padding: 14px; }");
    expect(compactThemeCss).toContain(
      '.sec[data-sidebar-section="content"] > .sec-head + .pane-row { margin-top: 8px; }',
    );
    expect(compactThemeCss).toContain(
      "@media (hover: none) { .sb-head .icon-btn:hover, .stage-bar .icon-btn:hover, .notes-head .icon-btn:hover { border-color: rgb(255 254 245 / 0.42); color: #fffef5; background: rgb(255 254 245 / 0.12); box-shadow: none; transform: none; }",
    );
  });

  it("keeps PWA chrome and icons aligned with the theme", () => {
    const indexHtml = readWebFile("index.html");
    const compactIndexHtml = indexHtml.replace(/\s+/gu, " ");
    const logoSvg = readWebFile("public", "herdr-logo.svg");
    const darkLogoSvg = readWebFile("public", "herdr-logo-dark.svg");
    const compactThemeCss = themeCss.replace(/\s+/gu, " ");
    const manifest = JSON.parse(readWebFile("public", "manifest.json")) as {
      background_color: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };

    expect(indexHtml).toContain('<meta name="theme-color" content="#19c8b9" />');
    expect(compactIndexHtml).toContain(
      '<link rel="icon" href="/herdr-logo-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)" />',
    );
    expect(compactIndexHtml).toContain(
      '<link rel="apple-touch-icon-precomposed" href="/herdr-touch-180-v3.png" />',
    );
    expect(compactIndexHtml).not.toContain('rel="apple-touch-icon"');
    expect(logoSvg).toContain("@media (prefers-color-scheme: dark)");
    expect(logoSvg).toContain(".icon-background { fill: #fff; }");
    expect(logoSvg).toContain(".icon-mark { fill: #181a1d; }");
    expect(logoSvg).not.toContain("<circle");
    expect(darkLogoSvg).not.toContain("<circle");
    expect(existsSync(join(webRoot, "public", "herdr-touch-180-v3.png"))).toBe(true);
    expect(compactThemeCss).not.toContain("html, body { background: linear-gradient(");
    expect(manifest.theme_color).toBe("#19c8b9");
    expect(manifest.background_color).toBe("#f8f8f0");
    expect(manifest.icons).toContainEqual({
      src: "/herdr-home-light-1024.png",
      sizes: "1024x1024",
      type: "image/png",
      purpose: "any",
    });
    expect(manifest.icons[0]?.src).toBe("/herdr-home-light-1024.png");
    expect(manifest.icons.some((icon) => icon.type === "image/svg+xml")).toBe(false);
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(false);
  });

  it("does not retain the previous font or cool dark palette", () => {
    const packageFiles = `${readWebFile("package.json")}\n${readWebFile("package-lock.json")}`;
    const themedProduction = `${productionSource}\n${baseCss}\n${themeCss}`;

    expect(packageFiles).not.toMatch(/@fontsource(?:-variable)?\/geist|Geist/iu);
    expect(themedProduction).not.toMatch(
      /Geist|#08090c|#111318|#2b2118|#e8d5bc|#0a84ff|#89b4fa|#b4befe|#a6e3a1|#f9e2af|#fab387|#94e2d5|#f38ba8|#cba6f7|#74c7ec/iu,
    );
  });

  it("covers every production class that owns base visual styling", () => {
    const usedClasses = sourceClasses(productionSource);
    const baseClasses = cssClasses(baseCss);
    const themeClasses = cssClasses(themeCss);
    const visuallyStyledClasses = new Set(
      Array.from(usedClasses).filter((className) => baseClasses.has(className)),
    );
    const uncovered = Array.from(visuallyStyledClasses)
      .filter(
        (className) =>
          !themeClasses.has(className) && !inheritedOrStructuralClasses.has(className),
      )
      .sort();
    const staleAllowlist = Array.from(inheritedOrStructuralClasses)
      .filter(
        (className) => !visuallyStyledClasses.has(className) || themeClasses.has(className),
      )
      .sort();

    expect(uncovered).toEqual([]);
    expect(staleAllowlist).toEqual([]);
  });
});
