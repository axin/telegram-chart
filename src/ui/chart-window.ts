import { WidgetState } from '../state/widget-state';
import { getCurrentTheme } from '../init';
import { EventBus } from '../common/event-bus';
import { WidgetEventType } from './widget';
import { drawCharts } from '../common/chart';
import { generateYScaleDivides } from '../common/y-scale';
import { canvasRound, toPhisicalPx, getLocalX } from '../common/utils';
import { DivPool } from '../common/object-pool';

const devicePixelRatio = window.devicePixelRatio || 0;
const labelFont = `${toPhisicalPx(12)}px sans-serif`;
const emptyChartWindowMessageFont = `${toPhisicalPx(24)}px sans-serif`;
const timeScaleLabelBottomMargin = toPhisicalPx(25);
const chartWindowLineWidth = toPhisicalPx(3);
const gridLineWidth = toPhisicalPx(1);
const tooltipPopoverLeftMargin = 35;

const timeScaleLabelFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric'
});

const tooltipDateFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric'
});


export class ChartWindow {
    private readonly _chartCanvasCtx: CanvasRenderingContext2D;

    private _prevGridLinesPool = new DivPool('grid-line', this._chartContainer);
    private _prevGridLabelsPool = new DivPool('grid-label', this._chartContainer);
    private _gridLinesPool = new DivPool('grid-line', this._chartContainer);
    private _gridLabelsPool = new DivPool('grid-label', this._chartContainer);

    private _prevHoveredUnit!: number;

    constructor(
        chartCanvas: HTMLCanvasElement,
        private readonly _chartContainer: HTMLDivElement,
        private readonly _tooltip: HTMLDivElement,
        private readonly _widgetState: WidgetState,
        private readonly _widgetEventBus: EventBus<WidgetEventType>
    ) {
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerOver = this.onPointerOver.bind(this);
        this.onPointerOut = this.onPointerOut.bind(this);

        this._chartCanvasCtx = chartCanvas.getContext('2d')!;

        this.subscribeEvents();
    }

    drawGrid() {
        const {chartWindowState} = this._widgetState;

        const prevGridLinesCount = chartWindowState.prevYScaleDivides.length;

        this._prevGridLabelsPool.bookObjects(prevGridLinesCount);
        this._prevGridLinesPool.bookObjects(prevGridLinesCount);

        this.drawYScaleGrid(
            this._prevGridLinesPool.objects,
            this._prevGridLabelsPool.objects,
            chartWindowState.prevYScaleDivides,
            1 - chartWindowState.yScaleGridAlpha
        );

        const curGridLinesCount = chartWindowState.currentYScaleDivides.length;

        this._gridLabelsPool.bookObjects(curGridLinesCount);
        this._gridLinesPool.bookObjects(curGridLinesCount);

        this.drawYScaleGrid(
            this._gridLinesPool.objects,
            this._gridLabelsPool.objects,
            chartWindowState.currentYScaleDivides,
            chartWindowState.yScaleGridAlpha
        );
    }

    drawCharts() {
        const {
            charts, unitCount, chartWindowState, width, fadingChart, fadingChartAlpha,
            leftmostDisplayingPointIndex, rightmostDisplayingPointIndex
        } = this._widgetState;

        const {
            height, startPointIndex, endPointIndex
            // yScalePrevLabelColorAnimation, yScaleCurLabelColorAnimation
        } = chartWindowState;

        this._chartCanvasCtx.clearRect(0, 0, width, height);

        drawCharts(
            this._chartCanvasCtx,
            charts,
            startPointIndex,
            endPointIndex,
            fadingChart,
            fadingChartAlpha,
            chartWindowLineWidth,
            chartWindowState.unitToPx,
            chartWindowState.yToPx(chartWindowState.animMaxYVal)
        );

        // let allChartsAreHidden = true;

        // for (let i = 0; i < charts.length; i++) {
        //     const chart = charts[i];

        //     if (chart.visible || chart.fadeAnimation.isRunning) {
        //         allChartsAreHidden = false;
        //         break;
        //     }
        // }

        // if (allChartsAreHidden) {
        //     this._widgetEventBus.fireEvent('hideOverlay');
        //     this.drawEmptyChartWindowMessage();
        // }
    }

