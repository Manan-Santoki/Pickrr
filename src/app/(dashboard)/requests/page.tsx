import { auth } from '@/lib/auth';
import { RequestsView } from '@/components/requests/RequestsView';

export default async function RequestsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? 'viewer';

  return <RequestsView userRole={role} />;
}
