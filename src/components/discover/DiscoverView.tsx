'use client';

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Clapperboard,
  Calendar,
  Tv,
  Star,
  Globe2,
  Film,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { TMDBMedia } from '@/services/tmdb';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useInView(rootMargin = '300px') {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

function RowSkeleton() {
  return (
    <div className="flex gap-3 px-6 pb-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="w-28 flex-shrink-0">
          <div className="h-40 w-28 animate-pulse rounded-xl bg-gray-800/60" />
          <div className="mt-2 h-2.5 w-20 animate-pulse rounded bg-gray-800/60" />
          <div className="mt-1 h-2 w-12 animate-pulse rounded bg-gray-800/60" />
        </div>
      ))}
    </div>
  );
}

const PosterCard = memo(function PosterCard({
  item,
  onClick,
}: {
  item: TMDBMedia;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group w-28 flex-shrink-0 text-left">
      <div className="relative h-40 w-28 overflow-hidden rounded-xl border border-white/5 bg-gray-800 shadow-md transition-all group-hover:border-indigo-500/40 group-hover:shadow-lg group-hover:shadow-indigo-900/30">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            width={112}
            height={160}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {item.mediaType === 'movie' ? (
              <Film className="h-6 w-6 text-gray-600" />
            ) : (
              <Tv className="h-6 w-6 text-gray-600" />
            )}
          </div>
        )}

        {item.rating > 0 ? (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-yellow-400 backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-current" />
            {item.rating.toFixed(1)}
          </div>
        ) : null}

        {item.language && item.language !== 'en' ? (
          <div className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-300 backdrop-blur-sm">
            {item.language}
          </div>
        ) : null}

        {item.inJellyfin ? (
          <div className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 backdrop-blur-sm">
            <CheckCircle2 className="h-2.5 w-2.5" />
            In Jellyfin
          </div>
        ) : null}
      </div>

      <p className="mt-1.5 truncate px-0.5 text-xs font-medium text-gray-400 transition-colors group-hover:text-gray-200">
        {item.title}
      </p>
      {item.year ? <p className="px-0.5 text-[10px] text-gray-600">{item.year}</p> : null}
    </button>
  );
});

const ScrollRow = memo(function ScrollRow({
  section,
  label,
  icon: Icon,
  accent = 'text-gray-400',
  onSelect,
  mediaTypeParam,
  viewAllHref,
  priority = false,
}: {
  section: string;
  label: string;
  icon: React.ElementType;
  accent?: string;
  onSelect: (item: TMDBMedia) => void;
  mediaTypeParam?: 'movie' | 'tv';
  viewAllHref?: string;
  priority?: boolean;
}) {
  const { ref, inView } = useInView('300px');

  const swrKey =
    inView || priority
      ? mediaTypeParam
        ? `/api/discover?section=${section}&mediaType=${mediaTypeParam}`
        : `/api/discover?section=${section}`
      : null;

  const { data, isLoading, error } = useSWR<{ results: TMDBMedia[]; error?: string }>(
    swrKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = useCallback((dir: 'left' | 'right') => {
    rowRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  }, []);

  const items = data?.results ?? [];
  const hasError = !!error || !!data?.error;
  const showSkeleton = !swrKey || isLoading;

  return (
    <section ref={ref as React.RefObject<HTMLElement>}>
      <div className="mb-3 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accent}`} />
          <h2 className="text-sm font-semibold text-gray-200">{label}</h2>
          {!isLoading && items.length > 0 ? <span className="text-[10px] text-gray-600">{items.length}</span> : null}
        </div>

        <div className="flex items-center gap-2">
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="rounded-md px-2 py-1 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200"
            >
              View all
            </Link>
          ) : null}

          {items.length > 4 ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => scroll('left')}
                className="rounded-lg p-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="rounded-lg p-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showSkeleton ? <RowSkeleton /> : null}

      {!isLoading && hasError ? (
        <p className="px-6 text-xs text-red-500/60">
          {typeof data?.error === 'string' ? data.error : 'Failed to load section'}
        </p>
      ) : null}

      {!isLoading && !hasError && swrKey && items.length === 0 ? (
        <p className="px-6 text-xs text-gray-600">Nothing to show</p>
      ) : null}

      {items.length > 0 ? (
        <div ref={rowRef} className="scrollbar-none flex gap-3 overflow-x-auto px-6 pb-3">
          {items.map((item) => (
            <PosterCard key={`${item.mediaType}-${item.tmdbId}`} item={item} onClick={() => onSelect(item)} />
          ))}
        </div>
      ) : null}
    </section>
  );
});

