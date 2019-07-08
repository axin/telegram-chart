import { WidgetState, yScaleAnimationTime } from './widget-state';
import { toPhisicalPx } from '../common/utils';

const minimapTopMargin = toPhisicalPx(10);
const minViewPortWidthInPercent = 0.1;

export class MinimapState {
    readonly yScaleAnimation = this._widgetState.animationManager.createAnimation(['Minimap'], this, 'lastMaxYVal');

    lastMaxYVal = 0;

    constructor(
        private _widgetState: WidgetState,
        private _height: number
    ) {
        this.unitToPx = this.unitToPx.bind(this);
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

    updateLastMaxYVal(disableAnimation: boolean = false) {
        const maxYVal = this._widgetState.getMaxYVal(
            0, this._widgetState.unitCount - 1
        );

        if (maxYVal == this.lastMaxYVal) {
            return;
        }

        if (disableAnimation) {
            this.lastMaxYVal = maxYVal;
            return;
        }

        this.yScaleAnimation.start(
            yScaleAnimationTime,
            maxYVal
        );
    }

    moveFrame(dx: number) {
        const du = this._widgetState.dxToDu(dx);
        const {
            viewPortLeftEdgeUnit, viewPortRightEdgeUnit,
            viewPortWidthInUntits, unitCount
        } = this._widgetState;

        const newViewPortLeftEdgeUnit = viewPortLeftEdgeUnit - du;
        const newViewPortRightEdgeUnit = viewPortRightEdgeUnit - du;

        if (newViewPortLeftEdgeUnit < 0) {
            this._widgetState.viewPortLeftEdgeUnit = 0;
            this._widgetState.viewPortRightEdgeUnit = viewPortWidthInUntits;
        } else if (newViewPortRightEdgeUnit > unitCount) {
            this._widgetState.viewPortRightEdgeUnit = unitCount;
            this._widgetState.viewPortLeftEdgeUnit = unitCount - viewPortWidthInUntits;
        } else {
            this._widgetState.viewPortLeftEdgeUnit = newViewPortLeftEdgeUnit;
            this._widgetState.viewPortRightEdgeUnit = newViewPortRightEdgeUnit;
        }
    }

    moveLeftGrip(dx: number) {
        const {viewPortLeftEdgeUnit, viewPortRightEdgeUnit, unitCount} = this._widgetState;
        const du = this._widgetState.dxToDu(dx);

        const newViewPortLeftEdgeUnit = viewPortLeftEdgeUnit - du;
        const newViewPortWidthInPercent = (viewPortRightEdgeUnit - newViewPortLeftEdgeUnit) / unitCount;

        if (newViewPortWidthInPercent < minViewPortWidthInPercent) {
            this._widgetState.viewPortLeftEdgeUnit = viewPortRightEdgeUnit - minViewPortWidthInPercent * unitCount;
            return;
        }

        this._widgetState.viewPortLeftEdgeUnit -= du;
    }

    moveRightGrip(dx: number) {
        const {viewPortLeftEdgeUnit, viewPortRightEdgeUnit, unitCount} = this._widgetState;
        const du = this._widgetState.dxToDu(dx);

        const newViewPortRightEdgeUnit = viewPortRightEdgeUnit - du;
        const newViewPortWidthInPercent = (newViewPortRightEdgeUnit - viewPortLeftEdgeUnit) / unitCount;

        if (newViewPortWidthInPercent < minViewPortWidthInPercent) {
            this._widgetState.viewPortRightEdgeUnit = viewPortLeftEdgeUnit + minViewPortWidthInPercent * unitCount;
            return;
        }

        this._widgetState.viewPortRightEdgeUnit -= du;
    }

    unitToPx(unit: number) {
        return unit / this._widgetState.unitCount * this._widgetState.width;
    }

    yToPx(maxYVal: number) {
        return (yVal: number) => (1 - yVal / maxYVal) * (this.height - minimapTopMargin) + minimapTopMargin;
    }
}
