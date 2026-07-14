/**
 * Rank ladder configuration — tune thresholds/colors here without touching UI code.
 * XP thresholds are the minimum total XP required to enter each tier.
 */

export type RankTier = {
  id: string;
  name: string;
  minXp: number;
  /** Primary accent used for the badge + progress bar. */
  color: string;
  /** Soft background tint behind the badge icon. */
  tint: string;
  /** Atmospheric layer the rank is based on. */
  basis: string;
  /** Short vibe label from the rank ladder. */
  vibe: string;
  /** Short flavor line shown in the rank ladder modal. */
  tagline: string;
  /** Path to the badge PNG in /public. */
  badgeImage: string;
};

/** Bump when badge artwork is replaced so browsers skip stale cache. */
export const RANK_BADGE_ASSET_VERSION = '6';

function badgeUrl(file: string) {
  return `/badges/ranks/${file}.png?v=${RANK_BADGE_ASSET_VERSION}`;
}

export const RANK_TIERS: RankTier[] = [
  {
    id: 'ground-zero',
    name: 'Ground Zero',
    minXp: 0,
    color: '#5B9BD5',
    tint: 'rgba(91, 155, 213, 0.16)',
    basis: 'Sea Level',
    vibe: 'Foundation',
    tagline: 'Everyone starts at sea level.',
    badgeImage: badgeUrl('ground-zero'),
  },
  {
    id: 'drifter',
    name: 'Drifter',
    minXp: 300,
    color: '#7A9E7E',
    tint: 'rgba(122, 158, 126, 0.16)',
    basis: 'Troposphere',
    vibe: 'Moving',
    tagline: 'Moving with the current, finding your crowd.',
    badgeImage: badgeUrl('drifter'),
  },
  {
    id: 'skywalker',
    name: 'Skywalker',
    minXp: 800,
    color: '#2E5EAA',
    tint: 'rgba(46, 94, 170, 0.16)',
    basis: 'Stratosphere',
    vibe: 'Active',
    tagline: 'Head in the clouds, feet on the court.',
    badgeImage: badgeUrl('skywalker'),
  },
  {
    id: 'firestreak',
    name: 'Firestreak',
    minXp: 1600,
    color: '#E8702A',
    tint: 'rgba(232, 112, 42, 0.16)',
    basis: 'Mesosphere',
    vibe: 'High Intensity',
    tagline: 'Burning through events back to back.',
    badgeImage: badgeUrl('firestreak'),
  },
  {
    id: 'edgewalker',
    name: 'Edgewalker',
    minXp: 2800,
    color: '#6C5CE7',
    tint: 'rgba(108, 92, 231, 0.16)',
    basis: 'Thermosphere',
    vibe: 'Elite Edge',
    tagline: 'Walking the starry edge of the scene.',
    badgeImage: badgeUrl('edgewalker'),
  },
  {
    id: 'voidrunner',
    name: 'Voidrunner',
    minXp: 4500,
    color: '#1C1C1E',
    tint: 'rgba(28, 28, 30, 0.22)',
    basis: 'Exosphere',
    vibe: 'Rare Air',
    tagline: 'Past the noise. Into the void.',
    badgeImage: badgeUrl('voidrunner'),
  },
  {
    id: 'orbiter',
    name: 'Orbiter',
    minXp: 7000,
    color: '#D4A017',
    tint: 'rgba(212, 160, 23, 0.18)',
    basis: 'Orbit LEO',
    vibe: 'Top Tier',
    tagline: 'The scene revolves around you now.',
    badgeImage: badgeUrl('orbiter'),
  },
  {
    id: 'zenith',
    name: 'Zenith',
    minXp: 10000,
    color: '#EFE3B0',
    tint: 'rgba(239, 227, 176, 0.24)',
    basis: 'Deep Space',
    vibe: 'Summit',
    tagline: 'Supernova. Nothing above but sky.',
    badgeImage: badgeUrl('zenith'),
  },
];

export function getRankTierById(id: string): RankTier | undefined {
  return RANK_TIERS.find((t) => t.id === id);
}

export type RankProgress = {
  tier: RankTier;
  tierIndex: number;
  nextTier: RankTier | null;
  xp: number;
  /** XP earned inside the current tier. */
  xpIntoTier: number;
  /** XP needed to go from this tier to the next (0 when max rank). */
  xpTierSpan: number;
  /** 0..1 progress toward the next tier (1 when max rank). */
  progress: number;
  isMaxRank: boolean;
};

export function getRankForXp(xp: number): RankProgress {
  let tierIndex = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (xp >= RANK_TIERS[i].minXp) {
      tierIndex = i;
      break;
    }
  }

  const tier = RANK_TIERS[tierIndex];
  const nextTier = RANK_TIERS[tierIndex + 1] ?? null;
  const xpIntoTier = xp - tier.minXp;
  const xpTierSpan = nextTier ? nextTier.minXp - tier.minXp : 0;

  return {
    tier,
    tierIndex,
    nextTier,
    xp,
    xpIntoTier,
    xpTierSpan,
    progress: nextTier ? Math.min(1, xpIntoTier / xpTierSpan) : 1,
    isMaxRank: !nextTier,
  };
}
