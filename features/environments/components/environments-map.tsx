// Reusable world map showing AWS regions with bucket distribution
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Map as MapGL,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
} from '@/components/ui/map';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Globe,
  CheckCircle,
  AlertCircle,
  Rocket,
  MapPin,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { AWS_REGIONS } from '@/lib/validations';
import type { BootstrappedEnvironment } from '@/lib/types';
import type { ChartConfig } from '@/components/ui/chart';

// ── AWS region coordinates ──────────────────────────────────────────────────

const AWS_REGION_COORDS: Record<
  string,
  { lat: number; lng: number; country: string; flag: string }
> = {
  'us-east-1': { lat: 38.95, lng: -77.45, country: 'United States', flag: '🇺🇸' },
  'us-east-2': { lat: 40.42, lng: -82.91, country: 'United States', flag: '🇺🇸' },
  'us-west-1': { lat: 37.35, lng: -121.96, country: 'United States', flag: '🇺🇸' },
  'us-west-2': { lat: 46.15, lng: -123.88, country: 'United States', flag: '🇺🇸' },
  'ca-central-1': { lat: 45.5, lng: -73.6, country: 'Canada', flag: '🇨🇦' },
  'ca-west-1': { lat: 51.05, lng: -114.07, country: 'Canada', flag: '🇨🇦' },
  'eu-west-1': { lat: 53.35, lng: -6.26, country: 'Ireland', flag: '🇮🇪' },
  'eu-west-2': { lat: 51.51, lng: -0.13, country: 'United Kingdom', flag: '🇬🇧' },
  'eu-west-3': { lat: 48.86, lng: 2.35, country: 'France', flag: '🇫🇷' },
  'eu-central-1': { lat: 50.11, lng: 8.68, country: 'Germany', flag: '🇩🇪' },
  'eu-central-2': { lat: 47.37, lng: 8.54, country: 'Switzerland', flag: '🇨🇭' },
  'eu-north-1': { lat: 59.33, lng: 18.07, country: 'Sweden', flag: '🇸🇪' },
  'eu-south-1': { lat: 45.46, lng: 9.19, country: 'Italy', flag: '🇮🇹' },
  'eu-south-2': { lat: 40.42, lng: -3.7, country: 'Spain', flag: '🇪🇸' },
  'ap-southeast-1': { lat: 1.35, lng: 103.82, country: 'Singapore', flag: '🇸🇬' },
  'ap-southeast-2': { lat: -33.87, lng: 151.21, country: 'Australia', flag: '🇦🇺' },
  'ap-southeast-3': { lat: -6.21, lng: 106.85, country: 'Indonesia', flag: '🇮🇩' },
  'ap-southeast-4': { lat: -37.81, lng: 144.96, country: 'Australia', flag: '🇦🇺' },
  'ap-northeast-1': { lat: 35.69, lng: 139.69, country: 'Japan', flag: '🇯🇵' },
  'ap-northeast-2': { lat: 37.57, lng: 126.98, country: 'South Korea', flag: '🇰🇷' },
  'ap-northeast-3': { lat: 34.69, lng: 135.5, country: 'Japan', flag: '🇯🇵' },
  'ap-south-1': { lat: 19.08, lng: 72.88, country: 'India', flag: '🇮🇳' },
  'ap-south-2': { lat: 17.39, lng: 78.49, country: 'India', flag: '🇮🇳' },
  'ap-east-1': { lat: 22.32, lng: 114.17, country: 'Hong Kong', flag: '🇭🇰' },
  'sa-east-1': { lat: -23.55, lng: -46.63, country: 'Brazil', flag: '🇧🇷' },
  'me-south-1': { lat: 26.07, lng: 50.55, country: 'Bahrain', flag: '🇧🇭' },
  'me-central-1': { lat: 24.45, lng: 54.65, country: 'UAE', flag: '🇦🇪' },
  'af-south-1': { lat: -33.93, lng: 18.42, country: 'South Africa', flag: '🇿🇦' },
  'il-central-1': { lat: 32.07, lng: 34.78, country: 'Israel', flag: '🇮🇱' },
};

// ── Props ───────────────────────────────────────────────────────────────────

interface BucketRegionCount {
  region: string;
  count: number;
}

export interface EnvironmentsMapProps {
  environments: BootstrappedEnvironment[];
  bucketsByRegion?: BucketRegionCount[];
  loading?: boolean;
  bootstrapping?: boolean;
  onActivate?: (region: string) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  onRefresh?: () => void;
  /** Compact mode for embedding (e.g. onboarding) */
  compact?: boolean;
  /** Available regions to bootstrap (pass filtered list) */
  availableRegions?: typeof AWS_REGIONS;
  /** AWS account ID for bootstrap calls */
  accountId?: string;
}

// ── Chart config ────────────────────────────────────────────────────────────

const chartConfig: ChartConfig = {
  buckets: {
    label: 'Buckets',
    color: 'var(--color-chart-1)',
  },
};

// ── Color intensity based on bucket count ───────────────────────────────────

