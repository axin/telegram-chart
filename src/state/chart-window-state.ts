import { WidgetState, yScaleAnimationTime } from './widget-state';
import { TCAnimation } from '../common/animation';
import { getCurrentTheme } from '../init';
import { hexToRgba, toPhisicalPx, copyArray } from '../common/utils';
import { generateYScaleDivides } from '../common/y-scale';

const chartTopMargin = toPhisicalPx(20);
const chartBottomMargin = toPhisicalPx(45);
const themeChangingAnimationDuration = 500;
const gridChangingAnimationDuration = 500;
const timeScaleAlphaAnimationDuration = 1000;

export const desiredDistanceBetweenTimeScaleLabels = toPhisicalPx(60);
const doubledDdtsl = desiredDistanceBetweenTimeScaleLabels * 2;

export class ChartWindowState {
    readonly yScaleAnimation = this._widgetState.animationManager.createAnimation(
        ['ChartWindow'], this, 'animMaxYVal'
    );

    readonly yScaleGridAlphaAnimation = this._widgetState.animationManager.createAnimation(
        ['YScale'], this, 'yScaleGridAlpha'
    );

    readonly xScaleGridAlphaAnimation = this._widgetState.animationManager.createAnimation(
        ['XScale'], this, 'xScaleGridAlpha'
    );

    prevYScaleDivides: number[] = [];
    currentYScaleDivides: number[] = [];

    animMaxYVal = 0;
    lastMaxYVal = 0;
    prevViewPortWidthInUntits = 0;
    yScaleGridAlpha = 1;
    xScaleGridAlpha = 1;
    timeScaleStepInUnits!: number;

    addingTimeScaleLabels = false;
    removingTimeScaleLabels = false;

    constructor(
        private _widgetState: WidgetState,
        private _height: number
    ) {
        this.unitToPx = this.unitToPx.bind(this);
        this.yToPx = this.yToPx.bind(this);

        this.timeScaleFadeInAnimationCompleted = this.timeScaleFadeInAnimationCompleted.bind(this);
        this.timeScaleFadeOutAnimationCompleted = this.timeScaleFadeOutAnimationCompleted.bind(this);
    }

    get height() {
        return this._height;
    }

    set height(val: number) {
        if (val === this._height) {
            return;
        }

        this._height = val;
        this._widgetState.widgetResized = true;
    }

    get timeScaleStepInPx() {
        return this._widgetState.pxPerUnit * this.timeScaleStepInUnits;
    }

    get startPointIndex() {
        return this._widgetState.leftmostDisplayingPointIndex === 0
            ? this._widgetState.leftmostDisplayingPointIndex
            : this._widgetState.leftmostDisplayingPointIndex - 1;
    }

    get endPointIndex() {
        return this._widgetState.rightmostDisplayingPointIndex === this._widgetState.unitCount - 1
            ? this._widgetState.rightmostDisplayingPointIndex
            : this._widgetState.rightmostDisplayingPointIndex + 1;
    }

    updateLastMaxYVal(disableAnimation: boolean = false) {
        const maxYVal = this._widgetState.getMaxYVal(
            this.startPointIndex,
            this.endPointIndex
        );

        if (maxYVal == this.lastMaxYVal) {
            return;
        }

        this.lastMaxYVal = maxYVal;

        if (disableAnimation) {
            this.animMaxYVal = maxYVal;
        } else {
            this.yScaleAnimation.start(
                yScaleAnimationTime,
                maxYVal
            );
        }

        if (maxYVal !== 0) {
            copyArray(this.currentYScaleDivides, this.prevYScaleDivides);
            generateYScaleDivides(maxYVal, this.height, this.currentYScaleDivides);

            if (disableAnimation) {
                this.yScaleGridAlpha = 1;
            } else {
                this.yScaleGridAlpha = 0;
                this.yScaleGridAlphaAnimation.start(gridChangingAnimationDuration, 1);
            }
        }
    }

    viewPortUpdated() {
        if (this.prevViewPortWidthInUntits === this._widgetState.viewPortWidthInUntits) {
            return;
        }

        if (
            this.removingTimeScaleLabels &&
            this.timeScaleStepInPx < desiredDistanceBetweenTimeScaleLabels
        ) {
            const coeff = (desiredDistanceBetweenTimeScaleLabels - this.timeScaleStepInPx)
                / desiredDistanceBetweenTimeScaleLabels * 2;

            this.xScaleGridAlphaAnimation.animTimeInMs = (1 - coeff) * timeScaleAlphaAnimationDuration;
        } else if (
            this.addingTimeScaleLabels &&
            this.timeScaleStepInPx > desiredDistanceBetweenTimeScaleLabels
        ) {
            const coeff = (doubledDdtsl - this.timeScaleStepInPx) / doubledDdtsl * 2;

            this.xScaleGridAlphaAnimation.animTimeInMs = coeff * timeScaleAlphaAnimationDuration;
        } else if (
            !this.removingTimeScaleLabels &&
            this.timeScaleStepInPx < desiredDistanceBetweenTimeScaleLabels
        ) {
            this.removingTimeScaleLabels = true;

            this.xScaleGridAlpha = 1;
            this.xScaleGridAlphaAnimation.start(
                timeScaleAlphaAnimationDuration, 0,
                this.timeScaleFadeOutAnimationCompleted
            );
        } else if (
            !this.addingTimeScaleLabels && this.timeScaleStepInUnits > 1 &&
            this.timeScaleStepInPx > desiredDistanceBetweenTimeScaleLabels
        ) {
            this.addingTimeScaleLabels = true;
            this.timeScaleStepInUnits /= 2;

            this.xScaleGridAlpha = 0;
            this.xScaleGridAlphaAnimation.start(
                timeScaleAlphaAnimationDuration, 1,
                this.timeScaleFadeInAnimationCompleted
            );
        }
    }

    private timeScaleFadeInAnimationCompleted() {
        this.addingTimeScaleLabels = false;
    }

    private timeScaleFadeOutAnimationCompleted() {
        if (this.removingTimeScaleLabels) {
            this.timeScaleStepInUnits *= 2;
        }

        this.removingTimeScaleLabels = false;
    }

    unitToPx(unit: number) {
        return (unit - this._widgetState.viewPortLeftEdgeUnit) /
            this._widgetState.viewPortWidthInUntits * this._widgetState.width;
    }

    pxToUnit(px: number) {
        const {viewPortWidthInUntits, width, viewPortLeftEdgeUnit} = this._widgetState;

        return px * viewPortWidthInUntits / width + viewPortLeftEdgeUnit;
    }

    yToPx(maxYVal: number) {
        return (yVal: number) => (1 - yVal / maxYVal) *
            (this.height - chartTopMargin - chartBottomMargin) + chartTopMargin;
    }
}
