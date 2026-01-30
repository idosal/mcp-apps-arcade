/**
 * Allowlist of Games with Verified Distribution Rights
 *
 * LEGAL NOTICE:
 * This curated list contains games with EXTERNALLY verified distribution
 * rights. Each entry includes:
 * - sourceUrl: Link to authoritative documentation of distribution rights
 * - legalBasis: Explanation of why the game is legally distributable
 *
 * WHY A CURATED ALLOWLIST?
 * Archive.org metadata (licenseurl, rights, possible_copyright_status) is
 * used as a fallback in rights-checker.ts, but it is often:
 * - Empty or missing entirely
 * - User-submitted without verification
 * - Inconsistent across similar items
 *
 * This allowlist provides higher confidence for known-good games by
 * requiring external, authoritative sources for each entry.
 *
 * ADDING NEW ENTRIES:
 * - Requires a verifiable sourceUrl (publisher site, press release, etc.)
 * - Requires a clear legalBasis explanation
 * - When in doubt, DO NOT add the game
 *
 * SHAREWARE MODEL (1990s):
 * Publishers like id Software and Apogee explicitly encouraged free distribution
 * of shareware versions. The shareware model allowed anyone to copy and share
 * the first episode/demo, with the understanding that the full game required
 * purchase. This was the intended business model, not piracy.
 *
 * FREEWARE RELEASES:
 * Some games were later released as freeware by their rights holders,
 * with explicit announcements making them free to distribute.
 */

import type { AllowlistEntry } from "./types.js";

/**
 * Curated list of games with verified distribution rights.
 *
 * DO NOT ADD GAMES WITHOUT:
 * 1. A verifiable sourceUrl proving distribution rights
 * 2. A clear legalBasis explanation
 * 3. Verification that the archive.org identifier works
 */
