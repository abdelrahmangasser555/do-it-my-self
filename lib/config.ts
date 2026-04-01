// Global application configuration — change name, logo, and branding here

export const APP_CONFIG = {
  /** Display name shown in sidebar, header, metadata, etc. */
  name: 'DropOut',

  /** Short description used in metadata and onboarding */
  description: 'Internal S3 + CloudFront management dashboard',

  /** Logo image path for dark theme (sidebar, header, etc.) */
  logoDark: '/logos/white transparent background.png',

  /** Logo image path for light theme — replace with a dark-colored version when available */
  logoLight: '/logos/white transparent background.png',

  /** GitHub repo for the stars button (owner/repo) */
  githubRepo: 'abdelrahmangasser555/do-it-my-self',

  /** Footer tagline */
  tagline: 'Local-only · No hosting',

  /** YouTube embed URL for the onboarding setup video (shown on step 1) */
  setupVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',

  /** YouTube embed URL for the tutorial video (shown in sidebar) */
  tutorialVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',

  /** Creator personal website URL */
  creatorWebsite: 'https://example.com',
} as const;
