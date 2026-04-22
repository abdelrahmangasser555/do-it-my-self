// Settings page â€” AWS credentials, OpenAI key, default environment, theme
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
  Bot,
  MapPin,
  Moon,
  Sun,
  Monitor,
  Copy,
  Check,
  RefreshCw,
  User,
  Building2,
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

interface CliCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  hasCredentials: boolean;
}

interface IamPermission {
  action: string;
  service: string;
  allowed: boolean;
}

interface IamPermissionsData {
  identity: {
    account: string;
    arn: string;
    userId: string;
    username: string;
    isRoot: boolean;
    isAssumedRole: boolean;
  };
  policies: { name: string; arn: string; source: string }[];
  hasAdminPolicy: boolean;
  permissionResults: IamPermission[];
  allPermissionsGranted: boolean;
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
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cliCreds, setCliCreds] = useState<CliCredentials | null>(null);
  const [iamData, setIamData] = useState<IamPermissionsData | null>(null);
  const [iamLoading, setIamLoading] = useState(false);
  const [iamError, setIamError] = useState<string | null>(null);

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

  // Copy button feedback states
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const copyToClipboard = async (value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const loadIamPermissions = useCallback(async () => {
    setIamLoading(true);
    setIamError(null);
    try {
      const res = await fetch('/api/aws-identity/permissions');
      if (res.ok) {
        setIamData(await res.json());
      } else {
        const err = await res.json();
        setIamError(err.error || 'Failed to load permissions');
      }
    } catch {
      setIamError('Failed to load permissions');
    } finally {
      setIamLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch CLI credentials (authoritative source), environments, and settings (for openai + prefs)
      const [credsRes, envsRes, settingsRes] = await Promise.all([
        fetch('/api/aws-identity/credentials'),
        fetch('/api/environments'),
        fetch('/api/settings?raw=true'),
      ]);
      if (credsRes.ok) {
        const creds: CliCredentials = await credsRes.json();
        setCliCreds(creds);
        setAwsKeyId(creds.accessKeyId || '');
        setAwsSecret(creds.secretAccessKey || '');
        setAwsRegion(creds.region || 'us-east-1');
      }
      if (envsRes.ok) {
        setEnvironments(await envsRes.json());
      }
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setOpenaiKey(s.openaiApiKey || '');
        setDefaultEnv(s.defaultEnvironment || '');
      }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-load IAM permissions once credentials are confirmed
  useEffect(() => {
    if (!loading && cliCreds?.hasCredentials) {
      loadIamPermissions();
    }
  }, [loading, cliCreds?.hasCredentials, loadIamPermissions]);

  // Auto-save theme on change
  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    });
  };

  // Auto-save default environment on change
  const handleDefaultEnvChange = (value: string) => {
    const newEnv = value === 'none' ? '' : value;
    setDefaultEnv(newEnv);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultEnvironment: newEnv }),
    });
  };

  const handleSaveAws = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/aws-identity/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId: awsKeyId,
          secretAccessKey: awsSecret,
          region: awsRegion,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('AWS credentials updated');
        setCliCreds({
          accessKeyId: awsKeyId,
          secretAccessKey: awsSecret,
          region: awsRegion,
          hasCredentials: true,
        });
        loadIamPermissions();
      } else {
        toast.error(data.error || 'Failed to save AWS credentials');
      }
    } catch {
      toast.error('Failed to save AWS credentials');
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
      } else {
        toast.error('Failed to save OpenAI key');
      }
    } catch {
      toast.error('Failed to save OpenAI key');
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

  // Group IAM permission results by AWS service for display
  const permissionsByService = (iamData?.permissionResults ?? []).reduce(
    (acc, p) => {
      if (!acc[p.service]) acc[p.service] = [];
      acc[p.service].push(p);
      return acc;
    },
    {} as Record<string, IamPermission[]>,
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* General Section */}
        <div className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </h2>
        </div>

        <Card>
          <CardContent className="divide-y">
            {/* Theme â€” auto-saves on change */}
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

            {/* Default Environment â€” auto-saves on change */}
            <div className="flex items-center justify-between py-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Default Environment</Label>
                </div>
                <p className="text-xs text-muted-foreground">Default region for new buckets.</p>
              </div>
              <Select value={defaultEnv || 'none'} onValueChange={handleDefaultEnvChange}>
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
              {cliCreds?.hasCredentials ? (
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
            <CardDescription>
              Read from your AWS CLI default profile. Updates both CLI config and local settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Access Key ID */}
            <div className="space-y-2">
              <Label htmlFor="awsKeyId">Access Key ID</Label>
              <div className="relative">
                <Input
                  id="awsKeyId"
                  type={showAwsKey ? 'text' : 'password'}
                  value={awsKeyId}
                  onChange={(e) => setAwsKeyId(e.target.value)}
                  placeholder="AKIA..."
                  className="pr-20 font-mono text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(awsKeyId, 'keyId')}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Copy"
                  >
                    {copied.keyId ? (
                      <Check className="size-3.5 text-green-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAwsKey(!showAwsKey)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showAwsKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Secret Access Key */}
            <div className="space-y-2">
              <Label htmlFor="awsSecret">Secret Access Key</Label>
              <div className="relative">
                <Input
                  id="awsSecret"
                  type={showAwsSecret ? 'text' : 'password'}
                  value={awsSecret}
                  onChange={(e) => setAwsSecret(e.target.value)}
                  placeholder="Enter secret access key"
                  className="pr-20 font-mono text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(awsSecret, 'secret')}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Copy"
                  >
                    {copied.secret ? (
                      <Check className="size-3.5 text-green-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAwsSecret(!showAwsSecret)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showAwsSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Default Region */}
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

        {/* IAM Identity & Permissions */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">IAM Identity &amp; Permissions</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadIamPermissions}
                disabled={iamLoading || !cliCreds?.hasCredentials}
                className="h-7 px-2"
                title="Refresh"
              >
                <RefreshCw className={`size-3.5 ${iamLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription>Permissions available to the current IAM identity.</CardDescription>
          </CardHeader>
          <CardContent>
            {!cliCreds?.hasCredentials ? (
              <p className="text-sm text-muted-foreground">
                Configure AWS credentials to view permissions.
              </p>
            ) : iamLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="size-4 animate-spin" />
                Checking permissionsâ€¦
              </div>
            ) : iamError ? (
              <div className="flex items-center gap-2 text-sm text-destructive py-2">
                <AlertCircle className="size-4 shrink-0" />
                {iamError}
              </div>
            ) : iamData ? (
              <div className="space-y-4">
                {/* Identity card */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-mono">{iamData.identity.account}</span>
                    <button
                      onClick={() => copyToClipboard(iamData.identity.account, 'account')}
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy account ID"
                    >
                      {copied.account ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground shrink-0">ARN:</span>
                    <span className="font-mono text-xs truncate flex-1">
                      {iamData.identity.arn}
                    </span>
                    <button
                      onClick={() => copyToClipboard(iamData.identity.arn, 'arn')}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Copy ARN"
                    >
                      {copied.arn ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                  {iamData.hasAdminPolicy && (
                    <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle className="size-3" />
                      AdministratorAccess
                    </Badge>
                  )}
                </div>

                {/* Permission results grouped by service */}
                {iamData.permissionResults.length > 0 && !iamData.hasAdminPolicy && (
                  <div className="space-y-3">
                    {Object.entries(permissionsByService).map(([service, perms]) => (
                      <div key={service}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          {service}
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          {perms.map((p) => (
                            <div
                              key={p.action}
                              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                                p.allowed
                                  ? 'bg-green-500/5 text-green-600 dark:text-green-400'
                                  : 'bg-red-500/5 text-red-600 dark:text-red-400'
                              }`}
                            >
                              {p.allowed ? (
                                <CheckCircle className="size-3 shrink-0" />
                              ) : (
                                <AlertCircle className="size-3 shrink-0" />
                              )}
                              <span className="font-mono truncate">{p.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attached policies */}
                {iamData.policies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Attached Policies
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {iamData.policies.map((p, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
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
              {openaiKey ? (
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
                  className="pr-20 font-mono text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(openaiKey, 'openai')}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Copy"
                  >
                    {copied.openai ? (
                      <Check className="size-3.5 text-green-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showOpenaiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
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
