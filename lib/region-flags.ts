// AWS region → country ISO alpha-2 code mapping for CircleFlag icons

export interface RegionCountryInfo {
  country: string;
  alpha2: string;
  lat: number;
  lng: number;
}

export const AWS_REGION_COUNTRY: Record<string, RegionCountryInfo> = {
  'us-east-1': { country: 'United States', alpha2: 'us', lat: 38.95, lng: -77.45 },
  'us-east-2': { country: 'United States', alpha2: 'us', lat: 40.42, lng: -82.91 },
  'us-west-1': { country: 'United States', alpha2: 'us', lat: 37.35, lng: -121.96 },
  'us-west-2': { country: 'United States', alpha2: 'us', lat: 46.15, lng: -123.88 },
  'ca-central-1': { country: 'Canada', alpha2: 'ca', lat: 45.5, lng: -73.6 },
  'ca-west-1': { country: 'Canada', alpha2: 'ca', lat: 51.05, lng: -114.07 },
  'eu-west-1': { country: 'Ireland', alpha2: 'ie', lat: 53.35, lng: -6.26 },
  'eu-west-2': { country: 'United Kingdom', alpha2: 'gb', lat: 51.51, lng: -0.13 },
  'eu-west-3': { country: 'France', alpha2: 'fr', lat: 48.86, lng: 2.35 },
  'eu-central-1': { country: 'Germany', alpha2: 'de', lat: 50.11, lng: 8.68 },
  'eu-central-2': { country: 'Switzerland', alpha2: 'ch', lat: 47.37, lng: 8.54 },
  'eu-north-1': { country: 'Sweden', alpha2: 'se', lat: 59.33, lng: 18.07 },
  'eu-south-1': { country: 'Italy', alpha2: 'it', lat: 45.46, lng: 9.19 },
  'eu-south-2': { country: 'Spain', alpha2: 'es', lat: 40.42, lng: -3.7 },
  'ap-southeast-1': { country: 'Singapore', alpha2: 'sg', lat: 1.35, lng: 103.82 },
  'ap-southeast-2': { country: 'Australia', alpha2: 'au', lat: -33.87, lng: 151.21 },
  'ap-southeast-3': { country: 'Indonesia', alpha2: 'id', lat: -6.21, lng: 106.85 },
  'ap-southeast-4': { country: 'Australia', alpha2: 'au', lat: -37.81, lng: 144.96 },
  'ap-northeast-1': { country: 'Japan', alpha2: 'jp', lat: 35.69, lng: 139.69 },
  'ap-northeast-2': { country: 'South Korea', alpha2: 'kr', lat: 37.57, lng: 126.98 },
  'ap-northeast-3': { country: 'Japan', alpha2: 'jp', lat: 34.69, lng: 135.5 },
  'ap-south-1': { country: 'India', alpha2: 'in', lat: 19.08, lng: 72.88 },
  'ap-south-2': { country: 'India', alpha2: 'in', lat: 17.39, lng: 78.49 },
  'ap-east-1': { country: 'Hong Kong', alpha2: 'hk', lat: 22.32, lng: 114.17 },
  'sa-east-1': { country: 'Brazil', alpha2: 'br', lat: -23.55, lng: -46.63 },
  'me-south-1': { country: 'Bahrain', alpha2: 'bh', lat: 26.07, lng: 50.55 },
  'me-central-1': { country: 'UAE', alpha2: 'ae', lat: 24.45, lng: 54.65 },
  'af-south-1': { country: 'South Africa', alpha2: 'za', lat: -33.93, lng: 18.42 },
  'il-central-1': { country: 'Israel', alpha2: 'il', lat: 32.07, lng: 34.78 },
};

/** Get the ISO alpha-2 country code for a given AWS region */
export function getRegionAlpha2(region: string): string {
  return AWS_REGION_COUNTRY[region]?.alpha2 ?? 'un';
}

/** Get the country name for a given AWS region */
export function getRegionCountry(region: string): string {
  return AWS_REGION_COUNTRY[region]?.country ?? 'Unknown';
}

/** Get lat/lng for a given AWS region */
export function getRegionCoords(region: string): { lat: number; lng: number } | null {
  const info = AWS_REGION_COUNTRY[region];
  return info ? { lat: info.lat, lng: info.lng } : null;
}
