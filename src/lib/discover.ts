export const DISCOVER_SECTIONS = [
  'trending',
  'trending_movies',
  'trending_tv',
  'now_playing',
  'upcoming',
  'on_the_air',
  'popular_movies',
  'popular_tv',
  'top_rated_movies',
  'top_rated_tv',
  'bollywood',
  'hollywood',
  'recommendations',
  'netflix',
  'prime',
  'disney',
  'apple',
  'max',
  'hulu',
] as const;

export type DiscoverSection = (typeof DISCOVER_SECTIONS)[number];

export const OTT_SECTION_IDS: Partial<Record<DiscoverSection, number>> = {
  netflix: 8,
  prime: 9,
  disney: 337,
  apple: 2,
  max: 1899,
  hulu: 15,
};

export const DISCOVER_LABELS: Record<DiscoverSection, string> = {
  trending: 'Trending',
  trending_movies: 'Trending Movies',
  trending_tv: 'Trending TV Shows',
  now_playing: 'Now In Theaters',
  upcoming: 'Coming Soon',
  on_the_air: 'Currently Airing',
  popular_movies: 'Popular Movies',
  popular_tv: 'Popular TV Shows',
  top_rated_movies: 'Top Rated Movies',
  top_rated_tv: 'Top Rated TV Shows',
  bollywood: 'Bollywood',
  hollywood: 'Hollywood',
  recommendations: 'Recommended For You',
  netflix: 'Netflix',
  prime: 'Prime Video',
  disney: 'Disney+',
  apple: 'Apple TV+',
  max: 'Max',
  hulu: 'Hulu',
};

export function isDiscoverSection(value: string): value is DiscoverSection {
  return DISCOVER_SECTIONS.includes(value as DiscoverSection);
}

export function defaultMediaTypeForSection(section: DiscoverSection): 'movie' | 'tv' {
  if (section === 'trending_tv') return 'tv';
  if (section === 'on_the_air') return 'tv';
  if (section === 'popular_tv') return 'tv';
  if (section === 'top_rated_tv') return 'tv';
  return 'movie';
}

export function sectionSupportsMediaToggle(section: DiscoverSection): boolean {
  if (section === 'trending') return true;
  if (section === 'recommendations') return true;
  if (section in OTT_SECTION_IDS) return true;
  return false;
}
