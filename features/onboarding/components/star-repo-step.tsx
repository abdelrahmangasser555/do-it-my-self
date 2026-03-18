// Final onboarding step — motivate user to star the repo
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, Sparkles, Users, GitBranch, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GitHubStarsButton } from "@/components/ui/github-stars-button";

const REPO = "abdelrahmangasser555/do-it-my-self";

// Fake community contributors for social proof
const CONTRIBUTORS = [
  {
    name: "Sarah K.",
    avatar: "SK",
    role: "DevOps Engineer",
    color: "bg-violet-500",
  },
  {
    name: "Marcus L.",
    avatar: "ML",
    role: "Backend Developer",
    color: "bg-blue-500",
  },
  {
    name: "Aisha R.",
    avatar: "AR",
    role: "Cloud Architect",
    color: "bg-emerald-500",
  },
  {
    name: "James W.",
    avatar: "JW",
    role: "Full Stack Dev",
    color: "bg-orange-500",
  },
  {
    name: "Yuki T.",
    avatar: "YT",
    role: "Platform Engineer",
    color: "bg-pink-500",
  },
  { name: "Carlos M.", avatar: "CM", role: "SRE", color: "bg-cyan-500" },
];

const MESSAGES = [
  "Built my entire file CDN with this!",
  "Saved us $500/mo vs managed services",
  "Finally, S3 management that makes sense",
  "The self-hosted dream — no vendor lock-in",
  "Our team deploys buckets in seconds now",
  "Best open-source storage tool out there",
];

function FloatingEmoji({ delay, emoji }: { delay: number; emoji: string }) {
  return (
    <motion.span
      className="absolute text-xl pointer-events-none select-none"
      initial={{ opacity: 0, y: 20, x: Math.random() * 200 - 100 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [20, -60],
        rotate: [0, Math.random() > 0.5 ? 15 : -15],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        repeatDelay: 4,
      }}
    >
      {emoji}
    </motion.span>
  );
}

export function StarRepoStep() {
  const [visibleContrib, setVisibleContrib] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleContrib((prev) => (prev + 1) % CONTRIBUTORS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="rounded-xl border-border bg-card overflow-hidden relative">
      <CardContent className="p-8 space-y-6">
        {/* Floating emojis */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingEmoji delay={0} emoji="⭐" />
          <FloatingEmoji delay={1} emoji="🚀" />
          <FloatingEmoji delay={2} emoji="💜" />
          <FloatingEmoji delay={3} emoji="✨" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-3 relative"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/20">
              <Star className="size-8 text-yellow-500" fill="currentColor" />
            </div>
          </motion.div>
          <h3 className="text-xl font-bold tracking-tight">
            You&apos;re all set! One last thing...
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            This project is open source and community-driven. If it saved you
            time or money, a star on GitHub means the world to us. It helps
            others discover the project too!
          </p>
        </motion.div>

        {/* Community social proof */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            <span>Join our community of builders</span>
          </div>

          {/* Stacked avatars */}
          <div className="flex justify-center -space-x-2">
            {CONTRIBUTORS.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className={`flex size-9 items-center justify-center rounded-full border-2 border-background ${c.color} text-white text-xs font-bold shadow-md`}
                title={c.name}
              >
                {c.avatar}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground text-xs font-bold"
            >
              +99
            </motion.div>
          </div>

          {/* Rotating testimonial */}
          <div className="h-14 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={visibleContrib}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <p className="text-sm italic text-muted-foreground">
                  &quot;{MESSAGES[visibleContrib]}&quot;
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  — {CONTRIBUTORS[visibleContrib].name},{" "}
                  {CONTRIBUTORS[visibleContrib].role}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { icon: GitBranch, label: "Forks", value: "Open Source" },
            { icon: Heart, label: "Made with", value: "Love" },
            { icon: Rocket, label: "Ships", value: "Fast" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-3"
            >
              <stat.icon className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Meme section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center space-y-2"
        >
          <div className="text-3xl">🧑‍💻 → ⭐ → 🎉</div>
          <p className="text-xs text-muted-foreground">
            Developer clicks star → Project gets visibility → More people
            self-host → Everyone wins
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">
              Takes 2 seconds, means a lot
            </span>
            <Sparkles className="size-4 text-yellow-500" />
          </div>
          <GitHubStarsButton repo={REPO} size="lg" />
        </motion.div>
      </CardContent>
    </Card>
  );
}
