# Example: Arcade Server

An MCP Apps server that lets you browse and play classic arcade games from [archive.org](https://archive.org) directly in an MCP-enabled host.

## Legal Disclaimer

**This is a technical demonstration, not a distribution platform.**

- Games are fetched directly from archive.org's embed system at runtime
- We do not host, distribute, or store game content
- **Only games with verified distribution rights can be loaded**
- Games without verified rights are blocked

### How Rights Verification Works

The server uses a **strict verification system**:

1. **Curated Allowlist**: Games in [`allowlist.ts`](allowlist.ts) have externally documented distribution rights with source URLs (publisher announcements, official websites). Each entry includes legal justification.

2. **Metadata Verification**: For games not in the allowlist, we check archive.org metadata for explicit rights indicators (shareware, freeware, public domain, Creative Commons).

**Games are only allowed if they have verified rights.** Unknown or restricted games are blocked.

### What Games Are Available?

- **Shareware**: First episodes/demos explicitly released for free distribution (DOOM, Duke Nukem, Commander Keen, Wolfenstein 3D, etc.)
- **Freeware**: Games officially released as free by their publishers (Tyrian 2000, Jill of the Jungle)
- **Public Domain**: Games with expired or waived copyright

See [`allowlist.ts`](allowlist.ts) for the complete list with legal documentation.

### Emulator Runtimes

Archive.org uses the [Emularity](https://github.com/db48x/emularity) system to run games in the browser. This includes:

| Emulator                                              | License                 | Used For                                     |
| ----------------------------------------------------- | ----------------------- | -------------------------------------------- |
| [DOSBox](https://www.dosbox.com/)                     | GPL-2.0+                | DOS games                                    |
| [EM-DOSBox](https://github.com/dreamlayers/em-dosbox) | GPL-2.0+                | DOSBox compiled to JavaScript via Emscripten |
| [MAME](https://www.mamedev.org/)                      | BSD-3-Clause / GPL-2.0+ | Arcade games                                 |

**Our relationship with these emulators:**

- We do **not** distribute, bundle, or modify any emulator code
- Emulators are fetched directly from archive.org at runtime
- We only proxy archive.org's embed system, which hosts its own copies of these emulators
- The temporary in-memory caching (see below) is purely for CORS workaround purposes

**License compatibility note:**

The MCP Apps SDK is Apache-2.0 licensed. There is no license conflict because:

1. The arcade-server does **not** bundle, include, or link against GPL emulator code
2. Emulators are fetched from archive.org at runtime (like loading any CDN resource)
3. Emulators execute in the user's browser, a separate execution context
4. This is analogous to embedding a YouTube video - the embedding page isn't a derivative of YouTube's player

If you create a modified version that **bundles** emulator code into the distribution, you must comply with GPL-2.0+ terms (copyleft, source availability).

### Script Re-hosting (CORS Workaround)

The server temporarily caches archive.org's `emulation.min.js` script in memory only (not persisted to disk) to work around browser security restrictions in sandboxed iframes. This is a technical necessity, not redistribution:

- Cache uses `Cache-Control: no-store` headers
- Cache is cleared on server restart
- Script is fetched fresh from archive.org on first request
- No modifications are made beyond replacing `import()` with `loadScript()` for iframe compatibility

### Adding New Games

To add a game to the allowlist, you must provide:

1. **sourceUrl**: A link to an authoritative source documenting distribution rights (publisher website, press release, official announcement)
2. **legalBasis**: A clear explanation of why the game is legally distributable
3. **Verification**: Confirm the archive.org identifier works

**When in doubt, do not add the game.**

## Overview

This example demonstrates serving **external HTML content** as an MCP App resource. The resource is a static loader that uses the MCP Apps protocol to receive tool arguments, then fetches the processed game HTML from a server endpoint. This pattern allows the same resource to display different games based on tool input.

Key techniques:

- MCP Apps protocol handshake (`ui/initialize` → `ui/notifications/tool-input`) to receive game ID dynamically
- Server-side HTML fetching and processing per game ID
- `<base href>` tag for resolving relative URLs against archive.org
- `baseUriDomains` CSP metadata to allow the base tag
- Rewriting ES module `import()` to classic `<script src>` loading (for srcdoc iframe compatibility)
- Local script endpoint to bypass CORS restrictions in sandboxed iframes
- **Rights checking** to verify distribution permissions before loading games

## Key Files

- [`server.ts`](server.ts) - MCP server with tool and resource registration
- [`index.ts`](index.ts) - HTTP transport and Express setup
- [`game-processor.ts`](game-processor.ts) - Fetches and processes archive.org HTML
- [`search.ts`](search.ts) - Archive.org search with smart fallbacks and rights filtering
- [`rights-checker.ts`](rights-checker.ts) - Analyzes archive.org metadata for distribution rights
- [`allowlist.ts`](allowlist.ts) - Curated list of verified shareware/freeware games
- [`types.ts`](types.ts) - Type definitions for rights management

## Getting Started

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3002/mcp` by default. Set the `PORT` environment variable to change it.

### MCP Client Configuration

```json
{
  "mcpServers": {
    "arcade": {
      "url": "http://localhost:3002/mcp"
    }
  }
}
```

## Tools

| Tool             | Description                                  | UI  |
| ---------------- | -------------------------------------------- | --- |
| `search_games`   | Search for verified shareware/freeware games | No  |
| `get_game_by_id` | Load and play a verified-rights game         | Yes |

### search_games Parameters

| Parameter    | Type   | Default | Description              |
| ------------ | ------ | ------- | ------------------------ |
| `searchTerm` | string | -       | Game name or search term |
| `maxResults` | number | 10      | Maximum results (1-50)   |

### get_game_by_id Parameters

| Parameter | Type   | Default | Description                         |
| --------- | ------ | ------- | ----------------------------------- |
| `gameId`  | string | -       | Archive.org identifier for the game |

## How It Works

```
1. Host calls search_games → Server searches allowlist + archive.org → Returns verified games only
2. Host calls get_game_by_id → Server verifies rights status
3. If rights verified → Tool returns success
4. If rights NOT verified → Tool returns error, game blocked
5. Host reads resource → Gets static loader with MCP Apps protocol handler
6. View performs ui/initialize handshake with host
7. Host sends tool-input with gameId → View fetches /game-html/:gameId
8. Server fetches embed HTML from archive.org and processes it:
   - Removes archive.org's <base> tag
   - Injects <base href="https://archive.org/"> for URL resolution
   - Rewrites ES module import() to <script src> loading
   - Fetches emulation.min.js, patches it, serves from local endpoint
   - Injects layout CSS for full-viewport display
9. Game runs: emulator loads ROM, initializes MAME, game is playable
```

### Why the Processing?

Archive.org's game embed pages use ES module `import()` for loading the emulation engine. In `srcdoc` iframes (used by MCP hosts), `import()` fails because the iframe has a `null` origin. The server works around this by:

1. **Fetching `emulation.min.js` server-side** and replacing `import()` with `window.loadScript()`
2. **Serving the patched script** from a local Express endpoint (`/scripts/emulation.js`)
3. **Using `<script src>`** which is not subject to CORS restrictions, unlike `fetch()` or `import()`

## Available Games (18 Verified Titles)

All games have verified distribution rights. See [`allowlist.ts`](allowlist.ts) for legal documentation.

### id Software Shareware

| Identifier                      | Title                            | Year |
| ------------------------------- | -------------------------------- | ---- |
| `doom-play`                     | DOOM                             | 1993 |
| `msdos_DOOM_1993`               | DOOM (MS-DOS)                    | 1993 |
| `wolfenstein-3d`                | Wolfenstein 3D                   | 1992 |
| `w3d-box`                       | Wolfenstein 3D v1.4              | 1993 |
| `commander_keen_volume_one_131` | Commander Keen: Marooned on Mars | 1990 |
| `heretic-dos`                   | Heretic                          | 1994 |

### Apogee / 3D Realms Shareware

| Identifier                                      | Title                       | Year |
| ----------------------------------------------- | --------------------------- | ---- |
| `duke-nukem2-sw`                                | Duke Nukem II               | 1993 |
| `3dduke13SW-altcontrols`                        | Duke Nukem 3D               | 1996 |
| `Bs-aog-sw1`                                    | Blake Stone: Aliens of Gold | 1993 |
| `rise-of-the-triad-the-hunt-begins-version-1.0` | Rise of the Triad           | 1994 |
| `biomenace1-sw`                                 | Bio Menace                  | 1993 |
| `Crystal-cave-sw1`                              | Crystal Caves               | 1991 |
| `monster-bash1-sw`                              | Monster Bash                | 1993 |
| `halloween_harry_shareware`                     | Halloween Harry             | 1993 |

### Epic MegaGames Shareware / Freeware

| Identifier                | Title                         | Year |
| ------------------------- | ----------------------------- | ---- |
| `Epic-pinball-sw1`        | Epic Pinball                  | 1993 |
| `radsw20`                 | Radix: Beyond the Void        | 1995 |
| `msdos_Tyrian_2000_1999`  | Tyrian 2000 (Freeware)        | 1999 |
| `jill-of-the-jungle-0mhz` | Jill of the Jungle (Freeware) | 1992 |
