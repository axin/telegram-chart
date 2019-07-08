export class RGBA {
    constructor(
        public r: number,
        public g: number,
        public b: number,
        public a: number
    ) {}

    clone(changes?: {r?: number, g?: number, b?: number, a?: number}) {
        let r = (changes && changes.r !== undefined) ? changes.r : this.r;
        let g = (changes && changes.g !== undefined) ? changes.g : this.g;
        let b = (changes && changes.b !== undefined) ? changes.b : this.b;
        let a = (changes && changes.a !== undefined) ? changes.a : this.a;

        return new RGBA(r, g, b, a);
    }

    toString() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }
}

export function hexToRgba(hex: string, a: number = 1): RGBA {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return new RGBA(
        parseInt(result![1], 16),
        parseInt(result![2], 16),
        parseInt(result![3], 16),
        a
    );
}

export function getLocalX(element: HTMLElement, clientX: number): number {
    const {left} = element.getBoundingClientRect();
    const localX = (clientX - left) << 0;

    return toPhisicalPx(localX);
}

export function canvasRound(n: number) {
    return (n << 0) + 0.5;
}

export function log2(n: number) {
    return Math.log(n) / Math.LN2;
}

export function resizeCanvas(canvas: HTMLCanvasElement, dpr: number) {
    const {clientWidth, clientHeight} = canvas;

    const displayWidth = (clientWidth * dpr) << 0;
    const displayHeight = (clientHeight * dpr) << 0;

    if (canvas.width !== displayWidth ||
        canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

export function toPhisicalPx(px: number) {
    return px * (window.devicePixelRatio || 0) << 0;
}

export function copyArray(source: any[], dest: any[]) {
    dest.length = 0;

    for (let i = 0; i < source.length; i++) {
        dest[i] = source[i];
    }
}