const OTT_SECTIONS = [
  { section: 'netflix', label: 'Netflix', color: '#E50914', logo: '/logos/netflix.svg' },
  { section: 'prime', label: 'Prime Video', color: '#00A8E1', logo: '/logos/prime-video.svg' },
  { section: 'disney', label: 'Disney+', color: '#113CCF', logo: '/logos/disney-plus.svg' },
  { section: 'apple', label: 'Apple TV+', color: '#888888', logo: '/logos/apple-tv.svg' },
  { section: 'max', label: 'Max', color: '#002BE7', logo: '/logos/max2.svg' },
  { section: 'hulu', label: 'Hulu', color: '#1CE783', logo: '/logos/hulu.svg' },
];

const SECTIONS = [
  { section: 'trending_movies', label: 'Trending Movies', icon: TrendingUp, accent: 'text-indigo-400' },
  { section: 'trending_tv', label: 'Trending Shows', icon: TrendingUp, accent: 'text-purple-400' },
  { section: 'recommendations', label: 'Recommended For You', icon: Star, accent: 'text-yellow-400' },
  { section: 'now_playing', label: 'Now In Theaters', icon: Clapperboard, accent: 'text-orange-400' },
  { section: 'upcoming', label: 'Coming Soon', icon: Calendar, accent: 'text-pink-400' },
  { section: 'on_the_air', label: 'Currently Airing', icon: Tv, accent: 'text-blue-400' },
  { section: 'bollywood', label: 'Bollywood', icon: Globe2, accent: 'text-amber-400' },
  { section: 'hollywood', label: 'Hollywood', icon: Film, accent: 'text-red-400' },
  { section: 'top_rated_movies', label: 'Top Rated Movies', icon: Star, accent: 'text-green-400' },
  { section: 'top_rated_tv', label: 'Top Rated Shows', icon: Star, accent: 'text-teal-400' },
];

export function DiscoverView() {
  const router = useRouter();
  const [activeOtt, setActiveOtt] = useState(OTT_SECTIONS[0].section);
  const [ottMediaType, setOttMediaType] = useState<'movie' | 'tv'>('movie');

  const handleSelect = useCallback(
    (item: TMDBMedia) => {
      const target = item.mediaType === 'movie' ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`;
      router.push(target);
    },
    [router]
  );

  const activeOttData = OTT_SECTIONS.find((item) => item.section === activeOtt) ?? OTT_SECTIONS[0];

  return (
    <div className="space-y-8 py-6">
      <div className="px-6">
        <h1 className="text-xl font-bold text-white">Discover</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse trending content, new releases, and streaming picks.
        </p>
      </div>

      <div className="space-y-3 px-6">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {OTT_SECTIONS.map((ott) => {
            const isActive = activeOtt === ott.section;
            return (
              <button
                key={ott.section}
                onClick={() => setActiveOtt(ott.section)}
                className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'border-2 text-white'
                    : 'border border-white/5 bg-gray-900/60 text-gray-400 hover:border-white/10 hover:text-gray-200'
                }`}
                style={isActive ? { borderColor: ott.color, backgroundColor: `${ott.color}22` } : {}}
              >
                <Image src={ott.logo} alt={ott.label} width={18} height={18} className="object-contain" unoptimized />
                {ott.label}
              </button>
            );
          })}
        </div>

        <div className="flex w-fit items-center gap-1 rounded-lg border border-white/5 bg-gray-900/60 p-0.5">
          <button
            onClick={() => setOttMediaType('movie')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              ottMediaType === 'movie' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Film className="h-3 w-3" />
            Movies
          </button>
          <button
            onClick={() => setOttMediaType('tv')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              ottMediaType === 'tv' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Tv className="h-3 w-3" />
            TV Shows
          </button>
        </div>
      </div>

      <ScrollRow
        key={`${activeOtt}-${ottMediaType}`}
        section={activeOtt}
        label={`${activeOttData.label} — ${ottMediaType === 'movie' ? 'Movies' : 'TV Shows'}`}
        icon={Tv}
        accent="text-indigo-400"
        onSelect={handleSelect}
        mediaTypeParam={ottMediaType}
        viewAllHref={`/discover/${activeOtt}?mediaType=${ottMediaType}`}
        priority
      />

      <div className="px-6">
        <div className="h-px bg-white/5" />
      </div>

      {SECTIONS.map((section, index) => (
        <ScrollRow
          key={section.section}
          section={section.section}
          label={section.label}
          icon={section.icon}
          accent={section.accent}
          onSelect={handleSelect}
          viewAllHref={`/discover/${section.section}`}
          priority={index < 2}
        />
      ))}
    </div>
  );
}
