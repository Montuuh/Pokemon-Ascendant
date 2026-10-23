import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import sharp from 'sharp';
import { normaliseMovePalette } from '../../scripts/lib/move-palette.mjs';

// Independent PNG decoder: count actual decoded RGB/alpha rather than trusting sharp's encoder or metadata.
// Supports non-interlaced indexed PNGs (1/2/4/8-bit), RGB8 and RGBA8 used by the runtime and installer.
function decodePng(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let palette = Buffer.alloc(0);
  let transparency = Buffer.alloc(0);
  const compressed: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    const kind = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + size);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8]!;
      type = data[9]!;
      expect(data[12]).toBe(0);
    }
    if (kind === 'PLTE') palette = Buffer.from(data);
    if (kind === 'tRNS') transparency = Buffer.from(data);
    if (kind === 'IDAT') compressed.push(data);
    offset += size + 12;
  }
  if (!(type === 3 && [1, 2, 4, 8].includes(depth)) && !([2, 6].includes(type) && depth === 8))
    throw new Error(`Unsupported test PNG profile ${type}/${depth}`);
  const channels = type === 6 ? 4 : type === 2 ? 3 : 1;
  const stride = Math.ceil((width * channels * depth) / 8);
  const bpp = Math.max(1, (channels * depth) / 8);
  const packed = inflateSync(Buffer.concat(compressed));
  const scan = Buffer.alloc(stride * height);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const x = Math.abs(p - a);
    const y = Math.abs(p - b);
    const z = Math.abs(p - c);
    return x <= y && x <= z ? a : y <= z ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)]!;
    if (filter > 4) throw new Error('Unknown PNG filter');
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? scan[y * stride + x - bpp]! : 0;
      const b = y > 0 ? scan[(y - 1) * stride + x]! : 0;
      const c = y > 0 && x >= bpp ? scan[(y - 1) * stride + x - bpp]! : 0;
      const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter]!;
      scan[y * stride + x] = (packed[y * (stride + 1) + 1 + x]! + predictor) & 255;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dest = (y * width + x) * 4;
      if (type === 3) {
        const index =
          (scan[y * stride + Math.floor((x * depth) / 8)]! >> (8 - depth - ((x * depth) % 8))) &
          ((1 << depth) - 1);
        rgba.set(palette.subarray(index * 3, index * 3 + 3), dest);
        rgba[dest + 3] = transparency[index] ?? 255;
      } else {
        const p = y * stride + x * channels;
        rgba.set(scan.subarray(p, p + 3), dest);
        rgba[dest + 3] = type === 6 ? scan[p + 3]! : 255;
      }
    }
  return { width, height, rgba };
}
function contract(bytes: Buffer) {
  const decoded = decodePng(bytes);
  const colours = new Set<number>();
  const alpha: number[] = [];
  for (let i = 0; i < decoded.rgba.length; i += 4) {
    const a = decoded.rgba[i + 3]!;
    alpha.push(a);
    if (a) colours.add((decoded.rgba[i]! << 16) | (decoded.rgba[i + 1]! << 8) | decoded.rgba[i + 2]!);
  }
  return { ...decoded, colours: colours.size, alpha };
}

describe('Move art palette — §9.2.3 / D9', () => {
  it('Quantizer_ManyColours_PreservesEveryNativePixelAndAlphaMask', async () => {
    const width = 68;
    const height = 45;
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++)
      rgba.set([(i * 29) % 256, (i * 37) % 256, (i * 53) % 256, i % 7 === 0 ? 0 : 255], i * 4);
    const input = await sharp(rgba, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();
    const output = await normaliseMovePalette(input);
    const result = contract(output);
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(result.alpha).toEqual(contract(input).alpha);
    expect(result.colours).toBeGreaterThan(1);
    expect(result.colours).toBeLessThanOrEqual(20);
    expect(output).toEqual(await normaliseMovePalette(input));
  });

  it('Quantizer_AlreadyCompliant_PreservesOpaqueRGBAndRejectsInvalidAlpha', async () => {
    const rgba = Buffer.from([0, 0, 0, 0, 12, 18, 24, 255, 250, 240, 210, 255, 130, 56, 230, 255]);
    const input = await sharp(rgba, { raw: { width: 4, height: 1, channels: 4 } })
      .png()
      .toBuffer();
    const output = await normaliseMovePalette(input);
    expect(decodePng(output).rgba).toEqual(rgba);
    expect(output).toEqual(await normaliseMovePalette(output));
    rgba[3] = 127;
    await expect(
      normaliseMovePalette(
        await sharp(rgba, { raw: { width: 4, height: 1, channels: 4 } })
          .png()
          .toBuffer(),
      ),
    ).rejects.toThrow('binary alpha');
    await expect(
      normaliseMovePalette(
        await sharp(Buffer.alloc(4), { raw: { width: 1, height: 1, channels: 4 } })
          .png()
          .toBuffer(),
      ),
    ).rejects.toThrow('opaque pixel');
  });

  it('Runtime_AllMovePNGs_ActualDecodedColoursAndBinaryAlphaMeetContract', () => {
    const files = readdirSync('public/art/moves').filter((file) => file.endsWith('.png'));
    expect(files.length).toBeGreaterThanOrEqual(161);
    const failures: string[] = [];
    for (const file of files) {
      const art = contract(readFileSync(`public/art/moves/${file}`));
      if (
        art.colours === 0 ||
        art.colours > 20 ||
        art.alpha.some((a) => a !== 0 && a !== 255) ||
        art.width > 68 ||
        art.height > 45
      )
        failures.push(
          `${file}: ${art.width}x${art.height}, ${art.colours} opaque RGB colours, alpha ${[...new Set(art.alpha)].join('/')}`,
        );
    }
    expect(failures).toEqual([]);
  });
});
