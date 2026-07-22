'use client';

import Link from 'next/link';
import { Lock, Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ModeRestrictedStateProps {
  title: string;
  description: string;
}

export function ModeRestrictedState({ title, description }: ModeRestrictedStateProps) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="size-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Developer Mode Only</span>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Switch modes in Settings to unlock this surface.
        </p>
        <Button asChild>
          <Link href="/settings">
            <Settings2 data-icon="inline-start" />
            Open Settings
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
