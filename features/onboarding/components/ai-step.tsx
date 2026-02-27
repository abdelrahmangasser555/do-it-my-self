// Step 3 — Optional AI Setup: OpenAI API key configuration
"use client";

import { useState } from "react";
import {
  CheckCircle,
  Loader2,
  Circle,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AiStepProps {
  loading: boolean;
  error: string | null;
  configured: boolean;
  checked: boolean;
  onRecheck: () => void;
  onSaveApiKey: (key: string) => Promise<boolean>;
}

export function AiStep({
  loading,
  error,
  configured,
  checked,
  onRecheck,
  onSaveApiKey,
}: AiStepProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    const success = await onSaveApiKey(apiKey.trim());
    setSaving(false);
    if (success) {
      setSaved(true);
      setApiKey("");
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 bg-muted text-sm font-bold text-muted-foreground">
            3
          </div>
          <div>
            <CardTitle className="text-base">AI Assistant</CardTitle>
            <p className="text-sm text-muted-foreground">
              Optional — enables AI command generation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Optional
          </Badge>
          {configured ? (
            <CheckCircle className="size-5 text-green-500" />
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Configure an OpenAI API key to enable AI-powered command generation and error debugging.
            This step is optional and does not affect core functionality.
          </p>
        </div>

        {configured && (
          <Alert>
            <CheckCircle className="size-4 text-green-500" />
            <AlertDescription className="text-sm">
              AI assistant is configured and ready to use.
            </AlertDescription>
          </Alert>
        )}

        {!configured && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="api-key" className="text-sm">
                OpenAI API Key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!apiKey.trim() || saving || loading}
                >
                  {saving ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            {saved && (
              <p className="text-xs text-green-500">
                API key saved. Restart the dev server for changes to take effect.
              </p>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecheck}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <RefreshCw className="mr-2 size-3.5" />}
            {checked ? "Recheck" : "Check Status"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