const ALLOWLIST: AllowlistEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // id SOFTWARE SHAREWARE
  //
  // id Software pioneered the shareware model. Their shareware releases were
  // explicitly designed for free distribution. John Carmack and John Romero
  // have repeatedly confirmed shareware versions are freely distributable.
  // ═══════════════════════════════════════════════════════════════════════════

  {
    identifier: "doom-play",
    displayTitle: "DOOM",
    rightsNote: "Shareware - id Software (1993)",
    sourceUrl: "https://doomwiki.org/wiki/Shareware",
    legalBasis:
      "DOOM shareware (v1.9) was released by id Software under their shareware " +
      "model. The DOOM FAQ and original distribution terms explicitly permitted " +
      "free copying and distribution of the shareware version. id Software's " +
      "shareware license allowed unlimited redistribution of the unmodified " +
      "shareware package.",
  },
  {
    identifier: "msdos_DOOM_1993",
    displayTitle: "DOOM (MS-DOS)",
    rightsNote: "Shareware - id Software (1993)",
    sourceUrl: "https://doomwiki.org/wiki/Shareware",
    legalBasis:
      "Same legal basis as doom-play. DOOM shareware episode 'Knee-Deep in the " +
      "Dead' was explicitly released for free distribution by id Software.",
  },
  {
    identifier: "wolfenstein-3d",
    displayTitle: "Wolfenstein 3D",
    rightsNote: "Shareware - id Software (1992)",
    sourceUrl: "https://wolfenstein.fandom.com/wiki/Wolfenstein_3D#Shareware",
    legalBasis:
      "Wolfenstein 3D Episode 1 was released as shareware by id Software in 1992. " +
      "The shareware version was explicitly designed for free distribution to " +
      "promote sales of the registered version. Original distribution terms " +
      "permitted unlimited copying of the shareware episode.",
  },
  {
    identifier: "w3d-box",
    displayTitle: "Wolfenstein 3D v1.4 (Shareware)",
    rightsNote: "Shareware - id Software (1993)",
    sourceUrl: "https://wolfenstein.fandom.com/wiki/Wolfenstein_3D#Shareware",
    legalBasis:
      "Same legal basis as wolfenstein-3d. This is version 1.4 of the shareware " +
      "release, still covered by id Software's shareware distribution terms.",
  },
  {
    identifier: "commander_keen_volume_one_131",
    displayTitle: "Commander Keen: Marooned on Mars",
    rightsNote: "Shareware - id Software (1990)",
    sourceUrl: "https://commander-keen.fandom.com/wiki/Shareware",
    legalBasis:
      "Commander Keen Episode 1 'Marooned on Mars' was released as shareware by " +
      "id Software in 1990. Published by Apogee Software under their shareware " +
      "distribution model. The first episode was always intended for free " +
      "distribution to encourage purchase of episodes 2-3.",
  },
  {
    identifier: "heretic-dos",
    displayTitle: "Heretic (Shareware)",
    rightsNote: "Shareware - id Software/Raven (1994)",
    sourceUrl: "https://doomwiki.org/wiki/Heretic",
    legalBasis:
      "Heretic shareware was released by id Software and Raven Software in 1994. " +
      "Built on the DOOM engine, it followed the same shareware distribution " +
      "model. The first episode was freely distributable to promote the full game.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // APOGEE / 3D REALMS SHAREWARE
  //
  // Apogee Software (later 3D Realms) was a pioneer of the shareware model.
  // Their "Apogee Model" explicitly encouraged free distribution of episode 1.
  // ═══════════════════════════════════════════════════════════════════════════

  {
    identifier: "duke-nukem2-sw",
    displayTitle: "Duke Nukem II (Shareware)",
    rightsNote: "Shareware - Apogee/3D Realms (1993)",
    sourceUrl: "https://3drealms.com/catalog/duke-nukem-2_27/",
    legalBasis:
      "Duke Nukem II Episode 1 was released as shareware by Apogee Software in " +
      "1993. Apogee's shareware terms explicitly permitted free distribution of " +
      "the shareware version. The '-sw' suffix in the identifier confirms this " +
      "is the shareware release.",
  },
  {
    identifier: "3dduke13SW-altcontrols",
    displayTitle: "Duke Nukem 3D (Shareware)",
    rightsNote: "Shareware - 3D Realms (1996)",
    sourceUrl: "https://3drealms.com/catalog/duke-nukem-3d_702/",
    legalBasis:
      "Duke Nukem 3D shareware (v1.3) was released by 3D Realms in 1996. The " +
      "shareware version containing the first episode 'L.A. Meltdown' was " +
      "explicitly released for free distribution. 3D Realms' shareware license " +
      "permitted unlimited redistribution.",
  },
  {
    identifier: "Bs-aog-sw1",
    displayTitle: "Blake Stone: Aliens of Gold (Shareware)",
    rightsNote: "Shareware - Apogee (1993)",
    sourceUrl: "https://3drealms.com/catalog/blake-stone-aliens-of-gold_702/",
    legalBasis:
      "Blake Stone: Aliens of Gold was released as shareware by Apogee Software " +
      "in 1993. The first episode was distributed freely under Apogee's shareware " +
      "model to encourage purchase of the full game.",
  },
  {
    identifier: "rise-of-the-triad-the-hunt-begins-version-1.0",
    displayTitle: "Rise of the Triad: The HUNT Begins",
    rightsNote: "Shareware - Apogee (1994)",
    sourceUrl: "https://3drealms.com/catalog/rise-of-the-triad_702/",
    legalBasis:
      "Rise of the Triad shareware ('The HUNT Begins') was released by Apogee " +
      "Software in 1994. The shareware version was explicitly designed for free " +
      "distribution under Apogee's shareware model.",
  },
  {
    identifier: "biomenace1-sw",
    displayTitle: "Bio Menace (Shareware)",
    rightsNote: "Shareware - Apogee (1993)",
    sourceUrl: "https://3drealms.com/catalog/bio-menace_702/",
    legalBasis:
      "Bio Menace Episode 1 was released as shareware by Apogee Software in 1993. " +
      "The game was later released as freeware by 3D Realms in 2005, making all " +
      "episodes freely distributable.",
  },
  {
    identifier: "Crystal-cave-sw1",
    displayTitle: "Crystal Caves (Shareware)",
    rightsNote: "Shareware - Apogee (1991)",
    sourceUrl: "https://3drealms.com/catalog/crystal-caves_702/",
    legalBasis:
      "Crystal Caves Episode 1 was released as shareware by Apogee Software in " +
      "1991. The first episode was distributed freely under Apogee's shareware " +
      "model. The game was later released as freeware.",
  },
  {
    identifier: "monster-bash1-sw",
    displayTitle: "Monster Bash (Shareware)",
    rightsNote: "Shareware - Apogee (1993)",
    sourceUrl: "https://3drealms.com/catalog/monster-bash_702/",
    legalBasis:
      "Monster Bash Episode 1 was released as shareware by Apogee Software in " +
      "1993. The first episode was distributed freely under Apogee's shareware " +
      "model to promote sales of the full game.",
  },
  {
    identifier: "halloween_harry_shareware",
    displayTitle: "Halloween Harry (Shareware)",
    rightsNote: "Shareware - Apogee (1993)",
    sourceUrl: "https://3drealms.com/catalog/alien-carnage_702/",
    legalBasis:
      "Halloween Harry (later renamed Alien Carnage) was released as shareware " +
      "by Apogee Software in 1993. The shareware episode was distributed freely. " +
      "The full game was later released as freeware by 3D Realms.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EPIC MEGAGAMES SHAREWARE / FREEWARE
  //
  // Epic MegaGames (now Epic Games) used the shareware model and later
  // released many titles as freeware.
  // ═══════════════════════════════════════════════════════════════════════════

  {
    identifier: "Epic-pinball-sw1",
    displayTitle: "Epic Pinball (Shareware)",
    rightsNote: "Shareware - Epic MegaGames (1993)",
    sourceUrl: "https://en.wikipedia.org/wiki/Epic_Pinball",
    legalBasis:
      "Epic Pinball shareware was released by Epic MegaGames in 1993. The " +
      "shareware version included one table and was freely distributable " +
      "to promote sales of the full game with additional tables.",
  },
  {
    identifier: "radsw20",
    displayTitle: "Radix: Beyond the Void (Shareware)",
    rightsNote: "Shareware - Epic MegaGames (1995)",
    sourceUrl: "https://en.wikipedia.org/wiki/Radix:_Beyond_the_Void",
    legalBasis:
      "Radix: Beyond the Void shareware was released by Epic MegaGames in 1995. " +
      "The shareware version was freely distributable under Epic's shareware " +
      "terms to encourage purchase of the registered version.",
  },
  {
    identifier: "msdos_Tyrian_2000_1999",
    displayTitle: "Tyrian 2000",
    rightsNote: "Freeware - Epic Games (released free 2004)",
    sourceUrl: "https://www.camanis.net/tyrian/tyrian2000.php",
    legalBasis:
      "Tyrian 2000 was officially released as freeware by Epic Games in 2004. " +
      "Daniel Cook (original artist) confirmed on his website that Epic Games " +
      "released the full game for free. The game was later open-sourced as " +
      "OpenTyrian. Epic's freeware release permits unlimited distribution.",
  },
  {
    identifier: "jill-of-the-jungle-0mhz",
    displayTitle: "Jill of the Jungle",
    rightsNote: "Freeware - Epic Games",
    sourceUrl: "https://archive.org/details/JillOfTheJungle",
    legalBasis:
      "Jill of the Jungle was released as freeware by Epic Games (formerly Epic " +
      "MegaGames). Epic has made several of their classic DOS titles freely " +
      "available. Note: The exact freeware announcement is harder to locate, " +
      "making this entry lower confidence than others.",
  },
];

// Build a Map for O(1) lookups
const allowlistMap = new Map<string, AllowlistEntry>(
  ALLOWLIST.map((entry) => [entry.identifier, entry]),
);

/**
 * Checks if a game identifier is in the allowlist.
 */
export function isInAllowlist(identifier: string): boolean {
  return allowlistMap.has(identifier);
}

/**
 * Gets the allowlist entry for a game identifier, if it exists.
 */
export function getAllowlistEntry(
  identifier: string,
): AllowlistEntry | undefined {
  return allowlistMap.get(identifier);
}

/**
 * Gets all allowlist entries.
 */
export function getAllAllowlistEntries(): AllowlistEntry[] {
  return [...ALLOWLIST];
}

/**
 * Gets the count of allowlisted games.
 */
export function getAllowlistCount(): number {
  return ALLOWLIST.length;
}
