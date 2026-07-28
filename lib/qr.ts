// A small, dependency-free QR Code encoder.
//
// We generate QR codes entirely in the browser so a facilitator can project a
// scannable code (or download one for a slide/handout) without calling any
// external service — nothing about the worksheet URL ever leaves the device,
// and it works offline and on Vercel with no extra install.
//
// This is a compact TypeScript port of Nayuki's "QR Code generator" reference
// implementation (public domain / MIT). It supports byte-mode text, automatic
// version selection and automatic mask selection — everything a short URL needs.

// ---- Error-correction level -------------------------------------------------

export type Ecc = "L" | "M" | "Q" | "H";

const ECC_FORMAT_BITS: Record<Ecc, number> = { L: 1, M: 0, Q: 3, H: 2 };
const ECC_CODEWORDS_PER_BLOCK: Record<Ecc, number[]> = {
  // Indexed by version (1..40); index 0 is a placeholder.
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
const NUM_ERROR_CORRECTION_BLOCKS: Record<Ecc, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

// ---- Reed-Solomon over GF(256) ---------------------------------------------

function reedSolomonComputeDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonComputeRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift()!;
    result.push(0);
    divisor.forEach((coef, i) => { result[i] ^= reedSolomonMultiply(coef, factor); });
  }
  return result;
}

function reedSolomonMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

// ---- Bit buffer -------------------------------------------------------------

function appendBits(val: number, len: number, bb: number[]): void {
  for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
}

// ---- Public API -------------------------------------------------------------

/** A finished QR Code: `size`×`size` modules, `modules[y][x]` true = dark. */
export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * Encode `text` (UTF-8, byte mode) into a QR matrix at the given ECC level.
 * Picks the smallest version that fits and the mask with the lowest penalty.
 */
export function encodeQr(text: string, ecc: Ecc = "M", forceMask?: number): QrMatrix {
  const data = toUtf8(text);

  // Byte-mode segment header + data fits which version?
  let version = 1;
  let dataUsedBits = 0;
  for (; ; version++) {
    if (version > 40) throw new Error("Text too long for a QR code");
    const capacityBits = getNumDataCodewords(version, ecc) * 8;
    const ccBits = version <= 9 ? 8 : 16; // byte-mode char-count bits
    dataUsedBits = 4 + ccBits + data.length * 8;
    if (dataUsedBits <= capacityBits) break;
  }

  // Build the bit stream: mode (0100) + char count + bytes.
  const bb: number[] = [];
  appendBits(0x4, 4, bb);
  appendBits(data.length, version <= 9 ? 8 : 16, bb);
  for (const b of data) appendBits(b, 8, bb);

  // Terminator + byte alignment + pad bytes.
  const dataCapacityBits = getNumDataCodewords(version, ecc) * 8;
  appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
  appendBits(0, (8 - (bb.length % 8)) % 8, bb);
  for (let pad = 0xec; bb.length < dataCapacityBits; pad ^= 0xec ^ 0x11) appendBits(pad, 8, bb);

  // Pack bits into codewords.
  const dataCodewords = new Array<number>(bb.length / 8).fill(0);
  bb.forEach((bit, i) => { dataCodewords[i >>> 3] |= bit << (7 - (i & 7)); });

  const allCodewords = addEccAndInterleave(dataCodewords, version, ecc);
  return drawMatrix(version, ecc, allCodewords, forceMask);
}

// ---- Codeword assembly ------------------------------------------------------

function getNumRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(version: number, ecc: Ecc): number {
  return (
    Math.floor(getNumRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecc][version] * NUM_ERROR_CORRECTION_BLOCKS[ecc][version]
  );
}

function addEccAndInterleave(data: number[], version: number, ecc: Ecc): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecc][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const rsDiv = reedSolomonComputeDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + datLen);
    k += datLen;
    const ecCodewords = reedSolomonComputeRemainder(dat, rsDiv);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecCodewords));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      // Skip the padding cell in short blocks.
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

