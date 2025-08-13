import exif from "exif-parser";

export function gpsFromBuffer(buf: Buffer){
  try {
    const data = exif.create(buf).parse();
    const g = data.tags as any;
    if (!g.GPSLatitude || !g.GPSLongitude) return null;
    const lat = dmsToDec(g.GPSLatitude, g.GPSLatitudeRef || "N");
    const lng = dmsToDec(g.GPSLongitude, g.GPSLongitudeRef || "E");
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng };
  } catch { return null; }
}
function dmsToDec(dms:number, ref:string){
  const sign = (ref==="S"||ref==="W")?-1:1;
  return sign * dms;
}