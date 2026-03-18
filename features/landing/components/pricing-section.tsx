// Pricing comparison cards — Self-host on AWS vs SCR vs Providers
"use client";

import { motion } from "framer-motion";
import { Check, X, Minus, Crown } from "lucide-react";

interface PlanFeature {
  name: string;
  selfHostRaw: string | boolean;
  scr: string | boolean;
  providers: string | boolean;
}

const features: PlanFeature[] = [
  {
    name: "Monthly cost (10GB storage)",
    selfHostRaw: "~$0.23/mo",
    scr: "~$0.23/mo",
    providers: "$20–50/mo",
  },
  {
    name: "Monthly cost (100GB storage)",
    selfHostRaw: "~$2.30/mo",
    scr: "~$2.30/mo",
    providers: "$100–300/mo",
  },
  {
    name: "CDN included",
    selfHostRaw: "Manual setup",
    scr: true,
    providers: true,
  },
  {
    name: "Dashboard / UI",
    selfHostRaw: false,
    scr: true,
    providers: true,
  },
  {
    name: "Full AWS control",
    selfHostRaw: true,
    scr: true,
    providers: false,
  },
  {
    name: "No vendor lock-in",
    selfHostRaw: true,
    scr: true,
    providers: false,
  },
  {
    name: "One-click deploy",
    selfHostRaw: false,
    scr: true,
    providers: true,
  },
  {
    name: "Infrastructure as Code",
    selfHostRaw: "Write it yourself",
    scr: true,
    providers: false,
  },
  {
    name: "Bandwidth overage fees",
    selfHostRaw: "AWS pricing",
    scr: "AWS pricing",
    providers: "$$$",
  },
  {
    name: "Open source",
    selfHostRaw: "N/A",
    scr: true,
    providers: false,
  },
  {
    name: "Setup time",
    selfHostRaw: "Hours/Days",
    scr: "~5 minutes",
    providers: "~5 minutes",
  },
  {
    name: "Data stays in your account",
    selfHostRaw: true,
    scr: true,
    providers: false,
  },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check className="size-5 text-green-400 mx-auto" />;
  if (value === false)
    return <X className="size-5 text-red-400/60 mx-auto" />;
  return (
    <span className="text-sm text-neutral-300">{value}</span>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export function PricingSection() {
  const plans = [
    {
      name: "Self-Host on AWS",
      subtitle: "Raw DIY",
      description: "You write CloudFormation, you manage S3, you figure it out.",
      color: "border-neutral-700",
      bg: "bg-neutral-900",
      headerBg: "bg-neutral-800",
      key: "selfHostRaw" as const,
    },
    {
      name: "Storage Control Room",
      subtitle: "This project",
      description:
        "Same AWS costs. But with a dashboard, one-click deploys, and CDK automation.",
      color: "border-blue-500/50",
      bg: "bg-neutral-900",
      headerBg: "bg-blue-500/10",
      highlight: true,
      key: "scr" as const,
    },
    {
      name: "File Hosting Providers",
      subtitle: "Uploadthing, Cloudinary, etc.",
      description:
        "Easy to use. But you pay per GB, per transform, per-everything.",
      color: "border-neutral-700",
      bg: "bg-neutral-900",
      headerBg: "bg-neutral-800",
      key: "providers" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan, i) => (
        <motion.div
          key={plan.name}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className={`rounded-2xl border ${plan.color} ${plan.bg} overflow-hidden flex flex-col ${
            plan.highlight ? "ring-1 ring-blue-500/30 scale-[1.02]" : ""
          }`}
        >
          {/* Header */}
          <div className={`p-6 ${plan.headerBg}`}>
            <div className="flex items-center gap-2">
              {plan.highlight && (
                <Crown className="size-5 text-yellow-400" />
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            </div>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              {plan.subtitle}
            </p>
            <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
              {plan.description}
            </p>
          </div>

          {/* Features */}
          <div className="flex-1 p-6 space-y-0">
            {features.map((f, fi) => (
              <div
                key={f.name}
                className={`flex items-center justify-between py-3 ${
                  fi < features.length - 1 ? "border-b border-neutral-800" : ""
                }`}
              >
                <span className="text-sm text-neutral-400 pr-3">
                  {f.name}
                </span>
                <div className="shrink-0 text-right">
                  <FeatureValue value={f[plan.key]} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
