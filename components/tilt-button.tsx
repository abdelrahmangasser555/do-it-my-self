'use client';

import React, {
  useRef,
  useState,
  useCallback,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import './tilt-button.css';

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

const VARIANTS = {
  solid: {
    surfaceColor: '#f3f4f6',
    sideColor: '#d1d5db',
    textColor: '#111827',
    borderColor: 'rgba(0,0,0,0.35)',
    glareRgb: '255,255,255',
  },
  outline: {
    surfaceColor: 'transparent',
    sideColor: 'transparent',
    textColor: '#f3f4f6',
    borderColor: 'rgba(255,255,255,0.35)',
    glareRgb: '255,255,255',
  },
  dark: {
    surfaceColor: '#1f2937',
    sideColor: '#111827',
    textColor: '#f9fafb',
    borderColor: 'rgba(255,255,255,0.15)',
    glareRgb: '255,255,255',
  },
  arcade: {
    surfaceColor: '#ef4444',
    sideColor: '#991b1b',
    textColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.3)',
    glareRgb: '255,200,200',
  },
  gum: {
    surfaceColor: '#ec4899',
    sideColor: '#be185d',
    textColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.18)',
    glareRgb: '255,200,230',
  },
  carbon: {
    surfaceColor: '#18181b',
    sideColor: '#09090b',
    textColor: '#fafafa',
    borderColor: 'rgba(255,255,255,0.1)',
    glareRgb: '160,160,170',
  },
  warning: {
    surfaceColor: '#facc15',
    sideColor: '#a16207',
    textColor: '#1c1917',
    borderColor: 'rgba(0,0,0,0.2)',
    glareRgb: '255,255,200',
  },
  steel: {
    surfaceColor: '#64748b',
    sideColor: '#334155',
    textColor: '#f8fafc',
    borderColor: 'rgba(0,0,0,0.25)',
    glareRgb: '200,210,225',
  },
  gold: {
    surfaceColor: '#d97706',
    sideColor: '#92400e',
    textColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.3)',
    glareRgb: '255,230,160',
  },
  lavender: {
    surfaceColor: '#a78bfa',
    sideColor: '#6d28d9',
    textColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.15)',
    glareRgb: '220,200,255',
  },
  orange: {
    surfaceColor: '#f97316',
    sideColor: '#c2410c',
    textColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.25)',
    glareRgb: '255,220,180',
  },
  lime: {
    surfaceColor: '#84cc16',
    sideColor: '#3f6212',
    textColor: '#1a2e05',
    borderColor: 'rgba(0,0,0,0.2)',
    glareRgb: '210,255,180',
  },
  emerald: {
    surfaceColor: '#10b981',
    sideColor: '#065f46',
    textColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.2)',
    glareRgb: '180,255,220',
  },
  error: {
    surfaceColor: '#ef4444',
    sideColor: '#991b1b',
    textColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.3)',
    glareRgb: '255,200,200',
  },
} as const;

type VariantName = keyof typeof VARIANTS;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): string | null {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return null;
  return m.map((c) => parseInt(c, 16)).join(',');
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface TiltButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: ReactNode;
  variant?: VariantName;
  elevation?: number;
  pressInset?: number;
  tilt?: boolean;
  pressTilt?: boolean;
  motion?: boolean;
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  surfaceColor?: string;
  sideColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  glareColor?: string;
  glareAlpha?: number;
  glareWidth?: number;
  style?: CSSProperties;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function TiltButton({
  children,
  variant = 'solid',
  elevation = 14,
  pressInset = 5,
  tilt = true,
  pressTilt = true,
  motion = true,
  width = 'auto',
  height = 'auto',
  radius = 14,
  surfaceColor,
  sideColor,
  textColor,
  borderColor,
  borderWidth = 2,
  glareColor,
  glareAlpha = 0.12,
  glareWidth = 28,
  disabled,
  className,
  style,
  ...rest
}: TiltButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [zone, setZone] = useState<'idle' | 'left' | 'middle' | 'right'>('idle');
  const [pressed, setPressed] = useState(false);

  /* ---- Resolve variant colours ---- */
  const v = VARIANTS[variant];
  const _surface = surfaceColor ?? v.surfaceColor;
  const _side = sideColor ?? v.sideColor;
  const _text = textColor ?? v.textColor;
  const _border = borderColor ?? v.borderColor;
  const _glareRgb = glareColor ? (hexToRgb(glareColor) ?? v.glareRgb) : v.glareRgb;

  /* ---- Pointer handlers ---- */
  const onMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || !tilt || !motion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      if (x < 0.35) setZone('left');
      else if (x > 0.65) setZone('right');
      else setZone('middle');
    },
    [disabled, tilt, motion],
  );

  const onLeave = useCallback(() => {
    setZone('idle');
    setPressed(false);
  }, []);

  const onDown = useCallback(() => {
    if (!disabled) setPressed(true);
  }, [disabled]);

  const onUp = useCallback(() => setPressed(false), []);

  /* ---- CSS variables ---- */
  const vars: Record<string, string | number> = {
    '--button-raise-level': `${elevation}px`,
    '--press-inset': `${pressInset}px`,
    '--press-compensated': `${Math.max(0, pressInset - 2)}px`,
    '--radius': typeof radius === 'number' ? `${radius}px` : radius,
    '--surface-color': _surface,
    '--side-color': _side,
    '--text-color': _text,
    '--border-color': _border,
    '--border-width': `${borderWidth}px`,
    '--glare-rgb': _glareRgb,
    '--glare-alpha': glareAlpha,
    '--glare-width': glareWidth,
  };

  const w = typeof width === 'number' ? `${width}px` : width === 'auto' ? 'max-content' : width;
  const h =
    typeof height === 'number'
      ? `${height + elevation}px`
      : height === 'auto'
        ? 'auto'
        : `calc(${height} + ${elevation}px)`;

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'soft-btn',
        zone === 'left' && 'soft-btn--left',
        zone === 'right' && 'soft-btn--right',
        zone === 'middle' && 'soft-btn--middle',
        pressed && 'soft-btn--active',
        pressTilt && 'soft-btn--press-tilt',
        disabled && 'soft-btn--disabled',
        className,
      )}
      style={
        {
          ...vars,
          width: w,
          height: h,
          minHeight: typeof height === 'number' ? `${height + elevation}px` : undefined,
          ...style,
        } as CSSProperties
      }
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      {...rest}
    >
      <span className="soft-btn__wrapper">
        <span className="soft-btn__content">
          <span className="soft-btn__inner">{children}</span>
        </span>
      </span>
    </button>
  );
}
