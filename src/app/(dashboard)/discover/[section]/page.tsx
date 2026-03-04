import { notFound } from 'next/navigation';
import { DiscoverCategoryView } from '@/components/discover/DiscoverCategoryView';
import { isDiscoverSection } from '@/lib/discover';

export default function DiscoverCategoryPage({
  params,
}: {
  params: { section: string };
}) {
  if (!isDiscoverSection(params.section)) {
    notFound();
  }

  return <DiscoverCategoryView section={params.section} />;
}