    drawTimeScaleLabels() {
        const {
            time, chartWindowState,
            leftmostDisplayingPointIndex, rightmostDisplayingPointIndex
        } = this._widgetState;
        const {
            height, xScaleGridAlphaAnimation
        } = chartWindowState;
        const yCoord = height - timeScaleLabelBottomMargin;

        // this._widgetState.chartWindowState.startTimeScaleFadeAnimation();

        // const normalLabelColor = timeScaleLabelColorAnimation.getNextVal().toString();
        // const fadingLabelColor = timeScaleFadeAnimation.isRunning
        //     ? timeScaleFadeAnimation.getNextVal().toString()
        //     : normalLabelColor;

        // if (!timeScaleFadeAnimation.isRunning) {
        //     if (chartWindowState.removingTimeScaleLabels) {
        //         chartWindowState.timeScaleStepInUnits *= 2;
        //     }

        //     chartWindowState.addingTimeScaleLabels = false;
        //     chartWindowState.removingTimeScaleLabels = false;
        // }

        const {timeScaleStepInUnits} = chartWindowState;

        this._chartCanvasCtx.font = labelFont;
        this._chartCanvasCtx.textAlign = 'center';

        let curTimeEntryIndex = Math.ceil(leftmostDisplayingPointIndex / timeScaleStepInUnits) * timeScaleStepInUnits;

        while (curTimeEntryIndex < rightmostDisplayingPointIndex) {
            const timestamp = time[curTimeEntryIndex];
            const xCoord = chartWindowState.unitToPx(curTimeEntryIndex + 0.5);

            const isFadingLabel = (curTimeEntryIndex / timeScaleStepInUnits) % 2 === 1;

            const labelColor =
                (xScaleGridAlphaAnimation.isRunning && isFadingLabel)
                ? 'red'
                : 'green';

            this._chartCanvasCtx.fillStyle = labelColor;
            this._chartCanvasCtx.fillText(this.formatTimeScaleValue(timestamp), xCoord, yCoord);

            curTimeEntryIndex += timeScaleStepInUnits;
        }
    }

    private drawYScaleGrid(gridDivs: HTMLDivElement[], labelDivs: HTMLDivElement[], divides: number[], alpha: number) {
        const {chartWindowState} = this._widgetState;
        const yToPxCurried = chartWindowState.yToPx(chartWindowState.animMaxYVal);

        for (let i = 0; i < divides.length; i++) {
            const divide = divides[i];
            const yCoord = (yToPxCurried(divide) / devicePixelRatio) << 0;

            if (yCoord < 0) {
                continue;
            }

            const gridDiv = gridDivs[i];
            const labelDiv = labelDivs[i];

            gridDiv.style.visibility = 'visible';
            gridDiv.style.transform = `translateY(${yCoord}px)`;

            labelDiv.style.visibility = 'visible';
            labelDiv.textContent = this.formatYScaleValue(divide);
            labelDiv.style.transform = `translateY(${yCoord - 22}px)`;

            labelDiv.style.opacity = alpha as any;
            gridDiv.style.opacity = alpha as any;
        }
    }

    private drawEmptyChartWindowMessage() {
        const {width, chartWindowState} = this._widgetState;
        const theme = getCurrentTheme();

        this._chartCanvasCtx.clearRect(0, 0, width, chartWindowState.height);
        this._chartCanvasCtx.font = emptyChartWindowMessageFont;
        this._chartCanvasCtx.textAlign = 'center';
        this._chartCanvasCtx.fillStyle = theme.textColor;
        this._chartCanvasCtx.fillText('No data', width / 2, chartWindowState.height / 2);
    }

    private formatYScaleValue(val: number) {
        if (val / 1000000 >= 1) {
            return `${(val / 1000000).toFixed(1)} M`;
        }

        if (val / 1000 >= 1) {
            return `${(val / 1000).toFixed(1)} K`;
        }

        return val.toString();
    }

    private formatTimeScaleValue(timestamp: number) {
        const date = new Date(timestamp);

        return timeScaleLabelFormat.format(date);
    }

