import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Storage Control Room — Self-Host Your Files",
  description:
    "Stop paying providers. Self-host your S3 + CloudFront file infrastructure with a dashboard that actually makes sense.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
