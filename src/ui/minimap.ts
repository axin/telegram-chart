import { WidgetState } from '../state/widget-state';
import { getLocalX, toPhisicalPx } from '../common/utils';
import { getCurrentTheme } from '../init';
import { drawCharts } from '../common/chart';

type MousePosition = 'InLeftGrip' | 'InRightGrip' | 'InFrame' | 'OutsideFrame';

const minimapGripWidth = toPhisicalPx(15);
const chartShowHideAnimationTime = 300;
const minimapLineWidth = toPhisicalPx(1.5);

export class Minimap {
    private _draggingFrame = false;
    private _draggingLeftGrip = false;
    private _draggingRightGrip = false;

    private _leftGripStartX = 0;
    private _rightGripStartX = 0;

    private _prevX = 0;

    private readonly _chartCanvasCtx: CanvasRenderingContext2D;
    private readonly _overlayCanvasCtx: CanvasRenderingContext2D;

    constructor(
        chartCanvas: HTMLCanvasElement,
        private readonly _overlayCanvas: HTMLCanvasElement,
        private readonly _widgetState: WidgetState
    ) {
        this.onDragStart = this.onDragStart.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.onDragStop = this.onDragStop.bind(this);

        this._chartCanvasCtx = chartCanvas.getContext('2d')!;
        this._overlayCanvasCtx = _overlayCanvas.getContext('2d')!;

        this.subscribeEvents();
    }

    get dragging() {
        return this._draggingFrame || this._draggingLeftGrip || this._draggingRightGrip;
    }
    
    drawCharts() {
        const {width, unitCount, minimapState, chartWindowState, fadingChart, fadingChartAlpha} = this._widgetState;

        this._chartCanvasCtx.clearRect(0, 0, width, chartWindowState.height);

        drawCharts(
            this._chartCanvasCtx,
            this._widgetState.charts,
            0,
            unitCount - 1,
            fadingChart,
            fadingChartAlpha,
            minimapLineWidth,
            minimapState.unitToPx,
            minimapState.yToPx(minimapState.lastMaxYVal)
        );
    }
    
    redrawOverlay() {
        const ctx = this._overlayCanvasCtx;
        const viewPortLeftEdge = this._widgetState.minimapState.unitToPx(this._widgetState.viewPortLeftEdgeUnit);
        const viewPortRightEdge = this._widgetState.minimapState.unitToPx(this._widgetState.viewPortRightEdgeUnit);
        const leftGripLineStartX = viewPortLeftEdge + minimapGripWidth / 2;
        const rightGripLineStartX = viewPortRightEdge - minimapGripWidth / 2;
        const {width, minimapState} = this._widgetState;
        const {height} = minimapState;
        const theme = getCurrentTheme();

        ctx.clearRect(0, 0, width, height);
    
        ctx.fillStyle = theme.minimapOverlayColor;
        ctx.fillRect(0, 0, viewPortLeftEdge, height);
        ctx.fillRect(viewPortRightEdge, 0, width - viewPortRightEdge, height);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.mimimapFrameColor;
        ctx.beginPath();
    
        ctx.moveTo(viewPortLeftEdge, 1);
        ctx.lineTo(viewPortRightEdge, 1);
    
        ctx.moveTo(viewPortLeftEdge, height - 1);
        ctx.lineTo(viewPortRightEdge, height - 1);
    
        ctx.stroke();
    
        ctx.lineWidth = minimapGripWidth;
        ctx.beginPath();
    
        this._leftGripStartX = viewPortLeftEdge;
    
        ctx.moveTo(leftGripLineStartX, 2);
        ctx.lineTo(leftGripLineStartX, height - 2);
    
        this._rightGripStartX = viewPortRightEdge - minimapGripWidth;

        ctx.moveTo(rightGripLineStartX, 2);
        ctx.lineTo(rightGripLineStartX, height - 2);
    
        ctx.stroke();
    }

    private subscribeEvents() {
        this._overlayCanvas.addEventListener('mousedown', (e) => {
            this.onDragStart(e.clientX, e);
        });

        this._overlayCanvas.addEventListener('touchstart', (e) => {
            this.onDragStart(e.changedTouches[0].clientX, e);
        });

        this._overlayCanvas.addEventListener('touchend', this.onDragStop);
        window.addEventListener('mouseup', this.onDragStop);

        window.addEventListener('mousemove', (e) => {
            this.onDrag(e.clientX, e);
        });

        this._overlayCanvas.addEventListener('touchmove', (e) => {
            this.onDrag(e.changedTouches[0].clientX, e);
        });
    }

    private onDragStart(clientX: number, event: Event) {
        const mousePosition = this.checkPointerPosition(clientX);
        const localX = getLocalX(this._overlayCanvas, clientX);

        this._prevX = localX;

        if (mousePosition === 'InFrame') {
            this._draggingFrame = true;
            this._overlayCanvas.style.cursor = 'move';
        } else if (mousePosition === 'InLeftGrip') {
            this._draggingLeftGrip = true;
            this._overlayCanvas.style.cursor = 'e-resize';
        } else if (mousePosition === 'InRightGrip') {
            this._draggingRightGrip = true;
            this._overlayCanvas.style.cursor = 'w-resize';
        }

        if (this.dragging) {
            if (event.cancelable) {
                event.preventDefault();
            }
        }
    }

    private onDrag(clientX: number, event: Event) {
        if (!this.dragging) {
            const mousePosition = this.checkPointerPosition(clientX);

            if (mousePosition === 'InFrame') {
                this._overlayCanvas.style.cursor = 'move';
            } else if (mousePosition === 'InLeftGrip') {
                this._overlayCanvas.style.cursor = 'w-resize';
            } else if (mousePosition === 'InRightGrip') {
                this._overlayCanvas.style.cursor = 'e-resize';
            } else {
                this._overlayCanvas.style.cursor = 'default';
            }

            return;
        }

        if (event.cancelable) {
            event.preventDefault();
        }

        const {
            minimapState, chartWindowState
        } = this._widgetState;

        const localX = getLocalX(this._overlayCanvas, clientX);
        const dx = this._prevX - localX;

        if (this._draggingFrame) {
            minimapState.moveFrame(dx);
        } else if (this._draggingLeftGrip) {
            minimapState.moveLeftGrip(dx);
        } else if (this._draggingRightGrip) {
            minimapState.moveRightGrip(dx);
        }

        this._prevX = localX;

        chartWindowState.updateLastMaxYVal();
        chartWindowState.viewPortUpdated();
    }

    private onDragStop(event: Event) {
        if (event.cancelable) {
            event.preventDefault();
        }

        this._draggingFrame = false;
        this._draggingLeftGrip = false;
        this._draggingRightGrip = false;
    }

    private checkPointerPosition(clientX: number): MousePosition {
        const localX = getLocalX(this._overlayCanvas, clientX);

        if (localX >= this._leftGripStartX && localX <= this._leftGripStartX + minimapGripWidth) {
            return 'InLeftGrip';
        }

        if (localX >= this._rightGripStartX && localX <= this._rightGripStartX + minimapGripWidth) {
            return 'InRightGrip';
        }

        if (localX > this._leftGripStartX && localX < this._rightGripStartX) {
            return 'InFrame';
        }

        return 'OutsideFrame';
    }
}
