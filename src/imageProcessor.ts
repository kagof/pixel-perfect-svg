import { fromRgba, Pixel } from './pixel';

export type ToSvgStringParams = {
  frame: Pixel[][],
  pretty?: boolean,
  noMetadata?: boolean,
  trimAlpha?: boolean,
  maxLeftTrim?: number,
  maxRightTrim?: number,
  maxTopTrim?: number,
  maxBottomTrim?: number,
  minWidth?: number,
  minHeight?: number,
  debug?: (str: string) => void
}

export function toSvgString(params: ToSvgStringParams): Promise<string> {
  const frame = params.frame;
  const pretty = !!params.pretty;
  const noMetadata = !!params.noMetadata;
  const trimAlpha = !!params.trimAlpha;
  const debug: (str: string) => void = params.debug || (() => undefined);

  const maxLeftTrim = params.maxLeftTrim == null ? Number.MAX_SAFE_INTEGER : params.maxLeftTrim;
  const maxRightTrim = params.maxRightTrim == null ? Number.MAX_SAFE_INTEGER : params.maxRightTrim;
  const maxTopTrim = params.maxTopTrim == null ? Number.MAX_SAFE_INTEGER : params.maxTopTrim;
  const maxBottomTrim = params.maxBottomTrim == null ? Number.MAX_SAFE_INTEGER : params.maxBottomTrim;

  const minWidth = params.minWidth == null ? 0 : params.minWidth;
  const maxHorizontalTrim = frame[0].length - minWidth;
  const minHeight = params.minHeight == null ? 0 : params.minHeight;
  const maxVerticalTrim = frame.length - minHeight;

  return new Promise((resolve, reject) => {
    try {
    const distinctPixels: Map<string, Coordinate[]> = getDistinctPixels(frame, debug);

    const leftTrim = trimAlpha ? Math.min(maxLeftTrim, numBlankLinesLeft(frame), maxHorizontalTrim) : 0;
    const rightTrim = trimAlpha ? Math.min(maxRightTrim, numBlankLinesRight(frame), maxHorizontalTrim - leftTrim) : 0;
    const topTrim = trimAlpha ? Math.min(maxTopTrim, numBlankLinesTop(frame), maxVerticalTrim) : 0;
    const bottomTrim = trimAlpha ? Math.min(maxBottomTrim, numBlankLinesBottom(frame), maxVerticalTrim - topTrim) : 0;
    if (trimAlpha && (leftTrim !== 0 || rightTrim !== 0 || topTrim != 0 || bottomTrim != 0)) {
      debug(`output image will trim (left: ${leftTrim} right: ${rightTrim} top: ${topTrim} bottom: ${bottomTrim}) blank lines`);
    }

    let str = '<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" ';
      const width = frame[0].length - leftTrim - rightTrim;
      const height = frame.length - topTrim - bottomTrim;
    str += `viewBox="0 -0.5 ${width} ${height}" width="${width}" height="${height}">`;
    str = addNewlineIfPretty(str);
    if (!noMetadata) {
      str += '<metadata>Generated with pixel-perfect-svg https://github.com/kagof/pixel-perfect-svg</metadata>';
      str = addNewlineIfPretty(str);
    }

    let longest = 0;
    distinctPixels.forEach((coords, rgba) => {
      const pixel = fromRgba(rgba);
      if (pixel.opacity() == 0) {
        return;
      }
      str = addIndentIfPretty(str);
      str += `<path stroke="${pixel.rgb()}" `;
      if (pixel.a < 255) {
        str += `opacity="${pixel.opacity()}" `;
      }
      str += `d="`;
      let lineStarted = false;
      let numPixels = 0;
      coords.forEach((coord, idx) => {
        if (!lineStarted) {
          if (str.length - str.lastIndexOf('\n') >= 80) {
            str = addNewlineIfPretty(str);
            str = addIndentIfPretty(str, 2);
          }
          str += `M${coord.x - leftTrim},${coord.y - topTrim}`;
          if (pretty) {
            str += ' ';
          }
          lineStarted = true;
          numPixels = 0;
        }
        const nextCoord = coords[idx + 1];
        if (!nextCoord || nextCoord.x !== coord.x + 1 || nextCoord.y !== coord.y) {
          str += `h${++numPixels}`;
          lineStarted = false;
          if (numPixels > longest) {
            longest = numPixels;
          }
          if (pretty && nextCoord) {
            str += ' ';
          }
        } else {
          numPixels++;
        }
      });
      str += `"/>`;
      str = addNewlineIfPretty(str);
    });
    str += '</svg>\n';
    debug(`output image longest continuous color section: ${longest}`);
    resolve(str);
  } catch (err) {
    reject(err);
  }
  });

  function addNewlineIfPretty(str: string): string {
    if (pretty) {
      str += '\n';
    }
    return str;
  }

  function addIndentIfPretty(str: string, times = 1): string {
    if (pretty) {
      for (let i = 0; i < times; i++) {
        str += '  ';
      }
    }
    return str;
  }
}

function getDistinctPixels(frame: Pixel[][], debug: (str: string) => void): Map<string, Coordinate[]> {
  const distinctPixels: Map<string, Coordinate[]> = new Map();
  for (let y = 0; y < frame.length; y++) {
    for (let x = 0; x < frame[y].length; x++) {
      if (frame[y][x].a != 0) {
        const rgba = frame[y][x].rgba();
        if (distinctPixels.has(rgba)) {
          distinctPixels.get(rgba)?.push({ x, y });
        } else {
          distinctPixels.set(rgba, [{ x, y }]);
        }
      }
    }
  }
  debug(`input image has ${distinctPixels.size} distinct colors`);
  return distinctPixels;
}

function numBlankLinesLeft(pixels: Pixel[][]): number {
  let x = 0;
  for (; x < pixels[0].length; x++) {
    let hasData = false;
    for (let y = 0; y < pixels.length; y++) {
      if (pixels[y][x].opacity() !== 0) {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      break;
    }
  }
  return x;
}

function numBlankLinesRight(pixels: Pixel[][]): number {
  let x = pixels[0].length - 1;
  for (; x >= 0; x--) {
    let hasData = false;
    for (let y = 0; y < pixels.length; y++) {
      if (pixels[y][x].opacity() || 0 !== 0) {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      break;
    }
  }
  return pixels[0].length - 1 - x;
}

function numBlankLinesTop(pixels: Pixel[][]): number {
  let y = 0;
  for (; y < pixels.length; y++) {
    let hasData = false;
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x].opacity() !== 0) {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      break;
    }
  }
  return y;
}

function numBlankLinesBottom(pixels: Pixel[][]): number {
  let y = pixels.length - 1;
  for (; y >= 0; y--) {
    let hasData = false;
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x].opacity() !== 0) {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      break;
    }
  }
  return pixels.length - 1 - y;
}

type Coordinate = {
  x: number,
  y: number,
}