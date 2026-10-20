export const PHOTO_EXIF_FIELDS = {
  make: "Make",
  model: "Model",
  lensMake: "LensMake",
  lensModel: "LensModel",
  exposureTime: "ExposureTime",
  aperture: "FNumber",
  iso: "ISO",
  focalLength: "FocalLength",
  focalLength35mm: "FocalLengthIn35mmFormat",
};

export function selectPhotoExif(raw = {}, stamp) {
  const selected = {};
  for (const [key, tag] of Object.entries(PHOTO_EXIF_FIELDS)) {
    const value = raw[tag];
    if (["make", "model", "lensMake", "lensModel"].includes(key)) {
      if (typeof value === "string" && value.trim()) selected[key] = [...value].filter((char) => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127).join("").trim().slice(0, 160);
    } else if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      selected[key] = value;
    }
  }
  if (stamp) selected.dateTimeOriginal = stamp.replace(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/, "$1:$2:$3 $4:$5:$6");
  return selected;
}

const number = (value) => String(Number(value.toPrecision(6)));

export function formatPhotoSettings(exif = {}) {
  const parts = [];
  if (exif.focalLength) {
    let focal = `${number(exif.focalLength)}mm`;
    if (exif.focalLength35mm && exif.focalLength35mm !== exif.focalLength) focal += ` (${number(exif.focalLength35mm)}mm equiv.)`;
    parts.push(focal);
  } else if (exif.focalLength35mm) parts.push(`${number(exif.focalLength35mm)}mm equiv.`);
  if (exif.aperture) parts.push(`f/${number(exif.aperture)}`);
  if (exif.exposureTime) {
    const inverse = 1 / exif.exposureTime;
    parts.push(exif.exposureTime < 1 && Math.abs(inverse - Math.round(inverse)) < 0.01
      ? `1/${Math.round(inverse)}s` : `${number(exif.exposureTime)}s`);
  }
  if (exif.iso) parts.push(`ISO ${number(exif.iso)}`);
  return parts.join(" · ");
}

export function formatPhotoEquipment(exif = {}) {
  const camera = exif.model?.toLowerCase().startsWith(exif.make?.toLowerCase() || "")
    ? exif.model : [exif.make, exif.model].filter(Boolean).join(" ");
  const lens = exif.lensModel?.toLowerCase().startsWith(exif.lensMake?.toLowerCase() || "")
    ? exif.lensModel : [exif.lensMake, exif.lensModel].filter(Boolean).join(" ");
  return [camera, lens].filter(Boolean).join(" · ");
}
