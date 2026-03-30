import Link from 'next/link';
import { TiltButton } from '@/components/tilt-button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Terminal-style error block */}
        <div className="rounded-xl border border-border bg-card/60 p-6 text-left font-mono text-sm space-y-1 shadow-lg">
          <p className="text-muted-foreground select-none">~/dropout $ navigate</p>
          <p className="text-red-500 font-bold">
            Error: Cannot find module &apos;./{'{'}the page you wanted{'}'}&apos;
          </p>
          <p className="text-muted-foreground">{'>'} Require stack:</p>
          <p className="text-muted-foreground pl-4">- node_modules/your-memory/index.js</p>
          <p className="text-muted-foreground pl-4">- node_modules/browser-history/index.js</p>
          <p className="text-orange-400 mt-2">
            MODULE_NOT_FOUND &nbsp;<span className="text-muted-foreground">exit code 404</span>
          </p>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-8xl font-black tracking-tighter text-foreground/10 select-none">
            404
          </h1>
          <h2 className="text-2xl font-bold -mt-6 text-foreground">Page not found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The route you&apos;re looking for doesn&apos;t exist.
            <br />
            It may have been deleted, never deployed, or you fat-fingered the URL.
          </p>
        </div>

        {/* Stack trace easter egg */}
        <div className="rounded-lg bg-muted/50 border border-border/60 px-4 py-3 font-mono text-xs text-muted-foreground text-left space-y-0.5">
          <p className="text-foreground/40 mb-1"># likely suspects:</p>
          <p>
            at <span className="text-blue-400">YourBrain.rememberTheURL</span> (memory.js:1)
          </p>
          <p>
            at <span className="text-blue-400">Browser.autocomplete</span> (history.js:404)
          </p>
          <p>
            at <span className="text-blue-400">You.typeTheURL</span> (keyboard.js:???)
          </p>
        </div>

        {/* Action */}
        <Link href="/">
          <TiltButton variant="carbon" width={200} height={46} elevation={8} radius={12}>
            <span className="font-semibold">← Back to Dashboard</span>
          </TiltButton>
        </Link>
      </div>
    </div>
  );
}
