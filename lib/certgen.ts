"use client";

// Client-side certificate generator — zero npm dependencies.
// Renders the MAS GLA Theory of Change certificate on a <canvas> (Montserrat via
// the FontFace API, real signature image), then exports:
//   - a PNG data URL  (the "image")
//   - a base64 PDF    (a one-page landscape PDF embedding the certificate as JPEG)
// Both are emailed as attachments, so nothing needs to be hosted.

const NAVY = "#0F2A4F";
const BLUE = "#1C4E9B";
const GOLD = "#C9A54A";
const GREEN = "#5BB947";
const GREY = "#6b7280";

let fontsReady: Promise<void> | null = null;
function ensureFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const defs: [string, string, string][] = [
      ["Montserrat", "/fonts/Montserrat-Regular.ttf", "400"],
      ["Montserrat", "/fonts/Montserrat-Bold.ttf", "700"],
      ["Montserrat", "/fonts/Montserrat-ExtraBold.ttf", "800"],
    ];
    const FF = (globalThis as unknown as { FontFace?: new (f: string, s: string, d?: { weight?: string }) => { load: () => Promise<unknown> } }).FontFace;
    const fontset = (document as unknown as { fonts?: { add: (f: unknown) => void } }).fonts;
    if (!FF || !fontset) return;
    await Promise.all(
      defs.map(async ([fam, url, weight]) => {
        try {
          const f = new FF(fam, `url(${url})`, { weight });
          await f.load();
          fontset.add(f);
        } catch {
          /* fall back to system font */
        }
      }),
    );
  })();
  return fontsReady;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface CertInput {
  name: string;
  date?: string; // pretty date; defaults to today
  cohort?: string; // e.g. "Cohort 5"
}

export interface CertOutput {
  pngDataUrl: string;
  jpegDataUrl: string;
}

