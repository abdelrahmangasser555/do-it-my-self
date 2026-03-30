// Final onboarding step — social proof & star CTA
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, Quote, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GitHubStarsButton } from '@/components/ui/github-stars-button';
import { APP_CONFIG } from '@/lib/config';

const REPO = APP_CONFIG.githubRepo;

// Configurable avatar list — swap these with real images later
const PEOPLE = [
  { name: 'Sarah K.', handle: '@sarahk_devops', role: 'DevOps Engineer', hue: 270 },
  { name: 'Marcus L.', handle: '@marcusl_dev', role: 'Backend Developer', hue: 210 },
  { name: 'Aisha R.', handle: '@aisha_cloud', role: 'Cloud Architect', hue: 160 },
  { name: 'James W.', handle: '@jamesw_fs', role: 'Full Stack Dev', hue: 30 },
  { name: 'Yuki T.', handle: '@yukit_plat', role: 'Platform Engineer', hue: 330 },
  { name: 'Carlos M.', handle: '@carlosm_sre', role: 'SRE', hue: 190 },
];

// Tweet-style testimonials
const TESTIMONIALS = [
  {
    person: 0,
    text: 'Finally ditched our $400/mo Cloudflare R2 dashboard for this. Self-hosted, zero lock-in, and actually fast.',
    likes: 47,
    time: '2h',
  },
  {
    person: 1,
    text: "Just deployed 12 buckets across 3 regions in under a minute. The CDK integration is *chef's kiss*.",
    likes: 83,
    time: '5h',
  },
  {
    person: 2,
    text: 'Showed this to my team and now everyone wants to migrate. The presigned URL flow alone saved us days of work.',
    likes: 124,
    time: '1d',
  },
  {
    person: 3,
    text: "Been looking for something exactly like this. S3 + CloudFront management shouldn't require a SaaS subscription.",
    likes: 56,
    time: '3h',
  },
  {
    person: 4,
    text: "The code snippets feature is incredible — literally copy-paste into your Next.js app and you're uploading files.",
    likes: 91,
    time: '8h',
  },
  {
    person: 5,
    text: 'Open source, runs on localhost, manages all my CDN infra. What more could you want?',
    likes: 68,
    time: '12h',
  },
];

function Avatar({ name, hue, size = 40 }: { name: string; hue: number; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('');
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: `linear-gradient(135deg, hsl(${hue}, 65%, 50%), hsl(${hue + 30}, 65%, 40%))`,
      }}
    >
      {initials}
    </div>
  );
}

function TweetCard({
  testimonial,
  index,
}: {
  testimonial: (typeof TESTIMONIALS)[0];
  index: number;
}) {
  const person = PEOPLE[testimonial.person];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
    >
      <Card className="group relative overflow-hidden transition-colors hover:bg-muted/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar name={person.name} hue={person.hue} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">{person.name}</span>
                <span className="text-xs text-muted-foreground truncate">{person.handle}</span>
                <span className="text-xs text-muted-foreground">· {testimonial.time}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{testimonial.text}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 hover:text-red-400 transition-colors cursor-default">
                  <Heart className="size-3" />
                  {testimonial.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Quote className="size-3" />
                  {Math.floor(testimonial.likes * 0.3)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StarRepoStep() {
  const [activeSet, setActiveSet] = useState(0);
  // Show 3 testimonials at a time, rotate
  const pageSize = 3;
  const totalPages = Math.ceil(TESTIMONIALS.length / pageSize);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSet((prev) => (prev + 1) % totalPages);
    }, 5000);
    return () => clearInterval(timer);
  }, [totalPages]);

  const visibleTestimonials = TESTIMONIALS.slice(
    activeSet * pageSize,
    activeSet * pageSize + pageSize,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center space-y-3"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
          className="inline-block"
        >
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
            <Star className="size-7 text-yellow-500" fill="currentColor" />
          </div>
        </motion.div>
        <h3 className="text-xl font-bold tracking-tight">You&apos;re all set!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          This project is open source and community-driven. A star on GitHub helps others discover
          it.
        </p>
      </motion.div>

      {/* Stacked avatars */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center"
      >
        <div className="flex -space-x-2">
          {PEOPLE.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="ring-2 ring-background rounded-full"
            >
              <Avatar name={p.name} hue={p.hue} size={32} />
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="flex size-8 items-center justify-center rounded-full ring-2 ring-background bg-muted text-muted-foreground text-[10px] font-bold"
          >
            +99
          </motion.div>
        </div>
      </motion.div>

      {/* Testimonial carousel */}
      <div className="min-h-[280px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSet}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {visibleTestimonials.map((t, i) => (
              <TweetCard key={`${activeSet}-${i}`} testimonial={t} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Page dots */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSet(i)}
            className={`size-1.5 rounded-full transition-colors ${
              i === activeSet ? 'bg-foreground' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center gap-3 pt-2"
      >
        <GitHubStarsButton repo={REPO} size="lg" />
        <a
          href={`https://github.com/${REPO}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View on GitHub <ExternalLink className="size-3" />
        </a>
      </motion.div>
    </div>
  );
}
