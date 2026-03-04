import { DownloadList } from '@/components/downloads/DownloadList';

export default function DownloadsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Downloads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Active and completed torrents from qBittorrent.
        </p>
      </div>
      <DownloadList />
    </div>
  );
}
