import rewire from 'rewire';
import ndarray, { Data, NdArray } from 'ndarray';
import { Pixel } from '../pixel';

const imageLoader = rewire('../../dist/imageLoader');
const convertTo3dPixelArray: (px: NdArray<Data<number>>, debug: (str: string) => void) => Pixel[][][] = imageLoader.__get__('convertTo3dPixelArray');
const createPixel: (i: number, channels: number, width: number, height: number, output: Pixel[][][], data: Data) => void = imageLoader.__get__('createPixel');

const debug = () => undefined;

describe('test pixel array conversion', () => {
    test('empty array', () => {
        const pixels = convertTo3dPixelArray(ndarray([], [0, 0, 1]), debug);
        expect(pixels).toMatchObject([] as Pixel[][][]);
    });
    test('1 channel array 1x1', () => {
        const pixels = convertTo3dPixelArray(ndarray([0], [1, 1, 1]), debug);
        const expected = [[[testPixel(0)]]];
        expect(pixels).toMatchObject(expected);
    });

    test('1 channel array 2x2', () => {
        const pixels = convertTo3dPixelArray(
            ndarray(
                [0, 1, 2, 3],
                [2, 2, 1],
            ), debug);
        const expected = [
            [
                [testPixel(0), testPixel(1)],
                [testPixel(2), testPixel(3)],
            ],
        ];
        expect(pixels).toMatchObject(expected);
    });

    test('4 channel array 2x2', () => {
        const pixels = convertTo3dPixelArray(
            ndarray(
                [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                [2, 2, 4],
            ), debug);
        const expected = [
            [
                [testPixel(0, 1, 2, 3), testPixel(4, 5, 6, 7)],
                [testPixel(8, 9, 10, 11), testPixel(12, 13, 14, 15)],
            ],
        ];
        expect(pixels).toMatchObject(expected);
    });
    test('2 channel array 2x2 2 frames', () => {
        const pixels = convertTo3dPixelArray(
            ndarray(
                [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                [2, 2, 2, 2],
            ), debug);
        const expected = [
            [
                [testPixel(0, 1), testPixel(2, 3)],
                [testPixel(4, 5), testPixel(6, 7)],
            ],
            [
                [testPixel(8, 9), testPixel(10, 11)],
                [testPixel(12, 13), testPixel(14, 15)],
            ],
        ];
        expect(pixels).toMatchObject(expected);
    });
});

describe('pixel creation', () => {
    test('1 channel 1 frame 2x2 bottom left', () => {
        const output: Pixel[][][] = [];
        createPixel(2, 1, 2, 2, output, [0, 0, 1, 0]);
        expect(output[0][1][0]).toMatchObject(testPixel(1));
    });
    test('2 channel 1 frame 2x2 bottom left', () => {
        const output: Pixel[][][] = [];
        createPixel(2 * 2, 2, 2, 2, output, [0, 0, 0, 0, 1, 2, 0, 0]);
        expect(output[0][1][0]).toMatchObject(testPixel(1, 2));
    });
    test('2 channel 2 frame 2x2 bottom left second frame', () => {
        const output: Pixel[][][] = [];
        createPixel(12, 2, 2, 2, output, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0]);
        expect(output[1][1][0]).toMatchObject(testPixel(1, 2));
    });
});

function testPixel(r = 0, g = 0, b = 0, a = 255): {r: number, g: number, b: number, a: number} {
    return {r, g, b, a};
}
