'use client';

import { StarFilledIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { Github } from '@/components/icons/social-icons';
import { TiltButton } from '@/components/tilt-button';

interface GitHubRepo {
  stargazers_count: number;
  html_url: string;
  name: string;
  full_name: string;
}

interface GitHubStarsButtonProps {
  repo: string;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function GitHubStarsButton({
  repo,
  showLabel = true,
  size = 'default',
  className,
}: GitHubStarsButtonProps) {
  const [starCount, setStarCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchStars() {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`);

        if (!response.ok) {
          throw new Error('Failed to fetch repository data');
        }

        const data: GitHubRepo = await response.json();

        if (isMounted) {
          setStarCount(data.stargazers_count);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching GitHub stars:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchStars();

    return () => {
      isMounted = false;
    };
  }, [repo]);

  const sizeMap = {
    sm: { width: 140, height: 36, elevation: 6, radius: 10 },
    default: { width: 180, height: 60, elevation: 8, radius: 10 },
    lg: { width: 200, height: 48, elevation: 10, radius: 12 },
  };
  const s = sizeMap[size];

  return (
    <a href={`https://github.com/${repo}`} target="_blank" rel="noopener noreferrer">
      <TiltButton
        variant="carbon"
        width={s.width}
        height={s.height}
        elevation={s.elevation}
        radius={s.radius}
        className={className}
      >
        <div className="flex items-center justify-between w-full px-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Github />
            {showLabel && <span className="text-sm font-medium">GitHub</span>}
          </div>
          <div className="flex items-center gap-1">
            <StarFilledIcon className="size-3.5 text-yellow-400" />
            <span className="text-sm font-semibold tabular-nums">
              {isLoading ? '···' : starCount !== null ? starCount : '0'}
            </span>
          </div>
        </div>
      </TiltButton>
    </a>
  );
}
