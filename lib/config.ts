// Global application configuration — change name, logo, and branding here

export const APP_CONFIG = {
  /** Display name shown in sidebar, header, metadata, etc. */
  name: "DropOut",

  /** Short description used in metadata and onboarding */
  description: "Internal S3 + CloudFront management dashboard",

  /** Logo icon — import and set a React component, or use null for the default icon */
  logoIcon: "HardDrive" as const,

  /** GitHub repo for the stars button (owner/repo) */
  githubRepo: "abdelrahmangasser555/do-it-my-self",

  /** Footer tagline */
  tagline: "Local-only · No hosting",
} as const;
