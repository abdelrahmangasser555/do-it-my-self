// Reusable world map showing AWS regions with bucket distribution
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Pie, PieChart, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleFlag } from 'react-circle-flags';
import { AWS_REGIONS } from '@/lib/validations';
import { getRegionAlpha2, AWS_REGION_COUNTRY } from '@/lib/region-flags';
import type { BootstrappedEnvironment } from '@/lib/types';
import type { ChartConfig } from '@/components/ui/chart';

// ── AWS region coordinates ──────────────────────────────────────────────────

// Use the shared region → country mapping
const AWS_REGION_COORDS = AWS_REGION_COUNTRY;

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
    color: 'var(--chart-1)',
  },
};

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

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
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    country: string;
  } | null>(null);

  // Fetch user's approximate location via IP geolocation
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then((res) => res.json())
      .then((data) => {
        if (data.latitude && data.longitude) {
          setUserLocation({
            lat: data.latitude,
            lng: data.longitude,
            country: data.country_name || 'Unknown',
          });
        }
      })
      .catch(() => {
        // Silently fail — location marker just won't show
      });
  }, []);

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

  // Chart data — top regions by buckets (for pie chart)
  const chartData = useMemo(() => {
    return environments
      .filter((e) => e.status === 'active')
      .map((e, i) => ({
        name: e.region.split('-').slice(0, 2).join('-'),
        region: e.region,
        value: bucketCountMap.get(e.region) || 0,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
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
      alpha2: string;
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
                      <CircleFlag
                        countryCode={getRegionAlpha2(r.value)}
                        height={12}
                        className="w-6"
                      />
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
                      <div className="flex items-center gap-2 w-12">
                        <CircleFlag countryCode={r.alpha2} height={11} />
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

          {/* ── User location marker (blue) ─────────────────── */}
          {userLocation && (
            <MapMarker longitude={userLocation.lng} latitude={userLocation.lat}>
              <MarkerContent>
                <div className="relative flex items-center justify-center">
                  <span className="absolute size-8 rounded-full bg-blue-500/20 animate-ping" />
                  <span className="absolute size-5 rounded-full bg-blue-500/15" />
                  <span className="relative size-3 rounded-full bg-blue-500 border-2  shadow-md" />
                </div>
              </MarkerContent>
              <MarkerPopup offset={14} closeButton>
                <div className="space-y-1 min-w-36">
                  <p className="font-semibold text-sm">Your Location</p>
                  <p className="text-xs text-muted-foreground">{userLocation.country}</p>
                </div>
              </MarkerPopup>
            </MapMarker>
          )}
        </MapGL>

        {/* Gradient overlay at bottom */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent via-background/30 to-background"
          aria-hidden
        />

        {/* ── Overview card (top-left) ──────────────────────── */}
        {!compact && (
          <Card className="bg-card/70 absolute top-4 left-4 z-10 w-60 backdrop-blur-sm shadow-lg border">
            <CardHeader>
              <p className="pb-2 text-[10px] tracking-wider uppercase text-muted-foreground">
                Region Distribution
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl leading-none font-semibold">{activeCount}</span>
                <span className="text-xs text-muted-foreground">
                  region{activeCount !== 1 ? 's' : ''} active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {totalBuckets} bucket{totalBuckets !== 1 ? 's' : ''} deployed
              </p>
            </CardHeader>
            {chartData.length > 0 && (
              <CardContent>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-32 w-32">
                  <PieChart>
                    <RechartsTooltip
                      content={({ payload }) => {
                        if (!payload?.[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-md bg-popover border px-2 py-1 text-xs shadow-md">
                            <p className="font-medium">{d.region}</p>
                            <p className="text-muted-foreground">{d.value} buckets</p>
                          </div>
                        );
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={32}
                      outerRadius={52}
                      strokeWidth={2}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {chartData.map((d) => (
                    <div key={d.region} className="text-center">
                      <p className="flex items-center justify-center gap-1.5 text-[10px] tracking-wide uppercase text-muted-foreground">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: d.fill }}
                        />
                        {d.name}
                      </p>
                      <p className="mt-1 leading-none font-medium tabular-nums text-foreground">
                        {d.value}
                      </p>
                    </div>
                  ))}
                </div>
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
          {userLocation && (
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" /> You
            </span>
          )}
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
