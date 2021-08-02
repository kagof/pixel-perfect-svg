export type Pixel = {
    r: number,
    g: number,
    b: number,
    a: number,
    rgb(): string,
    rgba(): string,
    opacity(): number
}

export function fromRgba(rgba: string): Pixel {
    return pixel(Number.parseInt(rgba.substring(1, 3), 16),
        Number.parseInt(rgba.substring(3, 5), 16),
        Number.parseInt(rgba.substring(5, 7), 16),
        Number.parseInt(rgba.substring(7, 9), 16));
}

export function pixel(r = 0, g = 0, b = 0, a = 255): Pixel {
    return {
        r,
        g,
        b,
        a,
        rgb,
        rgba,
        opacity,
    };
}

function rgb(this: Pixel) {
    return `#${hexString(this.r, 2)}${hexString(this.g, 2)}${hexString(this.b, 2)}`;
}

function rgba(this: Pixel) {
    return `#${hexString(this.r, 2)}${hexString(this.g, 2)}${hexString(this.b, 2)}${hexString(this.a, 2)}`;
}

function opacity(this: Pixel) {
    return this.a / 255;
}

function hexString(num: number, padding?: number) {
    let hex = num.toString(16);
    if (padding) {
        hex = hex.padStart(padding, '0');
    }
    return hex;
}