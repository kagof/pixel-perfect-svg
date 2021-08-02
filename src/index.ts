#!/usr/bin/env node

import ora from 'ora';
import { loadPixels } from './imageLoader';
import { toSvgString } from './imageProcessor';
import yargs, { Options } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fromBuffer } from 'file-type';
import fs from 'fs';
import { promisify } from 'util';
import untildify from 'untildify';
import { ReadStream } from 'tty';

pixelPerfectSvg();

async function pixelPerfectSvg() {
  const startTime = process.hrtime();
  let args: Args;
  try {
   args = yargs(hideBin(process.argv))
   .usage('$0 [ -i <input> | -o <output> | -F <frame> | -qVpmT | -l <amount> | -r <amount> | -t  <amount> | -b  <amount> | -w  <amount> | -h  <amount>]')
   .options({
     'input': { type: 'string', alias: 'i', description: 'input PNG, JPEG, or GIF file', normalize: true } as Options,
     'output': { type: 'string', alias: 'o', description: 'output SVG file', normalize: true } as Options,
     'frame': { type: 'number', alias: 'F', description: 'frame of the input image to use', default: 0 } as Options,
     'quiet': { type: 'boolean', boolean: true, alias: 'q', description: 'turn off logging' } as Options,
     'verbose': { type: 'boolean', boolean: true, alias: 'V', description: 'turn on verbose logging' } as Options,
     'pretty': { type: 'boolean', boolean: true, alias: 'p', description: 'nicely format the output SVG' } as Options,
     'no-metadata': { type: 'boolean', boolean: true, alias: 'm', description: 'do not add metadata tag' } as Options,
     'trim': { type: 'boolean', boolean: true, alias: 'T', description: 'trim blank space on output' } as Options,
     'max-left-trim': { type: 'number', alias: 'l', description: 'maximum amount to trim on the left' } as Options,
     'max-right-trim': { type: 'number', alias: 'r', description: 'maximum amount to trim on the right' } as Options,
     'max-top-trim': { type: 'number', alias: 't', description: 'maximum amount to trim on the top' } as Options,
     'max-bottom-trim': { type: 'number', alias: 'b', description: 'maximum amount to trim on the bottom' } as Options,
     'min-width': { type: 'number', alias: 'w', description: 'minimum width of the image after trimming' } as Options,
     'min-height': { type: 'number', alias: 'h', description: 'minimum width of the image after trimming' } as Options,
    })
    .alias('version', 'v')
    .conflicts('verbose', 'quiet')
    .example('$0 -i in.png -o out.svg', 'input from arg, output to file')
    .example('$0 -o out.svg', 'input from stdin, output to file')
    .example('$0 -i in.png -q', 'input from arg, output to stdout (-q/--quiet recommended)')
    .example('$0 -q', 'input from stdin, output to stdout (-q/--quiet recommended)')
    .epilog('takes a PNG, GIF, or JPEG file and outputs a pixel perfect SVG\n'
      + 'pixel-perfect-svg from https://github.com/kagof/pixel-perfect-svg')
    .showHelpOnFail(false, 'run with --help to see usage')
    .strict()
    .argv as Args;
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error(`Error: ${err}`);
    }
    console.error('run with --help to see usage');
    process.exitCode = 1;
    return;
  }

  const spinner = ora({ spinner: { frames: ['…', '‥', '.', '‥'] }, text: 'reading input', isSilent: args.quiet });
  const debug = (!!args.quiet || !args.verbose) ? () => undefined : (str: string) => {spinner.info(str); spinner.start();};
  try {
    spinner.start();
    const buf = await readFile(args.input);

    spinner.start('checking image type');
    const type = await fromBuffer(buf);
    const mimeType = type && type.mime;
    if (mimeType == null || ['image/png', 'image/gif', 'image/jpeg'].indexOf(mimeType) === -1) {
      throw new Error(`unsupported input file type ${mimeType || ''}`);
    }
    debug(`input image type is ${mimeType}`);
    spinner.start('parsing image');
    const pixels = await loadPixels({ input: buf, mimeType: mimeType, debug });
    spinner.start('generating SVG');
    const svg = await toSvgString({
      frame: pixels[args?.frame || 0],
      pretty: args.pretty,
      trimAlpha: args.trim,
      noMetadata: args['no-metadata'],
      maxLeftTrim: args['max-left-trim'],
      maxRightTrim: args['max-right-trim'],
      maxTopTrim: args['max-top-trim'],
      maxBottomTrim: args['max-bottom-trim'],
      minWidth: args['min-width'],
      minHeight: args['min-height'],
      debug: debug,
    });

    if (args.output != null) {
      spinner.start('writing file');
      await promisify(fs.writeFile)(untildify(args.output), svg);
      spinner.stop();
    } else {
      spinner.stop();
      process.stdout.write(svg);
    }
    const endTime = process.hrtime(startTime);
    spinner.succeed(`finished processing in ${endTime[0]}.${endTime[1].toString().substring(0, 3).padStart(3, '0')}s`);
  } catch (err) {
    spinner.stop();
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error(`Error: ${err}`);
    }
    spinner.fail('run with --help to see usage');
    process.exitCode = 1;
  }
}

type Args = {
  input?: string,
  output?: string,
  frame?: number,
  quiet?: boolean,
  verbose?: boolean,
  pretty?: boolean,
  'no-metadata'?: boolean,
  trim?: boolean,
  'max-left-trim'?: number,
  'max-right-trim'?: number,
  'max-top-trim'?: number,
  'max-bottom-trim'?: number,
  'min-width'?: number,
  'min-height'?: number,
}

async function readFile(fileName?: string): Promise<Buffer> {
  return fileName
    ? promisify(fs.readFile)(untildify(fileName))
    : streamToBuffer(process.stdin);
}

async function streamToBuffer(stream: ReadStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      function onData(chunk: Buffer) {
          chunks.push(chunk);
      }

      function onEnd() {
          unbind();
          resolve(Buffer.concat(chunks));
      }

      function onError(error: Error) {
          unbind();
          reject(error);
      }

      function unbind() {
          stream.removeListener('data', onData);
          stream.removeListener('end', onEnd);
          stream.removeListener('error', onError);
      }

      stream.on('data', onData);
      stream.on('end', onEnd);
      stream.on('error', onError);
  });
}
