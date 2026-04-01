// Settings page — AWS credentials, OpenAI key, default environment, theme
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings2,
  Key,
  Cloud,
  Palette,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Bot,
  MapPin,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/page-transition';
import { APP_CONFIG } from '@/lib/config';
import { useTheme, type Theme } from '@/lib/theme-context';
import { AWS_REGIONS } from '@/lib/validations';
import { getRegionAlpha2 } from '@/lib/region-flags';
import { CircleFlag } from 'react-circle-flags';

interface SettingsData {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsDefaultRegion: string;
  openaiApiKey: string;
  defaultEnvironment: string;
  theme: Theme;
  hasAwsCredentials: boolean;
  hasOpenaiKey: boolean;
}

interface Environment {
  id: string;
  region: string;
  alias: string;
  status: string;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [awsKeyId, setAwsKeyId] = useState('');
  const [awsSecret, setAwsSecret] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [openaiKey, setOpenaiKey] = useState('');
  const [defaultEnv, setDefaultEnv] = useState('');

  // Visibility toggles
  const [showAwsKey, setShowAwsKey] = useState(false);
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, envsRes] = await Promise.all([
        fetch('/api/settings?raw=true'),
        fetch('/api/environments'),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
        setAwsKeyId(data.awsAccessKeyId || '');
        setAwsSecret(data.awsSecretAccessKey || '');
        setAwsRegion(data.awsDefaultRegion || 'us-east-1');
        setOpenaiKey(data.openaiApiKey || '');
        setDefaultEnv(data.defaultEnvironment || '');
      }
      if (envsRes.ok) {
        setEnvironments(await envsRes.json());
      }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync theme changes to server settings
  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    // Fire-and-forget save to server
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    });
  };

  const handleSaveAws = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awsAccessKeyId: awsKeyId,
          awsSecretAccessKey: awsSecret,
          awsDefaultRegion: awsRegion,
        }),
      });
      if (res.ok) {
        toast.success('AWS credentials updated');
        await fetchSettings();
      } else {
        toast.error('Failed to save AWS settings');
      }
    } catch {
      toast.error('Failed to save AWS settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOpenai = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: openaiKey }),
      });
      if (res.ok) {
        toast.success('OpenAI API key updated');
        await fetchSettings();
      } else {
        toast.error('Failed to save OpenAI key');
      }
    } catch {
      toast.error('Failed to save OpenAI key');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultEnvironment: defaultEnv, theme }),
      });
      if (res.ok) {
        toast.success('Preferences saved');
      } else {
        toast.error('Failed to save preferences');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PageTransition>
    );
  }

  const activeEnvironments = environments.filter((e) => e.status === 'active');

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}

        {/* General Section */}
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </h2>
        </div>

        <Card>
          <CardContent className="divide-y">
            {/* Theme */}
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Palette className="size-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Theme</Label>
                </div>
                <p className="text-xs text-muted-foreground">Choose how {APP_CONFIG.name} looks.</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border p-1">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleThemeChange(opt.value)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      theme === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <opt.icon className="size-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Environment */}
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Default Environment</Label>
                </div>
                <p className="text-xs text-muted-foreground">Default region for new buckets.</p>
              </div>
              <Select
                value={defaultEnv || 'none'}
                onValueChange={(v) => setDefaultEnv(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default</SelectItem>
                  {activeEnvironments.map((env) => {
                    const regionLabel =
                      AWS_REGIONS.find((r) => r.value === env.region)?.label ?? env.region;
                    return (
                      <SelectItem key={env.id} value={env.region}>
                        {regionLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSavePreferences} disabled={saving}>
            {saving ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="size-3.5 mr-1.5" />
            )}
            Save Preferences
          </Button>
        </div>

        <Separator />

        {/* AWS Credentials Section */}
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AWS Credentials
          </h2>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">AWS Account</CardTitle>
              </div>
              {settings?.hasAwsCredentials ? (
                <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="size-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500/20">
                  <AlertCircle className="size-3" />
                  Not Set
                </Badge>
              )}
            </div>
            <CardDescription>Stored locally — never sent externally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="awsKeyId">Access Key ID</Label>
              <div className="relative">
                <Input
                  id="awsKeyId"
                  type={showAwsKey ? 'text' : 'password'}
                  value={awsKeyId}
                  onChange={(e) => setAwsKeyId(e.target.value)}
                  placeholder="AKIA..."
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAwsKey(!showAwsKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAwsKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="awsSecret">Secret Access Key</Label>
              <div className="relative">
                <Input
                  id="awsSecret"
                  type={showAwsSecret ? 'text' : 'password'}
                  value={awsSecret}
                  onChange={(e) => setAwsSecret(e.target.value)}
                  placeholder="Enter secret access key"
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAwsSecret(!showAwsSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAwsSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Default Region</Label>
              <Select value={awsRegion} onValueChange={setAwsRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AWS_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <CircleFlag
                          countryCode={getRegionAlpha2(r.value)}
                          height={12}
                          className="w-6"
                        />
                        {r.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveAws} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Shield className="size-3.5 mr-1.5" />
                )}
                Update AWS Credentials
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* OpenAI Section */}
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI Configuration
          </h2>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">OpenAI API Key</CardTitle>
              </div>
              {settings?.hasOpenaiKey ? (
                <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="size-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  Optional
                </Badge>
              )}
            </div>
            <CardDescription>Used for AI-powered command generation. Optional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openaiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="openaiKey"
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOpenaiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveOpenai} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Key className="size-3.5 mr-1.5" />
                )}
                Update API Key
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* About Section */}
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            About
          </h2>
        </div>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Settings2 className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{APP_CONFIG.name}</p>
                <p className="text-xs text-muted-foreground">{APP_CONFIG.description}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              All data is stored locally on your machine. No information is sent to external servers
              except direct AWS API calls and optional OpenAI requests.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
