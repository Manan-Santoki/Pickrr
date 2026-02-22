import { HistoryTable } from '@/components/history/HistoryTable';

export default function HistoryPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">History</h1>
        <p className="text-sm text-gray-500 mt-1">Completed and failed Pickrr downloads.</p>
      </div>
      <HistoryTable />
    </div>
  );
}
