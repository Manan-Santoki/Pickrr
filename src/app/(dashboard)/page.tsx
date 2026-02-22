import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import {
  ListFilter,
  Download,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Film,
  Tv,
} from 'lucide-react';

async function getStats() {
  const [awaiting, downloading, done, available, processing, total] = await Promise.all([
    db.request.count({ where: { status: { in: ['awaiting_selection', 'selected'] } } }),
    db.request.count({ where: { status: 'downloading' } }),
    db.request.count({ where: { status: 'done' } }),
    db.request.count({ where: { status: 'available' } }),
    db.request.count({ where: { status: 'processing' } }),
    db.request.count(),
  ]);
  return { awaiting, downloading, done, available, processing, total };
}

async function getRecentRequests() {
  return db.request.findMany({
    where: { status: { in: ['awaiting_selection', 'selected', 'downloading'] } },
    orderBy: { requestedAt: 'desc' },
    take: 6,
    select: {
      id: true, title: true, year: true, mediaType: true,
      status: true, requestedBy: true, posterPath: true, requestedAt: true,
    },
  });
}

const statusLabel: Record<string, { text: string; className: string }> = {
  awaiting_selection: { text: 'Needs Selection', className: 'text-yellow-400 bg-yellow-400/10' },
  selected:           { text: 'Selected',         className: 'text-indigo-400 bg-indigo-400/10' },
  downloading:        { text: 'Downloading',       className: 'text-blue-400 bg-blue-400/10' },
  processing:         { text: 'Processing',        className: 'text-purple-400 bg-purple-400/10' },
  available:          { text: 'Available',         className: 'text-green-400 bg-green-400/10' },
  done:               { text: 'Done',              className: 'text-green-400 bg-green-400/10' },
};

export default async function DashboardPage() {
  const session = await auth();
  const userName = (session?.user as { name?: string })?.name ?? 'User';
  const [stats, recent] = await Promise.all([getStats(), getRecentRequests()]);

  const statCards = [
    { label: 'Needs Selection', value: stats.awaiting, icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', href: '/requests?status=awaiting' },
    { label: 'Downloading',     value: stats.downloading, icon: Download,  color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   href: '/downloads' },
    { label: 'Processing',      value: stats.processing, icon: Zap,        color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', href: '/requests?status=processing' },
    { label: 'Available',       value: stats.available + stats.done, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', href: '/history' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-indigo-400">{userName}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {stats.total} total requests · {stats.awaiting} need your attention
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group p-4 rounded-xl border ${card.border} bg-gray-900/50 hover:bg-gray-900 transition-all`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <ArrowRight className="w-3 h-3 text-gray-700 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Needs Attention</h2>
            <Link href="/requests" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {recent.map((req) => {
              const s = statusLabel[req.status] ?? { text: req.status, className: 'text-gray-400 bg-gray-400/10' };
              return (
                <Link
                  key={req.id}
                  href="/requests"
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/60 border border-white/5 hover:border-white/10 transition-all group"
                >
                  {req.posterPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.posterPath} alt={req.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-800" />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                      {req.mediaType === 'movie' ? <Film className="w-4 h-4 text-gray-600" /> : <Tv className="w-4 h-4 text-gray-600" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                      {req.title}
                      {req.year && <span className="text-gray-500 font-normal ml-1">({req.year})</span>}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">{req.requestedBy}</p>
                    <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${s.className}`}>{s.text}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {recent.length === 0 && stats.total === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-800 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center mb-4">
            <ListFilter className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No requests yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Go to Requests and sync from Overseerr to import existing requests.
          </p>
          <Link href="/requests" className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
            Go to Requests
          </Link>
        </div>
      )}
    </div>
  );
}
