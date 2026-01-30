/**
 * Rights Checker
 *
 * Fetches archive.org metadata and analyzes rights status for games.
 * Optimized with caching, concurrency limits, and fast timeouts.
 */

import type { RightsCheckResult, RightsStatus } from "./types.js";
import { getAllowlistEntry, isInAllowlist } from "./allowlist.js";

// Cache for metadata responses (30-minute TTL for better performance)
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  result: RightsCheckResult;
  timestamp: number;
}

const metadataCache = new Map<string, CacheEntry>();

// Concurrency control
const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

/**
 * Archive.org metadata response structure (partial).
 */
interface ArchiveMetadata {
  metadata?: {
    licenseurl?: string;
    rights?: string;
    possible_copyright_status?: string;
    collection?: string | string[];
    mediatype?: string;
  };
}

/**
 * Patterns that indicate permissive rights.
 */
const PERMISSIVE_PATTERNS = [
  /public\s*domain/i,
  /shareware/i,
  /freeware/i,
  /free\s*software/i,
  /creativecommons/i,
  /creative\s*commons/i,
  /cc0/i,
  /cc-by/i,
  /cc-by-sa/i,
  /open\s*source/i,
  /gpl/i,
  /mit\s*license/i,
  /bsd\s*license/i,
  /apache\s*license/i,
  /freely\s*distribut/i,
  /free\s*to\s*distribute/i,
  /released\s*as\s*free/i,
  /no\s*known\s*copyright/i,
  /copyright\s*not\s*renewed/i,
  /abandonware/i,
];

/**
 * Patterns that indicate restricted rights.
 */
const RESTRICTED_PATTERNS = [
  /all\s*rights\s*reserved/i,
  /copyrighted/i,
  /proprietary/i,
  /commercial\s*use\s*prohibited/i,
];

/**
 * Checks the copyright/distribution rights status for a game.
 * Allowlist entries take precedence over metadata checks.
 */
export async function checkRights(
  identifier: string,
): Promise<RightsCheckResult> {
  // Check allowlist first (highest priority, instant)
  const allowlistEntry = getAllowlistEntry(identifier);
  if (allowlistEntry) {
    return {
      status: "allowed",
      note: allowlistEntry.rightsNote,
    };
  }

  // Check cache
  const cached = metadataCache.get(identifier);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Fetch metadata from archive.org with concurrency control
  const result = await fetchWithConcurrencyLimit(identifier);

  // Cache the result
  metadataCache.set(identifier, {
    result,
    timestamp: Date.now(),
  });

  return result;
}

/**
 * Batch check rights for multiple identifiers with optimized concurrency.
 */
export async function checkRightsBatch(
  identifiers: string[],
): Promise<Map<string, RightsCheckResult>> {
  const results = new Map<string, RightsCheckResult>();

  // First pass: resolve from allowlist and cache (instant)
  const needsFetch: string[] = [];

  for (const id of identifiers) {
    // Check allowlist
    const allowlistEntry = getAllowlistEntry(id);
    if (allowlistEntry) {
      results.set(id, {
        status: "allowed",
        note: allowlistEntry.rightsNote,
      });
      continue;
    }

    // Check cache
    const cached = metadataCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results.set(id, cached.result);
      continue;
    }

    needsFetch.push(id);
  }

  // Second pass: fetch remaining in parallel with concurrency limit
  if (needsFetch.length > 0) {
    const fetchResults = await Promise.allSettled(
      needsFetch.map((id) =>
        fetchWithConcurrencyLimit(id).then((r) => ({ id, result: r })),
      ),
    );

    for (const outcome of fetchResults) {
      if (outcome.status === "fulfilled") {
        const { id, result } = outcome.value;
        results.set(id, result);
        metadataCache.set(id, { result, timestamp: Date.now() });
      } else {
        // On failure, mark as unknown
        const id = needsFetch[fetchResults.indexOf(outcome)];
        const result: RightsCheckResult = {
          status: "unknown",
          note: "Metadata check failed",
        };
        results.set(id, result);
      }
    }
  }

  return results;
}

/**
 * Fetches metadata with concurrency limiting.
 */
async function fetchWithConcurrencyLimit(
  identifier: string,
): Promise<RightsCheckResult> {
  // Wait for slot if at max concurrency
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => {
      requestQueue.push(resolve);
    });
  }

  activeRequests++;

  try {
    return await fetchAndAnalyzeMetadata(identifier);
  } finally {
    activeRequests--;
    // Release next waiting request
    const next = requestQueue.shift();
    if (next) next();
  }
}