// ---- Matrix drawing ---------------------------------------------------------

function drawMatrix(version: number, ecc: Ecc, codewords: number[], forceMask?: number): QrMatrix {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const setFn = (x: number, y: number, dark: boolean) => { modules[y][x] = dark; isFunction[y][x] = true; };

  // Timing patterns.
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }

  // Finder patterns (+ separators) at three corners.
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Alignment patterns.
  const alignPos = getAlignmentPatternPositions(version);
  const numAlign = alignPos.length;
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      // Skip the three that overlap finder patterns.
      if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0)) continue;
      const cx = alignPos[i], cy = alignPos[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Reserve format/version areas so data avoids them (drawn for real later).
  reserveFormatInfo(size, setFn);
  if (version >= 7) reserveVersionInfo(size, setFn);

  // Lay out the data + ECC codewords in the zig-zag pattern.
  drawCodewords(codewords, size, modules, isFunction);

  // Try all 8 masks; keep the lowest-penalty one.
  let bestMask = 0;
  let minPenalty = Infinity;
  let bestModules = modules;
  for (let mask = 0; mask < 8; mask++) {
    if (forceMask !== undefined && mask !== forceMask) continue;
    const trial = modules.map((row) => row.slice());
    applyMask(trial, isFunction, mask);
    drawFormatBits(trial, isFunction, ecc, mask, size);
    const penalty = penaltyScore(trial, size);
    if (penalty < minPenalty) { minPenalty = penalty; bestMask = mask; bestModules = trial; }
  }
  // Redraw version info onto the winning matrix (mask doesn't touch it).
  if (version >= 7) drawVersionBits(bestModules, version, size);
  void bestMask;

  return { size, modules: bestModules };
}

function getAlignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function reserveFormatInfo(size: number, setFn: (x: number, y: number, d: boolean) => void): void {
  // Reserve the format-info strips, but leave column 6 / row 6 alone — those
  // cells belong to the timing patterns, and the real format bits skip them.
  for (let i = 0; i < 9; i++) {
    if (i !== 6) { setFn(8, i, false); setFn(i, 8, false); }
  }
  for (let i = 0; i < 8; i++) { setFn(size - 1 - i, 8, false); setFn(8, size - 1 - i, false); }
  setFn(8, size - 8, true); // dark module (always set)
}

function reserveVersionInfo(size: number, setFn: (x: number, y: number, d: boolean) => void): void {
  for (let i = 0; i < 18; i++) {
    const a = size - 11 + (i % 3), b = Math.floor(i / 3);
    setFn(a, b, false); setFn(b, a, false);
  }
}

function drawCodewords(codewords: number[], size: number, modules: boolean[][], isFunction: boolean[][]): void {
  let i = 0; // bit index
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && i < codewords.length * 8) {
          modules[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

function applyMask(modules: boolean[][], isFunction: boolean[][], mask: number): void {
  const size = modules.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFunction[y][x]) continue;
      let invert = false;
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      }
      if (invert) modules[y][x] = !modules[y][x];
    }
  }
}

function drawFormatBits(modules: boolean[][], isFunction: boolean[][], ecc: Ecc, mask: number, size: number): void {
  const data = (ECC_FORMAT_BITS[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  const place = (x: number, y: number, bit: number) => { modules[y][x] = ((bits >>> bit) & 1) !== 0; void isFunction; };
  // First copy (around top-left finder).
  for (let i = 0; i <= 5; i++) place(8, i, i);
  place(8, 7, 6);
  place(8, 8, 7);
  place(7, 8, 8);
  for (let i = 9; i < 15; i++) place(14 - i, 8, i);
  // Second copy (split across the other two finders).
  for (let i = 0; i < 8; i++) place(size - 1 - i, 8, i);
  for (let i = 8; i < 15; i++) place(8, size - 15 + i, i);
  modules[size - 8][8] = true; // always-dark module
}

function drawVersionBits(modules: boolean[][], version: number, size: number): void {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >>> i) & 1) !== 0;
    const a = size - 11 + (i % 3), b = Math.floor(i / 3);
    modules[b][a] = bit;
    modules[a][b] = bit;
  }
}