    private subscribeEvents() {
        this._chartContainer.addEventListener('mousemove', (e) => {
            this.onPointerMove(e.clientX);
        });

        this._chartContainer.addEventListener('touchmove', (e) => {
            this.onPointerMove( e.changedTouches[0].clientX);
        }, {passive: true});

        this._chartContainer.addEventListener('mouseover', (e) => {
            this.onPointerOver();
            this.onPointerMove(e.clientX);
        });

        this._chartContainer.addEventListener('touchstart', (e) => {

            this.onPointerOver();
            this.onPointerMove(e.changedTouches[0].clientX);
        }, {passive: true});

        this._chartContainer.addEventListener('mouseout', this.onPointerOut, {passive: true});
        this._chartContainer.addEventListener('touchend', this.onPointerOut, {passive: true});
    }

    private onPointerMove(clientX: number) {
        const {width, charts, time, chartWindowState} = this._widgetState;
        const localX = getLocalX(this._chartContainer, clientX);

        if (localX < 0 || localX >= width) {
            return;
        }

        const rawUnit = chartWindowState.pxToUnit(localX);
        const index = rawUnit << 0;
        const unit = index + 0.5;

        if (unit !== this._prevHoveredUnit) {
            const newTooltipPxPosition = (chartWindowState.unitToPx(unit) / devicePixelRatio) << 0;

            this._tooltip.style.transform = `translateX(${newTooltipPxPosition}px)`;
            this._prevHoveredUnit = unit;
        }

        const tooltipDate = this._tooltip.getElementsByClassName('tooltip-date')[0] as HTMLDivElement;
        tooltipDate.innerText = tooltipDateFormat.format(time[index]);

        const yValueContainer = this._tooltip.getElementsByClassName('y-value-container')[0] as HTMLDivElement;
        const yValueLabels = yValueContainer.children;

        const tooltipLine = this._tooltip.getElementsByClassName('tooltip-line')[0] as HTMLDivElement;
        const tooltipPopover = this._tooltip.getElementsByClassName('tooltip-popover')[0] as HTMLDivElement;

        const {right: containerRight, left: containerLeft} = this._chartContainer.getBoundingClientRect();
        const {right: tooltipLineRight} = tooltipLine.getBoundingClientRect();
        const {width: tooltipPopoverWidth} = tooltipPopover.getBoundingClientRect();

        const distanceToRightBoundary = containerRight - tooltipLineRight;
        const distanceToLeftBoundary = tooltipLineRight - containerLeft;

        let translate = -tooltipPopoverLeftMargin;

        if (distanceToRightBoundary < tooltipPopoverWidth) {
            translate = distanceToRightBoundary - tooltipPopoverWidth;
        } else if (distanceToLeftBoundary < tooltipPopoverLeftMargin) {
            translate = -distanceToLeftBoundary;
        }

        tooltipPopover.style.transform = `translateX(${translate}px)`;

        const tooltipDotContainer = this._tooltip.getElementsByClassName('tooltip-dot-container')[0] as HTMLDivElement;
        const dots = tooltipDotContainer.children;

        for (let i = 0; i < charts.length; i++) {
            const chart = charts[i];
            const dot = dots[i] as HTMLDivElement;
            const yValueLabel = yValueLabels[i];

            if (!chart.visible) {
                dot.classList.add('hidden');
                yValueLabel.classList.add('hidden');
            } else {
                dot.classList.remove('hidden');
                yValueLabel.classList.remove('hidden');

                const YVal = chart.yVals[index];
                const dotY = (chartWindowState.yToPx(chartWindowState.animMaxYVal)(YVal) / devicePixelRatio) << 0;

                dot.style.transform = `translateY(${dotY}px)`;

                const chartYValueNumber = yValueLabel.getElementsByClassName('y-value-number')[0] as HTMLSpanElement;
                chartYValueNumber.innerText = this.formatYScaleValue(YVal);

                const chartYValueCaption = yValueLabel.getElementsByClassName('y-value-caption')[0] as HTMLSpanElement;
                chartYValueCaption.innerText = chart.name;
            }
        }
    }

    private onPointerOver() {
        if (this._widgetState.minimapOverlayIsVisible) {
            this._tooltip.classList.remove('hidden');
        }
    }

    private onPointerOut() {
        this._tooltip.classList.add('hidden');
    }
}
