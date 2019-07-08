import { toPhisicalPx } from './utils';

const minStepInPixels = toPhisicalPx(70);
const divisors = [2, 5];

export function generateYScaleDivides(maxYVal: number, height: number, result: number[]) {
    const firstScaleDivide = 0;
    const scaleStep = calculateYScaleStep(height, maxYVal);

    result.length = 0;
    result[0] = firstScaleDivide;

    let currentScaleDivide = firstScaleDivide;

    while (true) {
        currentScaleDivide += scaleStep;

        if (currentScaleDivide <= maxYVal) {
            result.push(currentScaleDivide);
        } else {
            break;
        }
    }
}

function calculateYScaleStep(height: number, maxYVal: number): number {
    const yValPerPixel = maxYVal / height;

    let scaleStep = Math.ceil(minStepInPixels * yValPerPixel);

    while (true) {
        for (const divisor of divisors) {
            if (scaleStep % divisor === 0) {
                return scaleStep;
            }
        }

        scaleStep++;
    }
}
