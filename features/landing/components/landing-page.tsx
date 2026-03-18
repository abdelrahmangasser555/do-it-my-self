// Fireship-inspired landing page — full-viewport scroll-snap sections
// Uses Space Grotesk for display text, JetBrains Mono for accents
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowDown, Play, Github } from "lucide-react";
import Link from "next/link";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { PricingSection } from "./pricing-section";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

/* ── Fade-in wrapper ── */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollDown = () =>
    containerRef.current?.scrollBy({
      top: window.innerHeight,
      behavior: "smooth",
    });

  return (
    <div
      ref={containerRef}
      className={`h-screen overflow-y-auto snap-y snap-mandatory ${display.variable} ${mono.variable}`}
    >
      {/* ────────────────────── PAGE 1 — The Pain ────────────────────── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-black relative select-none px-6">
        <Reveal className="text-center">
          <h1 className="font-(family-name:--font-display) text-[clamp(3rem,10vw,9rem)] font-bold leading-[0.9] tracking-tight text-white">
            I <span className="text-red-500 italic">hateeee</span>
            <br />
            file upload
          </h1>

          <p className="mt-8 font-(family-name:--font-mono) text-neutral-500 text-lg md:text-xl tracking-widest">
            every. single. time.
          </p>

          {/* GIF placeholder */}
          <div className="mt-12 mx-auto w-full max-w-lg aspect-video rounded-xl border-2 border-dashed border-neutral-800 flex items-center justify-center">
            <span className="font-(family-name:--font-mono) text-neutral-700 text-sm">
              your-meme.gif goes here
            </span>
          </div>
        </Reveal>

        <motion.button
          onClick={scrollDown}
          className="absolute bottom-8 text-neutral-600 hover:text-white transition-colors cursor-pointer"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          aria-label="Scroll down"
        >
          <ArrowDown className="size-8" />
        </motion.button>
      </section>

      {/* ────────────────────── PAGE 2 — The Why ────────────────────── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-white relative select-none px-6">
        <Reveal className="text-center max-w-3xl">
          <p className="font-(family-name:--font-mono) text-neutral-400 text-sm uppercase tracking-[0.25em] mb-8">
            so&hellip;
          </p>

          <h2 className="font-(family-name:--font-display) text-[clamp(2.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-tight text-black">
            This is why
            <br />I built <span className="text-blue-600">this</span>
          </h2>

          <p className="mt-10 text-lg md:text-xl text-neutral-500 leading-relaxed max-w-xl mx-auto">
            A dashboard to self-host your files on{" "}
            <span className="text-black font-semibold">
              your own AWS account
            </span>
            .
            <br />
            No middleman. No surprise bills. Just S3 + a nice UI.
          </p>
        </Reveal>

        <motion.div
          className="absolute bottom-8 text-neutral-300"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        >
          <ArrowDown className="size-8" />
        </motion.div>
      </section>

      {/* ────────────────────── PAGE 3 — The Demo ────────────────────── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-black relative select-none px-6">
        <Reveal className="text-center w-full max-w-4xl">
          <p className="font-(family-name:--font-mono) text-neutral-600 text-sm uppercase tracking-[0.25em] mb-6">
            see it in action
          </p>

          <h2 className="font-(family-name:--font-display) text-[clamp(2rem,6vw,5rem)] font-bold text-white tracking-tight mb-12">
            Watch the demo
          </h2>

          {/* Video placeholder */}
          <div className="relative mx-auto w-full aspect-video rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-24 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <Play className="size-10 text-white ml-1" />
              </div>
            </div>
            <p className="absolute bottom-4 inset-x-0 text-center font-(family-name:--font-mono) text-neutral-700 text-xs">
              your demo video goes here
            </p>
          </div>
        </Reveal>
      </section>

      {/* ────────────────────── PAGE 4 — The Push ────────────────────── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-white relative select-none px-6">
        <Reveal className="text-center max-w-3xl">
          <h2 className="font-(family-name:--font-display) text-[clamp(2.5rem,8vw,7rem)] font-bold leading-[0.9] tracking-tight text-black">
            What are you
            <br />
            doing here?
          </h2>

          <p className="mt-8 text-2xl md:text-3xl text-neutral-400 font-light leading-snug">
            Are you{" "}
            <span className="text-yellow-500 font-bold italic">still</span> not
            convinced?
          </p>

          <p className="mt-6 font-(family-name:--font-mono) text-neutral-300 text-sm">
            fine. scroll down. I have numbers.
          </p>
        </Reveal>

        <motion.div
          className="absolute bottom-8 text-neutral-300"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        >
          <ArrowDown className="size-8" />
        </motion.div>
      </section>

      {/* ────────────────────── PAGE 5 — Pricing / Comparison ────────────────────── */}
      <section className="snap-start min-h-screen flex flex-col items-center justify-center bg-black select-none px-6 py-24">
        <Reveal className="w-full max-w-6xl">
          <div className="text-center mb-16">
            <p className="font-(family-name:--font-mono) text-neutral-600 text-sm uppercase tracking-[0.25em] mb-4">
              the comparison
            </p>
            <h2 className="font-(family-name:--font-display) text-[clamp(2rem,6vw,5rem)] font-bold text-white tracking-tight">
              Pick your poison
            </h2>
          </div>

          <PricingSection />

          {/* CTA */}
          <div className="mt-20 text-center space-y-8">
            <Link
              href="/onboarding"
              className="inline-block px-10 py-5 bg-white text-black font-(family-name:--font-display) font-bold text-xl rounded-full hover:bg-neutral-200 transition-colors"
            >
              Get Started — It&apos;s Free
            </Link>

            <div className="flex items-center justify-center gap-6">
              <a
                href="https://github.com/abdelrahmangasser555/do-it-my-self"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors font-(family-name:--font-mono) text-sm"
              >
                <Github className="size-4" />
                Star on GitHub
              </a>
            </div>

            <p className="font-(family-name:--font-mono) text-neutral-800 text-xs tracking-widest">
              open source · self-hosted · no vendor lock-in
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
