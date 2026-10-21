export interface PhotoVariant {
  src: string;
  width: number;
  height: number;
  bytes: number;
}

export interface PhotoLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface Photo {
  id: string;
  source: string;
  fingerprint: string;
  sequence: number;
  importedAt: string;
  capturedAt: string | null;
  takenAt: string;
  title: string;
  alt: string;
  published: boolean;
  width: number;
  height: number;
  sourceBytes: number;
  placeholder: string;
  thumbnails: PhotoVariant[];
  large: PhotoVariant;
  location?: PhotoLocation;
  exif?: {
    make?: string;
    model?: string;
    lensMake?: string;
    lensModel?: string;
    exposureTime?: number;
    aperture?: number;
    iso?: number;
    focalLength?: number;
    focalLength35mm?: number;
    dateTimeOriginal?: string;
  };
}

export function photoSrcset(variants: PhotoVariant[]) {
  // Prefer the last (higher-quality large) variant when widths coincide.
  return [...new Map(variants.map((variant) => [variant.width, variant])).values()]
    .sort((a, b) => a.width - b.width)
    .map(({ src, width }) => `${src} ${width}w`).join(", ");
}