/** Draw the certificate to a canvas and return PNG + JPEG data URLs. */
export async function renderCertificateImages({ name, date, cohort }: CertInput): Promise<CertOutput> {
  await ensureFonts();
  const W = 1400, H = 990, S = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(S, S);
  const cohortStr = cohort || "Cohort 5";
  const dateStr = date || new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  // background + frames
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.strokeRect(26, 26, W - 52, H - 52);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.strokeRect(34, 34, W - 68, H - 68);

  ctx.textAlign = "center";
  const line = (txt: string, y: number, font: string, color: string, ls = 0) => {
    ctx.font = font; ctx.fillStyle = color;
    try { (ctx as unknown as { letterSpacing: string }).letterSpacing = ls ? `${ls}px` : "0px"; } catch { /* not supported */ }
    ctx.fillText(txt, W / 2, y);
    try { (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px"; } catch { /* noop */ }
  };

  const logo = await loadImage("/mas-gla-logo.png");
  if (logo) { const lh = 56, lw = (logo.width / logo.height) * lh; ctx.drawImage(logo, W / 2 - lw / 2, 66, lw, lh); }
  else line("MAS  GREATER LOS ANGELES", 118, "800 15px Montserrat, Arial", BLUE, 6);
  line("THEORY OF CHANGE PROGRAM  ·  IN PARTNERSHIP WITH AMAL & COMPANY", 150, "600 11px Montserrat, Arial", "#8a97a6", 3);
  line("CERTIFICATE OF COMPLETION", 226, "700 15px Montserrat, Arial", NAVY, 9);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 - 35, 250); ctx.lineTo(W / 2 + 35, 250); ctx.stroke();
  line("This certificate is proudly presented to", 320, "400 15px Montserrat, Arial", GREY, 1);

  // name (auto-shrink to fit)
  let nameSize = 66;
  ctx.font = `800 ${nameSize}px Montserrat, Arial`;
  while (ctx.measureText(name).width > W - 320 && nameSize > 30) { nameSize -= 2; ctx.font = `800 ${nameSize}px Montserrat, Arial`; }
  line(name, 428, `800 ${nameSize}px Montserrat, Arial`, NAVY, 0);
  ctx.strokeStyle = "#e6e8ec"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 210, 470); ctx.lineTo(W / 2 + 210, 470); ctx.stroke();

  line("for successfully completing all five modules of the", 556, "400 17px Montserrat, Arial", "#374151", 0);
  line(`MAS GLA Theory of Change Program — ${cohortStr}`, 588, "700 17px Montserrat, Arial", BLUE, 0);
  line("demonstrating the commitment to move from learning to real, measurable impact.", 620, "400 17px Montserrat, Arial", "#374151", 0);

  line("1 · Why This Matters      2 · Q-Zero      3 · The Impact Pathway      4 · The Logframe      5 · Measuring & Validating",
       686, "600 12px Montserrat, Arial", BLUE, 0);

  // seal
  const cx = W / 2, cy = 820, r = 60;
  ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = GREEN; ctx.font = "800 10px Montserrat, Arial"; ctx.fillText("MAS GLA", cx, cy - 14);
  ctx.fillStyle = "#ffffff"; ctx.font = "800 22px Montserrat, Arial"; ctx.fillText("TOC", cx, cy + 10);
  ctx.fillStyle = "#c9d6e8"; ctx.font = "600 10px Montserrat, Arial"; ctx.fillText(cohortStr, cx, cy + 28);

  // date (left) + signature (right)
  const leftX = 300, rightX = W - 300, baseY = 892;
  ctx.textAlign = "center";
  ctx.fillStyle = NAVY; ctx.font = "700 20px Montserrat, Arial"; ctx.fillText(dateStr, leftX, baseY - 6);
  ctx.strokeStyle = NAVY; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(leftX - 120, baseY + 6); ctx.lineTo(leftX + 120, baseY + 6); ctx.stroke();
  ctx.fillStyle = "#8a97a6"; ctx.font = "600 11px Montserrat, Arial";
  try { (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px"; } catch { /* noop */ }
  ctx.fillText("DATE OF COMPLETION", leftX, baseY + 26);

  const sig = await loadImage("/omar-signature.png");
  try { (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px"; } catch { /* noop */ }
  if (sig) {
    const sh = 46, sw = (sig.width / sig.height) * sh;
    ctx.drawImage(sig, rightX - sw / 2, baseY - sh - 2, sw, sh);
  }
  ctx.strokeStyle = NAVY; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(rightX - 120, baseY + 6); ctx.lineTo(rightX + 120, baseY + 6); ctx.stroke();
  ctx.fillStyle = "#8a97a6"; ctx.font = "600 11px Montserrat, Arial";
  try { (ctx as unknown as { letterSpacing: string }).letterSpacing = "2px"; } catch { /* noop */ }
  ctx.fillText("OMAR AWAD · FACILITATOR", rightX, baseY + 26);
  try { (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px"; } catch { /* noop */ }

  return { pngDataUrl: canvas.toDataURL("image/png"), jpegDataUrl: canvas.toDataURL("image/jpeg", 0.94) };
}

/** Wrap a JPEG data URL into a one-page landscape PDF. Returns base64 (no prefix). */
export function jpegToPdfBase64(jpegDataUrl: string, pxW = 2800, pxH = 1980): string {
  const b64 = jpegDataUrl.split(",")[1] || "";
  const bin = atob(b64); // binary string of JPEG bytes
  // A4 landscape in points
  const pageW = 842, pageH = 595;
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const imgHeader = `<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bin.length} >>`;
  const imgObj = `${imgHeader}\nstream\n${bin}\nendstream`;
  objects.push(imgObj);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${off.toString().padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  // to base64 (Latin1-safe)
  let out = "";
  for (let i = 0; i < pdf.length; i++) out += String.fromCharCode(pdf.charCodeAt(i) & 0xff);
  return btoa(out);
}
