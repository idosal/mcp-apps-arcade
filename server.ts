/**
 * Arcade MCP Server
 *
 * MCP server for browsing and playing arcade games from archive.org.
 * Fetches game HTML server-side and serves it as an inline MCP App resource.
 *
 * IMPORTANT: Only games with verified distribution rights (shareware, freeware,
 * public domain) can be loaded. See allowlist.ts for the curated list.
 */

import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { searchArchiveOrgGames } from "./search.js";
import { checkRights } from "./rights-checker.js";

const GAME_VIEWER_RESOURCE_URI = "ui://arcade/game-viewer";

/**
 * Validates an archive.org game identifier.
 */
export function validateGameId(gameId: string): boolean {
  return (
    gameId.length > 0 &&
    !gameId.includes("/") &&
    !gameId.includes("?") &&
    !gameId.includes("#") &&
    !gameId.includes("..") &&
    !/\s/.test(gameId)
  );
}

/**
 * Creates a new MCP server instance with tools and resources registered.
 */
export function createServer(port: number): McpServer {
  const server = new McpServer({
    name: "Arcade Server",
    version: "1.0.0",
  });

  // Tool: Search for arcade games (no UI)
  server.registerTool(
    "search_games",
    {
      description:
        "Searches for shareware, freeware, and public domain arcade games. " +
        "Only returns games with verified distribution rights.",
      inputSchema: z.object({
        searchTerm: z
          .string()
          .describe(
            'The game name or search term (e.g., "doom", "commander keen", "tyrian").',
          ),
        maxResults: z
          .number()
          .optional()
          .default(10)
          .describe(
            "Maximum number of results to return (default: 10, max: 50)",
          ),
      }) as any,
    },
    async (args: any): Promise<CallToolResult> => {
      const { searchTerm, maxResults } = args;
      if (!searchTerm || searchTerm.trim().length === 0) {
        return {
          content: [
            { type: "text", text: "Error: Search term cannot be empty." },
          ],
          isError: true,
        };
      }

      const limit = Math.min(Math.max(maxResults || 10, 1), 50);

      try {
        const games = await searchArchiveOrgGames(searchTerm.trim(), limit);

        if (games.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No verified-rights games found for "${searchTerm}". Try a different search term, or check the allowlist for available games.`,
              },
            ],
          };
        }

        const gameData = games.map((game) => ({
          identifier: game.identifier,
          title: game.title,
          description: game.description || null,
          year: game.year || null,
          creator: game.creator || null,
          rightsStatus: game.rightsStatus,
          rightsNote: game.rightsNote || null,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  total: games.length,
                  searchTerm,
                  note: "All results have verified distribution rights (shareware, freeware, or public domain)",
                  games: gameData,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching for games: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: Load and play a specific game (with UI)
  server.registerTool(
    "get_game_by_id",
    {
      title: "Play Arcade Game",
      description:
        "Loads and displays a playable arcade game from archive.org. " +
        "Only games with verified distribution rights (shareware, freeware, public domain) can be loaded. " +
        "Use search_games first to find available games.",
      inputSchema: z.object({
        gameId: z
          .string()
          .describe(
            'The archive.org identifier for a verified-rights game (e.g., "doom-play", "heretic-dos").',
          ),
      }) as any,
      _meta: {
        ui: { resourceUri: GAME_VIEWER_RESOURCE_URI },
      },
    },
    async (args: any): Promise<CallToolResult> => {
      const { gameId } = args;
      if (!gameId || !validateGameId(gameId)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Invalid game ID "${gameId}". Must be a non-empty identifier without path separators.`,
            },
          ],
          isError: true,
        };
      }

      // Check rights status - only allow verified games
      const rights = await checkRights(gameId);

      if (rights.status !== "allowed") {
        return {
          content: [
            {
              type: "text",
              text:
                `Error: Cannot load "${gameId}" - distribution rights not verified.\n` +
                `Status: ${rights.note || "Rights status unknown"}\n\n` +
                `Only shareware, freeware, and public domain games can be loaded. ` +
                `Use search_games to find available games.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Loading arcade game: ${gameId}\nRights: ${rights.note || "Verified for distribution"}`,
          },
        ],
      };
    },
  );

  // Resource: Serves the processed game HTML with CSP configuration
  registerAppResource(
    server,
    "Game Viewer",
    GAME_VIEWER_RESOURCE_URI,
    {},
    async () => {
      // Static view shell with inline MCP Apps protocol handling.
      // Performs the initialization handshake, then waits for tool input
      // to know which game to load. Fetches game HTML from the server's
      // HTTP endpoint keyed by game ID.
      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#111;color:#0f0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh">
<div id="status">Loading game\u2026</div>
<script>
(function() {
  var SERVER = "http://localhost:${port}";
  var initialized = false;

  function send(msg) { window.parent.postMessage(msg, "*"); }

  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0") return;

    // Handle initialize response
    if (msg.id && msg.result && !initialized) {
      initialized = true;
      send({jsonrpc: "2.0", method: "ui/notifications/initialized"});
      return;
    }

    // Handle ping
    if (msg.method === "ping" && msg.id) {
      send({jsonrpc: "2.0", id: msg.id, result: {}});
      return;
    }

    // Handle tool input - load the game
    if (msg.method === "ui/notifications/tool-input" && msg.params) {
      var gameId = msg.params.arguments && msg.params.arguments.gameId;
      if (gameId) loadGame(gameId);
      return;
    }
  });

  // Send initialize request
  send({jsonrpc: "2.0", id: 1, method: "ui/initialize", params: {
    appInfo: {name: "Arcade Game Viewer", version: "1.0.0"},
    appCapabilities: {},
    protocolVersion: "2025-11-21"
  }});

  function loadGame(gameId) {
    document.getElementById("status").textContent = "Loading " + gameId + "\\u2026";
    fetch(SERVER + "/game-html/" + encodeURIComponent(gameId))
      .then(function(r) {
        if (!r.ok) throw new Error(r.statusText);
        return r.text();
      })
      .then(function(h) {
        document.open();
        document.write(h);
        document.close();
      })
      .catch(function(e) {
        document.getElementById("status").textContent = "Failed to load game: " + e.message;
      });
  }
})();
</script>
</body></html>`;

      return {
        contents: [
          {
            uri: GAME_VIEWER_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  resourceDomains: [
                    "https://archive.org",
                    "https://*.archive.org",
                    `http://localhost:${port}`,
                  ],
                  connectDomains: [
                    "https://archive.org",
                    "https://*.archive.org",
                    `http://localhost:${port}`,
                  ],
                  baseUriDomains: ["https://archive.org"],
                },
              },
            },
          },
        ],
      };
    },
  );

  return server;
}
