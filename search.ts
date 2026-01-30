/**
 * Archive.org Search
 *
 * Searches for verified shareware/freeware games. Prioritizes the curated
 * allowlist for instant results, with archive.org metadata fallback.
 *
 * Only games with verified distribution rights are returned.
 */

import type { GameSearchResult } from "./types.js";
import {
  getAllAllowlistEntries,
  getAllowlistEntry,
  isInAllowlist,
} from "./allowlist.js";
import { checkRightsBatch } from "./rights-checker.js";

export interface ArchiveOrgSearchResult {
  identifier: string;
  title: string;
  mediatype: string;
  description?: string;
  year?: string;
  creator?: string;
}

interface ArchiveOrgSearchResponse {
  response: {
    docs: ArchiveOrgSearchResult[];
    numFound: number;
  };
}

const GAME_COLLECTIONS = [
  "collection:internetarcade",
  "collection:consolelivingroom",
  "collection:softwarelibrary_msdos_games",
  "collection:atari_2600_library",
  "collection:tosec",
  "collection:emularity_engine_jsmess",
].join(" OR ");

/**
 * Searches for arcade games matching the given term.
 * Prioritizes allowlist search (instant) before querying archive.org.
 *
 * @param searchTerm - The game name or search term
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Array of game results with verified rights
 */
export async function searchArchiveOrgGames(
  searchTerm: string,
  maxResults: number = 10,
): Promise<GameSearchResult[]> {
  // FIRST: Search the allowlist (instant, no network calls)
  const allowlistResults = searchAllowlist(searchTerm, maxResults);

  if (allowlistResults.length >= maxResults) {
    return allowlistResults;
  }

  // If we have some allowlist results but not enough, try to supplement with archive.org
  // But if allowlist already found matches, return those to avoid slow network calls
  if (allowlistResults.length > 0) {
    return allowlistResults;
  }

  // SECOND: Only if no allowlist matches, search archive.org
  // This is slower but may find games with permissive metadata
  try {
    const archiveResults = await searchArchiveOrgWithTimeout(
      searchTerm,
      maxResults,
    );
    return archiveResults;
  } catch {
    // On any error/timeout, return empty (allowlist was already empty)
    return [];
  }
}

/**
 * Searches the allowlist for matching games (instant, no network).
 */
function searchAllowlist(
  searchTerm: string,
  maxResults: number,
): GameSearchResult[] {
  const normalizedTerm = searchTerm.trim().toLowerCase();
  const allEntries = getAllAllowlistEntries();
  const matches: GameSearchResult[] = [];

  // Split search term into words for flexible matching
  const searchWords = normalizedTerm.split(/\s+/).filter((w) => w.length > 0);

  for (const entry of allEntries) {
    const titleLower = entry.displayTitle.toLowerCase();
    const idLower = entry.identifier.toLowerCase();

    // Match if search term is contained in title or ID
    const directMatch =
      titleLower.includes(normalizedTerm) || idLower.includes(normalizedTerm);

    // Or if all search words are found in title
    const wordMatch =
      searchWords.length > 0 &&
      searchWords.every(
        (word) => titleLower.includes(word) || idLower.includes(word),
      );

    if (directMatch || wordMatch) {
      matches.push({
        identifier: entry.identifier,
        title: entry.displayTitle,
        rightsStatus: "allowed",
        rightsNote: entry.rightsNote,
      });

      if (matches.length >= maxResults) {
        break;
      }
    }
  }

  return matches;
}

/**
 * Searches archive.org with a strict timeout.
 */
async function searchArchiveOrgWithTimeout(
  searchTerm: string,
  maxResults: number,
): Promise<GameSearchResult[]> {
  const normalizedTerm = searchTerm.trim();
  const termWithSpaces = normalizedTerm.replace(/_/g, " ");
  const termWithUnderscores = normalizedTerm.replace(/\s+/g, "_");
  const words = normalizedTerm.split(/[_\s]+/).filter((w) => w.length > 0);

  const exactVariations = [
    normalizedTerm,
    termWithSpaces,
    termWithUnderscores,
  ].filter((term, index, self) => term && self.indexOf(term) === index);

  const exactQuery = `title:(${exactVariations.join(" OR ")})`;
  const fetchLimit = maxResults * 2;

  // Single search attempt with tight timeout
  let games = await performSearch(exactQuery, true, fetchLimit);

  if (games.length === 0 && words.length > 1) {
    const broaderQuery = `title:(${exactVariations.join(" OR ")} OR ${words.join(" OR ")})`;
    games = await performSearch(broaderQuery, true, fetchLimit);
  }

  if (games.length === 0) {
    return [];
  }

  // Filter to allowlist entries first (fast check, no metadata fetch)
  const allowlistFiltered = games
    .filter((game) => isInAllowlist(game.identifier))
    .map((game) => {
      const entry = getAllowlistEntry(game.identifier)!;
      return {
        identifier: game.identifier,
        title: game.title,
        description: game.description,
        year: game.year,
        creator: game.creator,
        rightsStatus: "allowed" as const,
        rightsNote: entry.rightsNote,
      };
    });

  if (allowlistFiltered.length > 0) {
    return allowlistFiltered.slice(0, maxResults);
  }

  // If no allowlist matches, check metadata for verified rights
  const limitedGames = games.slice(0, 10);
  const rightsMap = await checkRightsBatch(
    limitedGames.map((g) => g.identifier),
  );

  const verified: GameSearchResult[] = [];
  for (const game of limitedGames) {
    const rights = rightsMap.get(game.identifier);
    if (rights?.status === "allowed") {
      verified.push({
        identifier: game.identifier,
        title: game.title,
        description: game.description,
        year: game.year,
        creator: game.creator,
        rightsStatus: "allowed",
        rightsNote: rights.note,
      });
    }
  }

  return verified.slice(0, maxResults);
}

async function performSearch(
  query: string,
  withCollectionFilter: boolean,
  maxResults: number,
): Promise<ArchiveOrgSearchResult[]> {
  const fullQuery = withCollectionFilter
    ? `${query} AND (${GAME_COLLECTIONS})`
    : query;

  const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(fullQuery)}&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=description&fl[]=year&fl[]=creator&output=json&rows=${encodeURIComponent(String(maxResults))}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "MCP-Arcade-Server/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as ArchiveOrgSearchResponse;
    if (!data?.response?.docs) return [];

    return data.response.docs.filter((doc) => doc.identifier);
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}
