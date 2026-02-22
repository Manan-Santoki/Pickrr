'use client';

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import {
  TrendingUp, Clapperboard, Calendar, Tv, Star,
  Globe2, Film, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { TorrentSelectModal } from '@/components/requests/TorrentSelectModal';
import type { TMDBMedia } from '@/services/tmdb';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── useInView — fires once when element scrolls near viewport ─────────────────

function useInView(rootMargin = '300px') {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex gap-3 px-6 pb-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-28">
          <div className="w-28 h-40 rounded-xl bg-gray-800/60 animate-pulse" />
          <div className="mt-2 h-2.5 w-20 bg-gray-800/60 rounded animate-pulse" />
          <div className="mt-1 h-2 w-12 bg-gray-800/60 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ── Poster card ───────────────────────────────────────────────────────────────

const PosterCard = memo(function PosterCard({
  item,
  onClick,
}: {
  item: TMDBMedia;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex-shrink-0 w-28 text-left"
    >
      <div className="w-28 h-40 rounded-xl overflow-hidden bg-gray-800 border border-white/5 group-hover:border-indigo-500/40 transition-all shadow-md group-hover:shadow-indigo-900/30 group-hover:shadow-lg relative">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            width={112}
            height={160}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.mediaType === 'movie'
              ? <Film className="w-6 h-6 text-gray-600" />
              : <Tv className="w-6 h-6 text-gray-600" />}
          </div>
        )}
        {item.rating > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-yellow-400">
            <Star className="w-2.5 h-2.5 fill-current" />
            {item.rating.toFixed(1)}
          </div>
        )}
        {item.language && item.language !== 'en' && (
          <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-gray-300">
            {item.language}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-xs text-gray-400 font-medium truncate group-hover:text-gray-200 transition-colors px-0.5">
        {item.title}
      </p>
      {item.year && (
        <p className="text-[10px] text-gray-600 px-0.5">{item.year}</p>
      )}
    </button>
  );
});

// ── Scroll row — lazy loaded via IntersectionObserver ─────────────────────────

