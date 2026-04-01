// Final onboarding step — creator profile, social proof & star CTA
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, ExternalLink, Heart, Sparkles, Quote } from 'lucide-react';
import { GitHubStarsButton } from '@/components/ui/github-stars-button';
import { APP_CONFIG } from '@/lib/config';

const REPO = APP_CONFIG.githubRepo;

interface Stargazer {
  login: string;
  avatar_url: string;
  html_url: string;
}

function useStargazers(repo: string) {
  const [stargazers, setStargazers] = useState<Stargazer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${repo}/stargazers?per_page=30`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Stargazer[]) => {
        if (!cancelled) setStargazers(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return { stargazers, loading };
}

export function StarRepoStep() {
  const { stargazers, loading: stargazersLoading } = useStargazers(REPO);
  const displayStargazers = stargazers.slice(0, 20);

  return (
    <div className="space-y-12">
      {/* Creator Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-semibold">
            <Sparkles className="size-3.5" />
            About the Creator
            <Sparkles className="size-3.5" />
          </div>
          <p className="text-sm text-muted-foreground">More products to ease your life, for free</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <motion.a
            href={APP_CONFIG.creatorWebsite}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
            aria-label="Visit the creator website"
            className="group relative"
          >
            <div className="size-24 overflow-hidden rounded-full ring-4 ring-primary/20 ring-offset-4 ring-offset-background transition-transform duration-200 group-hover:scale-[1.03]">
              <img src="/personal/my-image.jpg" alt="Creator" className="size-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Heart className="size-3.5" fill="currentColor" />
            </div>
          </motion.a>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Hey! I build open-source tools to help developers move faster. DropOut is one of them
              — all free, all local, no strings attached.
            </p>
            <div className="max-w-md rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-left shadow-sm backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <Quote className="mt-0.5 shrink-0 text-primary/70" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    Build tools that respect time, stay local, and quietly remove friction.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Practical software should feel calm, useful, and easy to trust.
                  </p>
                </div>
              </div>
            </div>
            <a
              href={APP_CONFIG.creatorWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline transition-colors mt-1"
            >
              See my other projects <ExternalLink className="size-3" />
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-xs text-muted-foreground">
            People who starred this repo
          </span>
        </div>
      </div>

      {/* Stargazers */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        {stargazersLoading ? (
          <div className="flex justify-center py-4">
            <div className="flex flex-wrap justify-center gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="size-9 rounded-full bg-muted animate-pulse ring-2 ring-background"
                />
              ))}
            </div>
          </div>
        ) : displayStargazers.length > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {displayStargazers.map((s, i) => (
                <motion.a
                  key={s.login}
                  href={s.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.04, type: 'spring', stiffness: 300 }}
                  title={s.login}
                  className="ring-2 ring-background rounded-full hover:ring-primary/40 hover:scale-110 transition-transform"
                >
                  <img
                    src={s.avatar_url}
                    alt={s.login}
                    className="size-9 rounded-full object-cover"
                  />
                </motion.a>
              ))}
              {stargazers.length > 20 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + 20 * 0.04 }}
                  className="flex size-9 items-center justify-center rounded-full ring-2 ring-background bg-muted text-muted-foreground text-[10px] font-bold"
                >
                  +{stargazers.length - 20}
                </motion.div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {stargazers.length} {stargazers.length === 1 ? 'person has' : 'people have'} starred
              this repo
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Be the first to star this repo!
          </p>
        )}
      </motion.div>

      {/* Please drop a star */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="rounded-xl overflow-hidden  shadow-sm max-w-xs w-full">
          <img
            src="/gifs/please drop a star.gif"
            alt="Please drop a star"
            className="w-full object-cover"
          />
        </div>

        <div className="text-center space-y-1">
          <p className="text-base font-semibold tracking-tight">Can you please star the repo?</p>
          <p className="text-sm text-muted-foreground">
            It helps others discover this tool and keeps me motivated to build more.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 pt-1">
          <GitHubStarsButton repo={REPO} size="lg" />
          <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View on GitHub <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60 pt-1">
          <Star className="size-3 fill-yellow-500 text-yellow-500" />
          <span>Open source - Free forever - No tracking</span>
          <Star className="size-3 fill-yellow-500 text-yellow-500" />
        </div>
      </motion.div>
    </div>
  );
}