function getMarkerColor(bucketCount: number, isActive: boolean, isFailed: boolean): string {
  if (isFailed) return 'bg-red-500';
  if (!isActive) return 'bg-yellow-500';
  if (bucketCount === 0) return 'bg-emerald-400';
  if (bucketCount <= 2) return 'bg-emerald-500';
  if (bucketCount <= 5) return 'bg-blue-500';
  if (bucketCount <= 10) return 'bg-violet-500';
  return 'bg-fuchsia-500';
}

function getMarkerSize(bucketCount: number, isActive: boolean): number {
  if (!isActive) return 14;
  if (bucketCount === 0) return 16;
  if (bucketCount <= 2) return 20;
  if (bucketCount <= 5) return 26;
  if (bucketCount <= 10) return 32;
  return 38;
}

function getPulseRing(isActive: boolean, isFailed: boolean): string {
  if (isFailed) return 'ring-red-500/30';
  if (!isActive) return 'ring-yellow-500/30';
  return 'ring-emerald-500/20';
}

// ── Main component ──────────────────────────────────────────────────────────

export function EnvironmentsMap({
  environments,
  bucketsByRegion = [],
  loading = false,
  bootstrapping = false,
  onActivate,
  onRemove,
  onRefresh,
  compact = false,
  availableRegions,
  accountId,
}: EnvironmentsMapProps) {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [activatingRegion, setActivatingRegion] = useState<string | null>(null);

  const bucketCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bucketsByRegion) m.set(b.region, b.count);
    return m;
  }, [bucketsByRegion]);

  const envMap = useMemo(() => {
    const m = new Map<string, BootstrappedEnvironment>();
    for (const e of environments) m.set(e.region, e);
    return m;
  }, [environments]);

  // Chart data — top regions by buckets
  const chartData = useMemo(() => {
    return environments
      .filter((e) => e.status === 'active')
      .map((e) => ({
        region: e.region.replace(/-/g, '\u2011'), // non-breaking hyphens
        shortLabel: e.region.split('-').slice(0, 2).join('-'),
        buckets: bucketCountMap.get(e.region) || 0,
        fill: 'var(--color-chart-1)',
      }))
      .sort((a, b) => b.buckets - a.buckets)
      .slice(0, 8);
  }, [environments, bucketCountMap]);

  const activeCount = environments.filter((e) => e.status === 'active').length;
  const totalBuckets = bucketsByRegion.reduce((s, b) => s + b.count, 0);

  // All regions to show on map (active envs + all AWS regions faded)
  const allRegionsOnMap = useMemo(() => {
    return AWS_REGIONS.map((r) => {
      const coords = AWS_REGION_COORDS[r.value];
      if (!coords) return null;
      const env = envMap.get(r.value);
      const buckets = bucketCountMap.get(r.value) || 0;
      return {
        region: r.value,
        label: r.label,
        ...coords,
        env,
        buckets,
        isActive: env?.status === 'active',
        isFailed: env?.status === 'failed',
        isBootstrapping: env?.status === 'bootstrapping',
        isAvailable: !env,
      };
    }).filter(Boolean) as {
      region: string;
      label: string;
      lat: number;
      lng: number;
      country: string;
      flag: string;
      env?: BootstrappedEnvironment;
      buckets: number;
      isActive: boolean;
      isFailed: boolean;
      isBootstrapping: boolean;
      isAvailable: boolean;
    }[];
  }, [envMap, bucketCountMap]);

  const handleActivate = useCallback(
    async (region: string) => {
      if (!onActivate) return;
      setActivatingRegion(region);
      try {
        await onActivate(region);
      } finally {
        setActivatingRegion(null);
      }
    },
    [onActivate],
  );

  const filteredAvailable = availableRegions ?? AWS_REGIONS.filter((r) => !envMap.has(r.value));
  const mapHeight = compact ? '22rem' : '34rem';

  return (
    <div className="space-y-4">
      {/* ── Region selector + activate (above map) ──────────── */}
      {onActivate && (
        <div className="flex items-center gap-3">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select a region to activate..." />
            </SelectTrigger>
            <SelectContent>
              {filteredAvailable.map((r) => {
                const coords = AWS_REGION_COORDS[r.value];
                return (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex items-center gap-2">
                      {coords && <span>{coords.flag}</span>}
                      <MapPin className="size-3 text-muted-foreground" />
                      {r.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            disabled={!selectedRegion || bootstrapping}
            onClick={() => {
              if (selectedRegion) {
                handleActivate(selectedRegion);
                setSelectedRegion('');
              }
            }}
          >
            {bootstrapping ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Activate Region
          </Button>
        </div>
      )}

      {/* ── Map + Overview overlay ──────────────────────────── */}
      <div className="relative rounded-xl overflow-hidden border" style={{ height: mapHeight }}>
        <MapGL center={[15, 20]} zoom={compact ? 1 : 1.5} scrollZoom={false} renderWorldCopies>
          <MapControls showZoom showFullscreen={!compact} />

          {allRegionsOnMap.map((r) => {
            const size = r.isAvailable ? 10 : getMarkerSize(r.buckets, r.isActive);
            const colorClass = r.isAvailable
              ? 'bg-muted-foreground/20'
              : r.isBootstrapping
                ? 'bg-yellow-500'
                : getMarkerColor(r.buckets, r.isActive, r.isFailed);

            return (
              <MapMarker key={r.region} longitude={r.lng} latitude={r.lat}>
                <MarkerContent>
                  <div className="relative flex items-center justify-center">
                    {/* Pulse ring for active/bootstrapping */}
                    {(r.isActive || r.isBootstrapping) && (
                      <span
                        className={`absolute rounded-full animate-ping opacity-40 ${colorClass}`}
                        style={{ width: size + 10, height: size + 10 }}
                      />
                    )}
                    <div
                      className={`rounded-full ${colorClass} transition-all duration-300 shadow-md ring-2 ${
                        r.isAvailable
                          ? 'ring-transparent opacity-60'
                          : getPulseRing(r.isActive, r.isFailed)
                      } ${r.isBootstrapping ? 'animate-pulse' : ''}`}
                      style={{ width: size, height: size }}
                    />
                  </div>
                </MarkerContent>
                <MarkerPopup offset={20} closeButton>
                  <div className="space-y-2 min-w-52">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{r.flag}</span>
                        <div>
                          <p className="font-semibold text-sm">{r.label}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{r.region}</p>
                        </div>
                      </div>
                      {r.isActive && (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                          Active
                        </Badge>
                      )}
                      {r.isFailed && (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                          Failed
                        </Badge>
                      )}
                      {r.isBootstrapping && (
                        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px]">
                          <Loader2 className="mr-1 size-3 animate-spin" />
                          Bootstrapping
                        </Badge>
                      )}
                      {r.isAvailable && (
                        <Badge variant="outline" className="text-[10px]">
                          Available
                        </Badge>
                      )}
                    </div>
                    {r.isActive && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Buckets</span>
                          <span className="font-semibold">{r.buckets}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Country</span>
                          <span>{r.country}</span>
                        </div>
                        {onRemove && r.env && (
                          <>
                            <Separator />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full text-xs h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove(r.env!.id);
                              }}
                            >
                              <Trash2 className="mr-1.5 size-3" />
                              Remove Environment
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    {r.isFailed && onRemove && r.env && (
                      <>
                        <Separator />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(r.env!.id);
                          }}
                        >
                          <Trash2 className="mr-1.5 size-3" />
                          Remove Environment
                        </Button>
                      </>
                    )}
                    {r.isAvailable && onActivate && (
                      <>
                        <Separator />
                        <Button
                          size="sm"
                          className="w-full text-xs h-7"
                          disabled={bootstrapping || activatingRegion === r.region}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(r.region);
                          }}
                        >
                          {activatingRegion === r.region ? (
                            <Loader2 className="mr-1.5 size-3 animate-spin" />
                          ) : (
                            <Rocket className="mr-1.5 size-3" />
                          )}
                          Activate Region
                        </Button>
                      </>
                    )}
                  </div>
                </MarkerPopup>
              </MapMarker>
            );
          })}
        </MapGL>

        {/* Gradient overlay at bottom */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent via-background/30 to-background"
          aria-hidden
        />

        {/* ── Overview card (top-left) ──────────────────────── */}
        {!compact && (
          <Card className="bg-card/80 backdrop-blur-md absolute top-3 left-3 z-10 w-56 shadow-lg border">
            <CardHeader className="pb-2 pt-3 px-3">
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground">
                Region Distribution
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{activeCount}</span>
                <span className="text-xs text-muted-foreground">
                  region{activeCount !== 1 ? 's' : ''} active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {totalBuckets} bucket{totalBuckets !== 1 ? 's' : ''} deployed
              </p>
            </CardHeader>
            {chartData.length > 0 && (
              <CardContent className="px-2 pb-3">
                <ChartContainer config={chartConfig} className="h-24 w-full">
                  <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide />
                    <RechartsTooltip
                      cursor={false}
                      content={({ payload }) => {
                        if (!payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-md bg-popover border px-2 py-1 text-xs shadow-md">
                            <p className="font-medium">{d.region}</p>
                            <p className="text-muted-foreground">{d.buckets} buckets</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="buckets" radius={[3, 3, 0, 0]} maxBarSize={20}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={`var(--color-chart-${(i % 5) + 1})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            )}
          </Card>
        )}

        {/* ── Legend (bottom-right) ─────────────────────────── */}
        <div className="absolute bottom-5 right-3 z-10 flex items-center gap-3 rounded-lg bg-card/80 backdrop-blur-md border px-3 py-2 text-[10px] shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" /> Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-yellow-500" /> Bootstrapping
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-500" /> Failed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/60" /> Available
          </span>
        </div>

        {/* ── Refresh button (bottom-left) ──────────────────── */}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-5 left-3 z-10 size-8 bg-card/80 backdrop-blur-md shadow-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    </div>
  );
}
