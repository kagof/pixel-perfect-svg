import rewire from 'rewire';
import { Pixel, pixel } from '../pixel';

const imageProcessor = rewire('../../dist/imageProcessor');
const numBlankLinesLeft: (pixels: Pixel[][]) => number = imageProcessor.__get__('numBlankLinesLeft');
const numBlankLinesRight: (pixels: Pixel[][]) => number = imageProcessor.__get__('numBlankLinesRight');
const numBlankLinesTop: (pixels: Pixel[][]) => number = imageProcessor.__get__('numBlankLinesTop');
const numBlankLinesBottom: (pixels: Pixel[][]) => number = imageProcessor.__get__('numBlankLinesBottom');

describe('test pixel array conversion', () => {
    test('left', () => {
        const num = numBlankLinesLeft([[transparent(), pixel()], [transparent(), pixel()]]);
        expect(num).toBe(1);
    });
    test('right', () => {
        const num = numBlankLinesRight([[pixel(), transparent()], [pixel(), transparent()]]);
        expect(num).toBe(1);
    });
    test('top', () => {
        const num = numBlankLinesTop([[transparent(), transparent()], [pixel(), pixel()]]);
        expect(num).toBe(1);
    });
    test('bottom', () => {
        const num = numBlankLinesBottom([[pixel(), pixel()], [transparent(), transparent()]]);
        expect(num).toBe(1);
    });
});

function transparent(): Pixel {
    return pixel(0, 0, 0, 0);
}