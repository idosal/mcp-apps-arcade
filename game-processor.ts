/**
 * Game Processor
 *
 * Fetches and processes archive.org game HTML for embedding in MCP Apps.
 * Uses <base href="https://archive.org/"> for relative URL resolution,
 * and rewrites ES module import() calls to classic <script src> loading
 * (dynamic import() doesn't work in srcdoc iframes due to null origin).
 */

// Cache for the modified emulation script content
let cachedEmulationScript: string | null = null;

/**
 * Returns the cached modified emulation script.
 * Called by the server's /scripts/emulation.js endpoint.
 */
export function getCachedEmulationScript(): string | null {
  return cachedEmulationScript;
}

/**
 * Fetches and processes archive.org game HTML for inline embedding.
 */
export async function processGameEmbed(
  gameId: string,
  serverPort: number,
): Promise<string> {
  const encodedGameId = encodeURIComponent(gameId);
  const embedUrl = `https://archive.org/embed/${encodedGameId}`;

  const response = await fetch(embedUrl, {
    headers: {
      "User-Agent": "MCP-Arcade-Server/1.0",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch game: ${response.status} ${response.statusText}`,
    );
  }

  let html = await response.text();

  // Remove archive.org's <base> tag (would violate CSP base-uri)
  html = html.replace(/<base\s+[^>]*>/gi, "");

  // Inject our <base> tag, hash-link interceptor, script loader, and layout CSS
  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch) {
    html = html.replace(
      headMatch[0],
      `${headMatch[0]}
      <base href="https://archive.org/">
      <script>
        // Intercept hash-link clicks that would navigate away due to <base>
        document.addEventListener("click", function(e) {
          var el = e.target;
          while (el && el.tagName !== "A") el = el.parentElement;
          if (el && el.getAttribute("href") && el.getAttribute("href").charAt(0) === "#") {
            e.preventDefault();
          }
        }, true);

        // Script loader: replaces dynamic import() which fails in srcdoc iframes.
        // Uses <script src> which respects <base> and bypasses CORS.
        if (!window.loadScript) {
          window.loadScript = function(url) {
            return new Promise(function(resolve) {
              var s = document.createElement("script");
              s.src = url;
              s.onload = function() {
                resolve({
                  default: window.Emulator || window.IALoader || window.Loader || {},
                  __esModule: true
                });
              };
              s.onerror = function() {
                console.error("Failed to load script:", url);
                resolve({ default: {}, __esModule: true });
              };
              document.head.appendChild(s);
            });
          };
        }
      </script>
      <style>
        html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
        #wrap, #emulate { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
        #canvasholder { width: 100% !important; height: 100% !important; }
        #canvas { width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; object-fit: contain; }
      </style>`,
    );
  }

  // Convert inline ES module scripts to classic scripts
  html = convertModuleScripts(html);

  // Fetch the emulation script server-side and serve from local endpoint
  html = await rewriteEmulationScript(html, serverPort);

  return html;
}

/**
 * Fetches emulation.min.js server-side, rewrites import() → loadScript(),
 * caches it, and points the HTML <script src> to our local endpoint.
 * This avoids: 1) import() failing in srcdoc, 2) CORS blocking fetch from srcdoc.
 */
async function rewriteEmulationScript(
  html: string,
  serverPort: number,
): Promise<string> {
  // NOTE: We intentionally match only the first <script> tag whose src contains
  // "emulation.min.js". Archive.org embeds are expected to include a single
  // relevant emulation script, so rewriting the first match is sufficient.
  // If Archive.org's HTML structure changes to include multiple such scripts,
  // this logic may need to be revisited.
  const pattern =
    /<script\s+[^>]*src=["']([^"']*emulation\.min\.js[^"']*)["'][^>]*><\/script>/i;
  const match = html.match(pattern);
  if (!match) return html;

  const scriptTag = match[0];
  let scriptUrl = match[1];
  if (scriptUrl.startsWith("//")) {
    scriptUrl = "https:" + scriptUrl;
  }

  try {
    const response = await fetch(scriptUrl, {
      headers: { "User-Agent": "MCP-Arcade-Server/1.0" },
    });
    if (!response.ok) return html;

    let content = await response.text();
    content = content.replace(/\bimport\s*\(/g, "window.loadScript(");
    cachedEmulationScript = content;

    const localUrl = `http://localhost:${serverPort}/scripts/emulation.js`;
    html = html.replace(scriptTag, `<script src="${localUrl}"></script>`);
  } catch {
    // If fetch fails, leave the original script tag
  }

  return html;
}

/**
 * Converts ES module scripts to classic scripts and rewrites inline
 * import() calls to use window.loadScript().
 */
function convertModuleScripts(html: string): string {
  return html.replace(
    /(<script[^>]*>)([\s\S]*?)(<\/script[^>]*>)/gi,
    (match, openTag: string, content: string, closeTag: string) => {
      // Skip our injected scripts
      if (content.includes("window.loadScript")) return match;

      // Remove type="module"
      const newOpenTag = openTag.replace(/\s*type\s*=\s*["']module["']/gi, "");

      // Rewrite dynamic import() to loadScript()
      let newContent = content.replace(
        /import\s*\(\s*(["'`])([^"'`]+)\1\s*\)/g,
        (_m: string, quote: string, path: string) => {
          if (path.startsWith("http://") || path.startsWith("https://"))
            return _m;
          return `window.loadScript(${quote}${path}${quote})`;
        },
      );

      // Convert static import statements
      newContent = newContent.replace(
        /import\s+(\{[^}]*\}|[^"']+)\s+from\s+(["'])([^"']+)\2/g,
        (_m: string, _imports: string, quote: string, path: string) => {
          if (path.startsWith("http://") || path.startsWith("https://"))
            return _m;
          return `window.loadScript(${quote}${path}${quote})`;
        },
      );

      return newOpenTag + newContent + closeTag;
    },
  );
}
