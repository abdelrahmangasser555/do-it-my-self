// Analytics export utilities — CSV and JSON export for bucket analytics
import type {
  AnalyticsSummary,
  BucketAnalytics,
  OverallCostSummary,
  ProjectExpense,
} from '@/lib/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function exportAnalyticsToCSV(
  summary: AnalyticsSummary,
  bucketAnalytics: BucketAnalytics[],
  costSummary?: OverallCostSummary,
  projectExpenses?: ProjectExpense[],
): string {
  const lines: string[] = [];

  // Summary section
  lines.push('# Summary');
  lines.push('Metric,Value');
  lines.push(`Total Projects,${summary.totalProjects}`);
  lines.push(`Total Buckets,${summary.totalBuckets}`);
  lines.push(`Total Files,${summary.totalFiles}`);
  lines.push(`Total Storage,${formatBytes(summary.totalStorageBytes)}`);
  lines.push(`Total Storage Bytes,${summary.totalStorageBytes}`);
  lines.push(`Est. Monthly Cost,$${summary.estimatedMonthlyCost.toFixed(4)}`);
  lines.push(`Projected Monthly Cost,$${summary.projectedMonthlyCost.toFixed(4)}`);
  lines.push('');

  // Cost breakdown section
  if (costSummary) {
    lines.push('# Cost Breakdown');
    lines.push('Service,Est. Cost/mo');
    lines.push(`S3 Storage,$${costSummary.s3StorageCost.toFixed(4)}`);
    lines.push(`S3 Requests,$${costSummary.s3RequestsCost.toFixed(4)}`);
    lines.push(`S3 Data Transfer,$${costSummary.s3DataTransferCost.toFixed(4)}`);
    lines.push(`CloudFront Transfer,$${costSummary.cfDataTransferCost.toFixed(4)}`);
    lines.push(`CloudFront Requests,$${costSummary.cfRequestsCost.toFixed(4)}`);
    lines.push(`Total,$${costSummary.totalMonthlyCost.toFixed(4)}`);
    lines.push('');
  }

  // Project expenses section
  if (projectExpenses && projectExpenses.length > 0) {
    lines.push('# Project Expenses');
    lines.push(
      'Project,Environment,Buckets,Files,Storage,Reads,Writes,Data Transfer,Total Cost/mo',
    );
    for (const pe of projectExpenses) {
      lines.push(
        [
          pe.projectName,
          pe.environment,
          pe.bucketCount,
          pe.totalFiles,
          formatBytes(pe.totalSizeBytes),
          pe.totalReadRequests,
          pe.totalWriteRequests,
          formatBytes(pe.totalDataTransferBytes),
          `$${pe.costBreakdown.total.toFixed(4)}`,
        ].join(','),
      );
    }
    lines.push('');
  }

  // Per-bucket section
  lines.push('# Bucket Breakdown');
  lines.push(
    'Bucket Name,Display Name,Region,Files,Storage Bytes,Storage,Reads,Writes,Orphans,Est. Cost/mo',
  );
  for (const b of bucketAnalytics) {
    lines.push(
      [
        b.bucketName,
        b.displayName,
        b.region,
        b.fileCount,
        b.totalSizeBytes,
        formatBytes(b.totalSizeBytes),
        b.readRequests,
        b.writeRequests,
        b.orphanedFiles,
        `$${b.estimatedMonthlyCost.toFixed(4)}`,
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function exportAnalyticsToJSON(
  summary: AnalyticsSummary,
  bucketAnalytics: BucketAnalytics[],
  costSummary?: OverallCostSummary,
  projectExpenses?: ProjectExpense[],
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      summary: {
        ...summary,
        totalStorageFormatted: formatBytes(summary.totalStorageBytes),
      },
      costBreakdown: costSummary
        ? {
            totalMonthlyCost: costSummary.totalMonthlyCost,
            projectedMonthlyCost: costSummary.projectedMonthlyCost,
            s3StorageCost: costSummary.s3StorageCost,
            s3RequestsCost: costSummary.s3RequestsCost,
            s3DataTransferCost: costSummary.s3DataTransferCost,
            cfDataTransferCost: costSummary.cfDataTransferCost,
            cfRequestsCost: costSummary.cfRequestsCost,
          }
        : null,
      projects:
        projectExpenses?.map((pe) => ({
          name: pe.projectName,
          environment: pe.environment,
          bucketCount: pe.bucketCount,
          totalFiles: pe.totalFiles,
          totalSizeBytes: pe.totalSizeBytes,
          totalSizeFormatted: formatBytes(pe.totalSizeBytes),
          reads: pe.totalReadRequests,
          writes: pe.totalWriteRequests,
          dataTransferBytes: pe.totalDataTransferBytes,
          monthlyCost: pe.costBreakdown.total,
        })) ?? [],
      buckets: bucketAnalytics.map((b) => ({
        ...b,
        totalSizeFormatted: formatBytes(b.totalSizeBytes),
      })),
    },
    null,
    2,
  );
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
