import { MediaDetailView } from '@/components/media/MediaDetailView';

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const tmdbId = Number(params.id);
  return <MediaDetailView tmdbId={tmdbId} mediaType="movie" />;
}
