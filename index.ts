#!/usr/bin/env node

/**
 * Arcade MCP Server - Entry Point
 *
 * Sets up HTTP transport with Express and serves the modified emulation script.
 */

import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, validateGameId } from "./server.js";
import {
  getCachedEmulationScript,
  processGameEmbed,
} from "./game-processor.js";

const DEFAULT_PORT = 3001;

async function main() {
  const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve the modified emulation script (import() rewritten to loadScript()).
  // <script src> is not subject to CORS, so this works from srcdoc iframes.
  // NOTE: Script is cached in memory only, not persisted to disk.
  app.get("/scripts/emulation.js", (_req: Request, res: Response) => {
    const script = getCachedEmulationScript();
    if (!script) {
      res.status(404).send("// No script cached. Load a game first.");
      return;
    }
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.send(script);
  });

  // Serve game HTML by ID. Fetches and processes the game from archive.org.
  app.get("/game-html/:gameId", async (req: Request, res: Response) => {
    const gameId = req.params.gameId as string;
    if (!validateGameId(gameId)) {
      res.status(400).send("Invalid game ID.");
      return;
    }
    try {
      const html = await processGameEmbed(gameId, port);
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.send(html);
    } catch (error) {
      console.error("Failed to load game:", gameId, error);
      res.status(500).send("Failed to load game.");
    }
  });

  // MCP endpoint - stateless transport (new server per request)
  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServer(port);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, () => {
    console.log(`Arcade MCP Server listening on http://localhost:${port}/mcp`);
  });
  httpServer.setMaxListeners(20);

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
    // Force exit after 2 seconds if connections don't close gracefully
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
