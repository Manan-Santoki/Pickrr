import { auth } from '@/lib/auth';
import { DiscoverView } from '@/components/discover/DiscoverView';

export default async function DiscoverPage() {
  await auth(); // ensure session
  return <DiscoverView />;
}