// Penalty scoring picks the mask that reads most reliably. This follows the
// QR spec's four rules exactly (the finder-pattern rule uses the run-history
// method from Nayuki's reference implementation) so the chosen mask matches
// what a spec-conformant encoder would pick.
const PENALTY_N1 = 3, PENALTY_N2 = 3, PENALTY_N3 = 40, PENALTY_N4 = 10;

function finderPenaltyAddHistory(size: number, run: number, hist: number[]): void {
  if (hist[0] === 0) run += size; // account for the light border before the first run
  hist.pop();
  hist.unshift(run);
}

function finderPenaltyCountPatterns(hist: number[]): number {
  const n = hist[1];
  const core = n > 0 && hist[2] === n && hist[3] === n * 3 && hist[4] === n && hist[5] === n;
  return (core && hist[0] >= n * 4 && hist[6] >= n ? 1 : 0) +
         (core && hist[6] >= n * 4 && hist[0] >= n ? 1 : 0);
}

function finderPenaltyTerminate(size: number, runColor: boolean, run: number, hist: number[]): number {
  if (runColor) { finderPenaltyAddHistory(size, run, hist); run = 0; }
  run += size; // add the light border to the final run
  finderPenaltyAddHistory(size, run, hist);
  return finderPenaltyCountPatterns(hist);
}

function penaltyScore(modules: boolean[][], size: number): number {
  let result = 0;

  // Rules 1 & 3 along rows.
  for (let y = 0; y < size; y++) {
    let runColor = false, runLen = 0;
    const hist = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x++) {
      if (modules[y][x] === runColor) {
        runLen++;
        if (runLen === 5) result += PENALTY_N1;
        else if (runLen > 5) result++;
      } else {
        finderPenaltyAddHistory(size, runLen, hist);
        if (!runColor) result += finderPenaltyCountPatterns(hist) * PENALTY_N3;
        runColor = modules[y][x];
        runLen = 1;
      }
    }
    result += finderPenaltyTerminate(size, runColor, runLen, hist) * PENALTY_N3;
  }

  // Rules 1 & 3 along columns.
  for (let x = 0; x < size; x++) {
    let runColor = false, runLen = 0;
    const hist = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y++) {
      if (modules[y][x] === runColor) {
        runLen++;
        if (runLen === 5) result += PENALTY_N1;
        else if (runLen > 5) result++;
      } else {
        finderPenaltyAddHistory(size, runLen, hist);
        if (!runColor) result += finderPenaltyCountPatterns(hist) * PENALTY_N3;
        runColor = modules[y][x];
        runLen = 1;
      }
    }
    result += finderPenaltyTerminate(size, runColor, runLen, hist) * PENALTY_N3;
  }

  // Rule 2: 2x2 blocks of the same colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) result += PENALTY_N2;
    }
  }

  // Rule 4: overall balance of dark modules.
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * PENALTY_N4;

  return result;
}

// ---- Helpers ----------------------------------------------------------------

function toUtf8(str: string): number[] {
  const out: number[] = [];
  for (const ch of str) {
    let cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

/** Render a matrix to a standalone SVG string (dark on white, with quiet zone). */
export function qrToSvg(qr: QrMatrix, opts?: { scale?: number; margin?: number; dark?: string; light?: string }): string {
  const scale = opts?.scale ?? 8;
  const margin = opts?.margin ?? 4;
  const dark = opts?.dark ?? "#0f172a";
  const light = opts?.light ?? "#ffffff";
  const dim = (qr.size + margin * 2) * scale;

  let path = "";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) path += `M${(x + margin) * scale},${(y + margin) * scale}h${scale}v${scale}h-${scale}z`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/>` +
    `</svg>`
  );
}
