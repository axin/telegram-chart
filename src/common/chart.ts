export interface Chart {
    name: string;
    color: string;
    visible: boolean;
    yVals: number[];
}

export function drawCharts(
    ctx: CanvasRenderingContext2D,
    charts: Chart[],
    startPointIndex: number,
    endPointIndex: number,
    fadingChart: Chart | undefined,
    fadingChartAlpha: number,
    lineWidth: number,
    unitToPx: (unit: number) => number,
    yToPx: (yVal: number) => number
) {
    ctx.lineWidth = lineWidth;

    for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        const isFadingChart = chart === fadingChart;

        if (!chart.visible && !isFadingChart) {
            continue;
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        drawChart(
            ctx, chart, startPointIndex, endPointIndex,
            isFadingChart ? fadingChartAlpha : 1,
            unitToPx, yToPx
        );
    }
}

function drawChart(
    ctx: CanvasRenderingContext2D,
    chart: Chart,
    startPointIndex: number,
    endPointIndex: number,
    alpha: number,
    unitToPx: (unit: number) => number,
    yToPx: (yVal: number) => number
) {
    const {yVals, color} = chart;

    ctx.save();

    if (alpha !== 1) {
        ctx.globalAlpha = alpha;
    }

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(unitToPx(startPointIndex + 0.5), yToPx(yVals[startPointIndex]))

    for (let j = startPointIndex + 1; j <= endPointIndex; j++) {
        const x = unitToPx(j + 0.5);
        const y = yToPx(yVals[j]);

        ctx.lineTo(x, y);
    }

    ctx.stroke();

    ctx.restore();
}