/**
 * Fetches metadata from archive.org and analyzes rights status.
 */
async function fetchAndAnalyzeMetadata(
  identifier: string,
): Promise<RightsCheckResult> {
  // Check if identifier itself indicates shareware/freeware
  const idCheck = checkIdentifierForRights(identifier);
  if (idCheck) {
    return idCheck;
  }

  try {
    const url = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "MCP-Arcade-Server/1.0",
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { status: "unknown", note: "Could not fetch metadata" };
      }

      const data = (await response.json()) as ArchiveMetadata;
      return analyzeMetadata(identifier, data);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    // Network errors, timeouts, etc.
    return {
      status: "unknown",
      note: "Metadata check failed",
    };
  }
}

/**
 * Checks if the identifier itself indicates shareware/freeware status.
 */
function checkIdentifierForRights(
  identifier: string,
): RightsCheckResult | null {
  const idLower = identifier.toLowerCase();

  // Common shareware/freeware indicators in identifiers
  if (
    idLower.includes("shareware") ||
    idLower.includes("-sw") ||
    idLower.endsWith("sw")
  ) {
    return {
      status: "allowed",
      note: "Identifier indicates shareware",
    };
  }

  if (idLower.includes("freeware") || idLower.includes("free-")) {
    return {
      status: "allowed",
      note: "Identifier indicates freeware",
    };
  }

  if (idLower.includes("public-domain") || idLower.includes("publicdomain")) {
    return {
      status: "allowed",
      note: "Identifier indicates public domain",
    };
  }

  if (idLower.includes("demo")) {
    return {
      status: "allowed",
      note: "Identifier indicates demo version",
    };
  }

  return null;
}

/**
 * Analyzes archive.org metadata to determine rights status.
 */
function analyzeMetadata(
  identifier: string,
  data: ArchiveMetadata,
): RightsCheckResult {
  const metadata = data.metadata;
  if (!metadata) {
    // No metadata, but archive.org is hosting it publicly
    return {
      status: "unknown",
      note: "No metadata available - hosted on archive.org",
    };
  }

  // Check licenseurl field
  const licenseUrl = metadata.licenseurl || "";
  if (licenseUrl) {
    if (matchesPermissivePattern(licenseUrl)) {
      return {
        status: "allowed",
        note: `License: ${licenseUrl}`,
      };
    }
  }

  // Check rights field
  const rights = metadata.rights || "";
  if (rights) {
    if (matchesPermissivePattern(rights)) {
      return {
        status: "allowed",
        note: `Rights: ${truncate(rights, 100)}`,
      };
    }
    if (matchesRestrictedPattern(rights)) {
      return {
        status: "restricted",
        note: `Rights: ${truncate(rights, 100)}`,
      };
    }
  }

  // Check possible_copyright_status field
  const copyrightStatus = metadata.possible_copyright_status || "";
  if (copyrightStatus) {
    if (matchesPermissivePattern(copyrightStatus)) {
      return {
        status: "allowed",
        note: `Copyright status: ${copyrightStatus}`,
      };
    }
  }

  // Check if part of known shareware/freeware collections
  const collections = Array.isArray(metadata.collection)
    ? metadata.collection
    : metadata.collection
      ? [metadata.collection]
      : [];

  for (const collection of collections) {
    const lowerCollection = collection.toLowerCase();
    if (
      lowerCollection.includes("shareware") ||
      lowerCollection.includes("freeware") ||
      lowerCollection.includes("publicdomain")
    ) {
      return {
        status: "allowed",
        note: `Part of ${collection} collection`,
      };
    }
  }

  // Default to unknown
  return {
    status: "unknown",
    note: "Rights status could not be determined from metadata",
  };
}

/**
 * Checks if text matches any permissive rights pattern.
 */
function matchesPermissivePattern(text: string): boolean {
  return PERMISSIVE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Checks if text matches any restricted rights pattern.
 */
function matchesRestrictedPattern(text: string): boolean {
  return RESTRICTED_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Truncates a string to a maximum length.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Clears the metadata cache. Useful for testing.
 */
export function clearRightsCache(): void {
  metadataCache.clear();
}

/**
 * Quick check if a game is in the allowlist (does not fetch metadata).
 */
export function isAllowlisted(identifier: string): boolean {
  return isInAllowlist(identifier);
}
