const TMDB_BASE = process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3';
const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? 'https://image.tmdb.org/t/p/w500';

export interface TMDBMedia {
  tmdbId: number;
  title: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  mediaType: 'movie' | 'tv';
}

export async function getTMDBMetadata(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<TMDBMedia | null> {
  try {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const res = await fetch(
      `${TMDB_BASE}/${endpoint}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`,
      { next: { revalidate: 86400 } } // cache 24h
    );

    if (!res.ok) return null;
    const data = await res.json();

    const title = mediaType === 'movie' ? data.title : data.name;
    const releaseDate = mediaType === 'movie' ? data.release_date : data.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

    return {
      tmdbId,
      title,
      year,
      overview: data.overview ?? '',
      posterUrl: data.poster_path ? `${TMDB_IMAGE}${data.poster_path}` : null,
      backdropUrl: data.backdrop_path
        ? `${TMDB_IMAGE}${data.backdrop_path}`
        : null,
      rating: data.vote_average ?? 0,
      mediaType,
    };
  } catch {
    return null;
  }
}
