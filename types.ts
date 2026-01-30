/**
 * Type definitions for rights management in the Arcade Server.
 */

/**
 * Rights status for a game:
 * - "allowed": Verified shareware, freeware, or public domain
 * - "unknown": Rights status could not be determined
 * - "restricted": Known to be copyrighted without distribution permission
 */
export type RightsStatus = "allowed" | "unknown" | "restricted";

/**
 * Extended game search result with rights information.
 */
export interface GameSearchResult {
  identifier: string;
  title: string;
  description?: string;
  year?: string;
  creator?: string;
  rightsStatus: RightsStatus;
  rightsNote?: string;
}

/**
 * Entry in the curated allowlist of verified-rights games.
 *
 * Each entry must have documented legal basis for distribution rights.
 * This is NOT based on archive.org metadata (which is unreliable),
 * but on external, verifiable sources.
 */
export interface AllowlistEntry {
  /** Archive.org identifier for the game */
  identifier: string;
  /** Human-readable game title */
  displayTitle: string;
  /** Brief description of rights status (shown to users) */
  rightsNote: string;
  /**
   * URL to external source documenting distribution rights.
   * This should be an authoritative source (publisher announcement,
   * official website, press release, etc.) - NOT archive.org metadata.
   */
  sourceUrl: string;
  /**
   * Detailed legal justification explaining why this game is
   * legally distributable. Should reference the sourceUrl.
   */
  legalBasis: string;
}

/**
 * Result from the rights checker.
 */
export interface RightsCheckResult {
  status: RightsStatus;
  note?: string;
}
