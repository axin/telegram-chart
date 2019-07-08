import { ChartData } from '../ui/widget';
import { ChartWindowState } from './chart-window-state';
import { MinimapState } from './minimap-state';
import { Chart } from '../common/chart';
import { AnimationManager } from '../common/animation';

const defaultMinimapFrameWidthInPercent = 0.25;
const chartFadeAnimationTime = 300;
export const yScaleAnimationTime = 300;

export class WidgetState {
    private _time!: number[];
    private _viewPortLeftEdgeUnit: number;
    private _viewPortRightEdgeUnit: number;

    readonly chartWindowState: ChartWindowState;
    readonly minimapState: MinimapState;
    readonly charts: Chart[] = [];
    readonly unitCount!: number;
    readonly animationManager = new AnimationManager();
    readonly chartFadingAnimation = this.animationManager.createAnimation(['ChartWindow', 'Minimap'], this, 'fadingChartAlpha');

    minimapOverlayIsVisible = true;
    fadingChart?: Chart;
    fadingChartAlpha = 1;

    viewPortChanged = false;
    widgetResized = false;

    constructor(
        chartData: ChartData,
        chartWindowHeight: number,
        mimimapHeight: number,
        private _width: number
    ) {
        this.chartFadingCompleted = this.chartFadingCompleted.bind(this);
        this.chartFadingCompleted = this.chartFadingCompleted.bind(this);

        const {columns, types, colors} = chartData;

        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const columnName = column[0] as string;
            const columnType = types[columnName];
            const columnData = column.slice(1) as number[];

            if (columnType === 'x') {
                this._time = columnData;
                this.unitCount = columnData.length;
            } else {
                this.charts.push({
                    name: columnName,
                    color: colors[columnName],
                    visible: true,
                    yVals: columnData
                });
            }
        }

        this._viewPortRightEdgeUnit = this.unitCount;
        this._viewPortLeftEdgeUnit = this._viewPortRightEdgeUnit - defaultMinimapFrameWidthInPercent * this.unitCount;

        this.chartWindowState = new ChartWindowState(this, chartWindowHeight);
        this.minimapState = new MinimapState(this, mimimapHeight);
    }

    get time() {
        return this._time;
    }

    get width() {
        return this._width;
    }

    set width(val: number) {
        if (val === this._width) {
            return;
        }

        this._width = val;
        this.widgetResized = true;
    }

    get viewPortLeftEdgeUnit() {
        return this._viewPortLeftEdgeUnit;
    }

    set viewPortLeftEdgeUnit(val: number) {
        if (val === this._viewPortLeftEdgeUnit) {
            return;
        }

        this._viewPortLeftEdgeUnit = val < 0 ? 0 : val;
        this.viewPortChanged = true;
    }

    get viewPortRightEdgeUnit() {
        return this._viewPortRightEdgeUnit;
    }

    set viewPortRightEdgeUnit(val: number) {
        if (val === this._viewPortRightEdgeUnit) {
            return;
        }

        this._viewPortRightEdgeUnit = val > this.unitCount ? this.unitCount : val;
        this.viewPortChanged = true;
    }

    get viewPortWidthInUntits() {
        return this.viewPortRightEdgeUnit - this.viewPortLeftEdgeUnit;
    }

    get leftmostDisplayingPointIndex() {
        const roundedLeftUnit = Math.floor(this.viewPortLeftEdgeUnit);
        const result =
            (roundedLeftUnit + 0.5) > this.viewPortLeftEdgeUnit ? roundedLeftUnit : roundedLeftUnit + 1;

        return result;
    }

    get rightmostDisplayingPointIndex() {
        const roundedRightUnit = Math.floor(this.viewPortRightEdgeUnit);
        const result = 
            (roundedRightUnit + 0.5) > this.viewPortRightEdgeUnit ? roundedRightUnit - 1 : roundedRightUnit;

        return result;
    }

    get pxPerUnit() {
        return this.width / this.viewPortWidthInUntits;
    }

    getMaxYVal(startIndex: number, endIndex: number) {
        let maxYVal = 0;

        for (let i = startIndex; i <= endIndex; i++) {
            for (let j = 0; j < this.charts.length; j++) {
                if (!this.charts[j].visible) {
                    continue;
                }

                const yVals = this.charts[j].yVals;

                if (yVals[i] > maxYVal) {
                    maxYVal = yVals[i];
                }
            }
        }

        return maxYVal;
    }

    resetChangeFlags() {
        this.viewPortChanged = false;
        this.widgetResized = false;
    }

    toggleChart(chart: Chart) {
        chart.visible = !chart.visible;
        this.fadingChart = chart;

        if (chart.visible) {
            this.fadingChartAlpha = 0;
            this.chartFadingAnimation.start(chartFadeAnimationTime, 1, this.chartFadingCompleted);
        } else {
            this.fadingChartAlpha = 1;
            this.chartFadingAnimation.start(chartFadeAnimationTime, 0, this.chartFadingCompleted);
        }

        this.chartWindowState.updateLastMaxYVal();
        this.minimapState.updateLastMaxYVal();
    }

    dxToDu(dx: number) {
        return dx * this.unitCount / this.width;
    }

    private chartFadingCompleted() {
        this.fadingChart = undefined;
    }
}
