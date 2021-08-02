import getPixels from 'get-pixels';
import { Data, NdArray } from 'ndarray';
import { pixel, Pixel } from './pixel';

export async function loadPixels({ input, mimeType, debug }: { input: string | Uint8Array; mimeType: string; debug: (str: string) => void; }): Promise<Pixel[][][]> {
  return new Promise((resolve, reject) => {
    getPixels(input, mimeType, (err, px) => callback(err, px));

    function callback(err: Error | null, px: NdArray) {
      if (err != null) {
        reject(err);
      } else {
        try {
          resolve(convertTo3dPixelArray(px, debug));
        } catch (e) {
          reject(e);
        }
      }
    }
  });
}

function convertTo3dPixelArray(px: NdArray<Data<number>>, debug: (str: string) => void): Pixel[][][] {
  const shapeStart = px.shape.length === 4 ? 1 : 0;
  if (shapeStart > 0) {
    debug(`image has multiple (${px.shape[0]}) frames`);
  }
  const width = px.shape[shapeStart];
  const height = px.shape[shapeStart + 1];
  debug(`input image dimensions: ${width}x${height}`);
  const channels = px.shape[shapeStart + 2];
  debug(`input image has ${channels} color channels`);
  if (channels > 4 || channels < 1) {
    throw new Error(`unexpected number of channels: ${channels}`);
  }
  const output: Pixel[][][] = [];
  for (let i = 0; i < px.data.length - channels + 1; i += channels) {
    createPixel(i, channels, width, height, output, px.data);
  }
  return output;
}

function createPixel(i: number, channels: number, width: number, height: number, output: Pixel[][][], data: Data) {
  const frame = Math.floor((i / channels) / (width * height));
  const x = (i / channels) % width;
  const y = Math.floor((i / channels) / width) - (frame * height);
  if (!output[frame]) {
    output[frame] = [];
  }
  if (!output[frame][y]) {
    output[frame][y] = [];
  }
  if (channels === 1) {
    output[frame][y][x] = pixel(data[i]);
  }
  if (channels === 2) {
    output[frame][y][x] = pixel(data[i], data[i + 1]);
  }
  if (channels === 3) {
    output[frame][y][x] = pixel(data[i], data[i + 1], data[i + 2]);
  }
  if (channels === 4) {
    output[frame][y][x] = pixel(data[i], data[i + 1], data[i + 2], data[i + 3]);
  }
}

