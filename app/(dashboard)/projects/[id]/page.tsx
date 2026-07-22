import ProjectDetailPage from '@/features/projects/components/project-detail-page';

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <ProjectDetailPage {...props} />;
}