const ScrollRow = memo(function ScrollRow({
  section,
  label,
  icon: Icon,
  accent = 'text-gray-400',
  onSelect,
  mediaTypeParam,
  priority = false,
}: {
  section: string;
  label: string;
  icon: React.ElementType;
  accent?: string;
  onSelect: (item: TMDBMedia) => void;
  mediaTypeParam?: 'movie' | 'tv';
  priority?: boolean;
}) {
  const { ref, inView } = useInView('300px');

  // Pass null key until row is in view — pauses SWR fetch
  const swrKey = (inView || priority)
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
  const hasError = error || data?.error;
  const showSkeleton = !swrKey || isLoading;

  return (
    <section ref={ref as React.RefObject<HTMLElement>}>
      <div className="flex items-center justify-between mb-3 px-6">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accent}`} />
          <h2 className="text-sm font-semibold text-gray-200">{label}</h2>
          {!isLoading && items.length > 0 && (
            <span className="text-[10px] text-gray-600">{items.length}</span>
          )}
        </div>
        {items.length > 4 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {showSkeleton && <RowSkeleton />}

      {!isLoading && hasError && (
        <p className="px-6 text-xs text-red-500/60">
          {typeof data?.error === 'string' ? data.error : 'Failed to load — check TMDB API key in Settings'}
        </p>
      )}

      {!isLoading && !hasError && swrKey && items.length === 0 && (
        <p className="px-6 text-xs text-gray-600">Nothing to show</p>
      )}

      {items.length > 0 && (
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto px-6 pb-3 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((item) => (
            <PosterCard
              key={`${item.mediaType}-${item.tmdbId}`}
              item={item}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
});

// ── OTT strip — with real logos ───────────────────────────────────────────────

const OTT_SECTIONS = [
  { section: 'netflix', label: 'Netflix',     color: '#E50914', logo: '/logos/netflix.svg'      },
  { section: 'prime',   label: 'Prime Video', color: '#00A8E1', logo: '/logos/prime-video.svg'  },
  { section: 'disney',  label: 'Disney+',     color: '#113CCF', logo: '/logos/disney-plus.svg'  },
  { section: 'apple',   label: 'Apple TV+',   color: '#888888', logo: '/logos/apple-tv.svg'     },
  { section: 'max',     label: 'Max',         color: '#002BE7', logo: '/logos/max2.svg'          },
  { section: 'hulu',    label: 'Hulu',        color: '#1CE783', logo: '/logos/hulu.svg'           },
];

// ── All discover sections ─────────────────────────────────────────────────────

const SECTIONS = [
  { section: 'trending_movies',  label: 'Trending Movies',       icon: TrendingUp,   accent: 'text-indigo-400' },
  { section: 'trending_tv',      label: 'Trending Shows',        icon: TrendingUp,   accent: 'text-purple-400' },
  { section: 'recommendations',  label: 'Recommended For You',   icon: Star,         accent: 'text-yellow-400' },
  { section: 'now_playing',      label: 'Now In Theaters',       icon: Clapperboard, accent: 'text-orange-400' },
  { section: 'upcoming',         label: 'Coming Soon',           icon: Calendar,     accent: 'text-pink-400'   },
  { section: 'on_the_air',       label: 'Currently Airing',      icon: Tv,           accent: 'text-blue-400'   },
  { section: 'bollywood',        label: 'Bollywood',             icon: Globe2,       accent: 'text-amber-400'  },
  { section: 'hollywood',        label: 'Hollywood',             icon: Film,         accent: 'text-red-400'    },
  { section: 'top_rated_movies', label: 'Top Rated Movies',      icon: Star,         accent: 'text-green-400'  },
  { section: 'top_rated_tv',     label: 'Top Rated Shows',       icon: Star,         accent: 'text-teal-400'   },
];

// ── Full discover view ────────────────────────────────────────────────────────

export function DiscoverView() {
  const [selected, setSelected]       = useState<TMDBMedia | null>(null);
  const [activeOTT, setActiveOTT]     = useState(OTT_SECTIONS[0].section);
  const [ottMediaType, setOttMediaType] = useState<'movie' | 'tv'>('movie');

  const handleSelect = useCallback((item: TMDBMedia) => setSelected(item), []);
  const handleClose  = useCallback(() => setSelected(null), []);

  const activeOTTData = OTT_SECTIONS.find((o) => o.section === activeOTT)!;

  return (
    <div className="py-6 space-y-8">
      {/* Header */}
      <div className="px-6">
        <h1 className="text-xl font-bold text-white">Discover</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse trending content, new releases, and streaming picks — click any title to find torrents.
        </p>
      </div>

      {/* OTT selector strip */}
      <div className="px-6 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {OTT_SECTIONS.map((ott) => {
            const isActive = activeOTT === ott.section;
            return (
              <button
                key={ott.section}
                onClick={() => setActiveOTT(ott.section)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'border-2 text-white'
                    : 'bg-gray-900/60 border border-white/5 text-gray-400 hover:text-gray-200 hover:border-white/10'
                }`}
                style={isActive ? { borderColor: ott.color, backgroundColor: `${ott.color}22` } : {}}
              >
                {ott.logo ? (
                  <Image
                    src={ott.logo}
                    alt={ott.label}
                    width={18}
                    height={18}
                    className="object-contain flex-shrink-0"
                    unoptimized
                  />
                ) : (
                  <span className="w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: ott.color }}>H</span>
                )}
                {ott.label}
              </button>
            );
          })}
        </div>

        {/* Movies / TV pill toggle */}
        <div className="flex items-center gap-1 bg-gray-900/60 border border-white/5 rounded-lg p-0.5 w-fit">
          <button
            onClick={() => setOttMediaType('movie')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              ottMediaType === 'movie' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Film className="w-3 h-3" />
            Movies
          </button>
          <button
            onClick={() => setOttMediaType('tv')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              ottMediaType === 'tv' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Tv className="w-3 h-3" />
            TV Shows
          </button>
        </div>
      </div>

      {/* Active OTT row — priority (always fetches immediately) */}
      <ScrollRow
        key={`${activeOTT}-${ottMediaType}`}
        section={activeOTT}
        label={`${activeOTTData.label} — ${ottMediaType === 'movie' ? 'Movies' : 'TV Shows'}`}
        icon={Tv}
        accent="text-indigo-400"
        onSelect={handleSelect}
        mediaTypeParam={ottMediaType}
        priority
      />

      <div className="px-6">
        <div className="h-px bg-white/5" />
      </div>

      {/* All other sections — lazy loaded */}
      {SECTIONS.map((s, i) => (
        <ScrollRow
          key={s.section}
          section={s.section}
          label={s.label}
          icon={s.icon}
          accent={s.accent}
          onSelect={handleSelect}
          priority={i < 2}
        />
      ))}

      {selected && (
        <TorrentSelectModal
          requestId=""
          title={selected.title}
          mediaType={selected.mediaType}
          seasons={null}
          existingTorrents={[]}
          open={true}
          onClose={handleClose}
          onSuccess={handleClose}
        />
      )}
    </div>
  );
}
