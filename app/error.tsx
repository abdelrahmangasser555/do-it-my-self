'use client';

import { useEffect } from 'react';
import { TiltButton } from '@/components/tilt-button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface this to error tracking if wired up later
    console.error('[DropOut Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Fake stack trace */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-left font-mono text-sm space-y-1 shadow-lg">
          <p className="text-muted-foreground select-none">
            SIGSEGV &mdash; Segmentation fault (core dumped)
          </p>
          <p className="text-red-400 font-bold mt-1">Unhandled Runtime Error</p>
          <p className="text-orange-400 break-all">
            {error?.message || 'Something exploded spectacularly.'}
          </p>
          {error?.digest && (
            <p className="text-muted-foreground text-xs pt-1">
              digest: <span className="text-foreground/60">{error.digest}</span>
            </p>
          )}
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-7xl font-black tracking-tighter text-foreground/10 select-none">
            500
          </h1>
          <h2 className="text-2xl font-bold -mt-4 text-foreground">It blew up</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Something went wrong and the app crashed harder than IE6 on a CSS gradient.
            <br />
            You can retry, or go home and pretend this never happened.
          </p>
        </div>

        {/* Stack overflow joke */}
        <div className="rounded-lg bg-muted/50 border border-border/60 px-4 py-3 font-mono text-xs text-muted-foreground text-left space-y-0.5">
          <p className="text-foreground/40 mb-1"># call stack (abridged):</p>
          <p>
            at <span className="text-red-400">Everything.goWrong</span> (universe.js:1)
          </p>
          <p>
            at <span className="text-red-400">Murphy.applyLaw</span> (laws.js:42)
          </p>
          <p>
            at <span className="text-red-400">Runtime.explode</span>{' '}
            (node_modules/bad-luck/index.js:404)
          </p>
          <p className="text-muted-foreground/50 pt-1">
            ... 2,847 more frames hidden (they&apos;re all your fault)
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <TiltButton
            variant="error"
            width={150}
            height={46}
            elevation={8}
            radius={12}
            onClick={reset}
          >
            <span className="font-semibold">↺ Try Again</span>
          </TiltButton>

          <a href="/">
            <TiltButton variant="carbon" width={180} height={46} elevation={8} radius={12}>
              <span className="font-semibold">← Back to Dashboard</span>
            </TiltButton>
          </a>
        </div>
      </div>
    </div>
  );
}
