// Framework selection cards for setup tab
'use client';

import { motion } from 'framer-motion';
import { SiNextdotjs, SiNodedotjs, SiPython, SiSpringboot } from 'react-icons/si';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type Framework = 'nextjs' | 'nodejs' | 'python' | 'java';

const FRAMEWORKS: {
  id: Framework;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}[] = [
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Full-stack React framework with API routes, hooks, and UI components',
    icon: <SiNextdotjs className="size-8" />,
    features: ['Backend API', 'React Hooks', 'UI Components', 'Example Page'],
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    description: 'Express.js backend API with upload, delete, and model linking',
    icon: <SiNodedotjs className="size-8 text-green-600" />,
    features: ['Backend API', 'Example Usage'],
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Flask/FastAPI backend with utility functions for S3 operations',
    icon: <SiPython className="size-8 text-blue-500" />,
    features: ['Backend API', 'Utility Functions', 'Example Usage'],
  },
  {
    id: 'java',
    name: 'Java',
    description: 'Spring Boot REST API with S3 presigned URL generation',
    icon: <SiSpringboot className="size-8 text-green-500" />,
    features: ['Backend API', 'Utility Classes', 'Example Usage'],
  },
];

interface FrameworkSelectorProps {
  onSelect: (framework: Framework) => void;
}

export function FrameworkSelector({ onSelect }: FrameworkSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Choose Your Framework</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select a framework to get a tailored integration guide with code snippets you can copy directly into your project.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FRAMEWORKS.map((fw, i) => (
          <motion.button
            key={fw.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(fw.id)}
            className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex w-full items-center justify-between">
              <div className="rounded-lg bg-muted p-2.5">{fw.icon}</div>
              <Badge variant="outline" className="text-[10px]">
                {fw.features.length} steps
              </Badge>
            </div>
            <div>
              <p className="font-semibold text-sm">{fw.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fw.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fw.features.map((f) => (
                <Badge key={f} variant="secondary" className="text-[10px]">
                  {f}
                </Badge>
              ))}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

interface FrameworkHeaderProps {
  framework: Framework;
  onBack: () => void;
}

export function FrameworkHeader({ framework, onBack }: FrameworkHeaderProps) {
  const fw = FRAMEWORKS.find((f) => f.id === framework)!;
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
        <ArrowLeft className="size-3.5 mr-1" /> Back
      </Button>
      <div className="h-5 w-px bg-border" />
      <div className="rounded-md bg-muted p-1.5">{fw.icon}</div>
      <div>
        <p className="text-sm font-semibold">{fw.name} Integration</p>
        <p className="text-[11px] text-muted-foreground">{fw.description}</p>
      </div>
    </div>
  );
}
