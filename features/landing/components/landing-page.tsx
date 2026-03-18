// Fireship-style landing page — scroll-snap sections with bold typography
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowDown, Play, Github } from "lucide-react";
import Link from "next/link";
import { PricingSection } from "./pricing-section";

function FadeInWhenVisible({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToNext = () => {
    scrollContainerRef.current?.scrollBy({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <div
      ref={scrollContainerRef}
      className="h-screen overflow-y-auto snap-y snap-mandatory"
      style={{ scrollBehavior: "smooth" }}
    >
      {/* ─── Page 1: The Pain ─── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-black relative px-6">
        <FadeInWhenVisible className="text-center max-w-3xl">
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.95] tracking-tight"
            style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
          >
            I{" "}
            <span className="text-red-500 italic">hateeee</span>
            <br />
            file upload
          </h1>
          <p className="mt-6 text-lg md:text-xl text-neutral-400 font-mono">
            every. single. time.
          </p>

          {/* GIF placeholder */}
          <div className="mt-10 mx-auto w-full max-w-md aspect-video rounded-xl border-2 border-dashed border-neutral-700 flex items-center justify-center text-neutral-600 text-sm font-mono">
            {/* Replace with your gif: <img src="/your-meme.gif" /> */}
            your-meme.gif goes here
          </div>
        </FadeInWhenVisible>

        <motion.button
          onClick={scrollToNext}
          className="absolute bottom-10 text-neutral-500 hover:text-white transition-colors cursor-pointer"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ArrowDown className="size-8" />
        </motion.button>
      </section>

      {/* ─── Page 2: The Why ─── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-neutral-950 px-6">
        <FadeInWhenVisible className="text-center max-w-2xl">
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-6">
            so...
          </p>
          <h2
            className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight"
            style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
          >
            This is why
            <br />I built{" "}
            <span className="bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              this
            </span>
          </h2>
          <p className="mt-8 text-lg text-neutral-400 max-w-lg mx-auto leading-relaxed">
            A dashboard to self-host your files on{" "}
            <span className="text-white font-semibold">your own AWS account</span>.
            No middleman. No surprise bills from providers. Just you, S3, and a
            nice UI.
          </p>

          <motion.div
            className="mt-12 text-neutral-600"
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            <ArrowDown className="size-10 mx-auto" />
          </motion.div>
        </FadeInWhenVisible>
      </section>

      {/* ─── Page 3: The Demo ─── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-6">
        <FadeInWhenVisible className="text-center max-w-4xl w-full">
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-6">
            see it in action
          </p>
          <h2
            className="text-3xl md:text-5xl font-black text-white mb-10 tracking-tight"
            style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
          >
            Watch the demo
          </h2>

          {/* Video placeholder */}
          <div className="relative mx-auto w-full max-w-3xl aspect-video rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Play className="size-8 text-white ml-1" />
              </div>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-neutral-600 text-xs font-mono">
              {/* Replace with: <video src="/demo.mp4" /> or YouTube embed */}
              your demo video goes here
            </p>
          </div>
        </FadeInWhenVisible>
      </section>

      {/* ─── Page 4: The Push ─── */}
      <section className="snap-start h-screen flex flex-col items-center justify-center bg-black px-6">
        <FadeInWhenVisible className="text-center max-w-2xl">
          <h2
            className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight"
            style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
          >
            What are you
            <br />
            doing here?
          </h2>
          <p className="mt-6 text-2xl md:text-3xl text-neutral-400 font-light">
            Are you{" "}
            <span className="text-yellow-400 font-bold italic">still</span> not
            convinced?
          </p>
          <p className="mt-4 text-neutral-600 font-mono text-sm">
            fine. scroll down. I have numbers.
          </p>

          <motion.div
            className="mt-12 text-neutral-600"
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            <ArrowDown className="size-10 mx-auto" />
          </motion.div>
        </FadeInWhenVisible>
      </section>

      {/* ─── Page 5: Pricing / Comparison ─── */}
      <section className="snap-start min-h-screen flex flex-col items-center justify-center bg-neutral-950 px-6 py-20">
        <FadeInWhenVisible className="w-full max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-4">
              the comparison
            </p>
            <h2
              className="text-3xl md:text-5xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
            >
              Pick your poison
            </h2>
          </div>

          <PricingSection />

          {/* CTA */}
          <div className="mt-16 text-center space-y-6">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-neutral-200 transition-colors"
            >
              Get Started — It&apos;s Free
            </Link>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://github.com/abdelrahmangasser555/do-it-my-self"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-mono"
              >
                <Github className="size-4" />
                Star on GitHub
              </a>
            </div>
            <p className="text-neutral-700 text-xs font-mono">
              open source · self-hosted · no vendor lock-in
            </p>
          </div>
        </FadeInWhenVisible>
      </section>
    </div>
  );
}
