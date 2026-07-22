import BucketDetailPage from '@/features/buckets/components/bucket-detail-page';

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <BucketDetailPage {...props} />;
}
