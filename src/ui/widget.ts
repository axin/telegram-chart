// @ts-ignore
import * as widgetTemplate from './widget.tpl.html';
// @ts-ignore
import * as buttonTemplate from './button.tpl.html';
import { WidgetState } from '../state/widget-state';
import { Minimap } from './minimap';
import { globalEventBus, EventBus } from '../common/event-bus';
import { ChartWindow } from './chart-window';
import { desiredDistanceBetweenTimeScaleLabels } from '../state/chart-window-state';
import { log2, resizeCanvas } from '../common/utils';
import { TCAnimation } from '../common/animation';

type ColumnType = 'line' | 'x';

export type WidgetPart = 'ChartWindow' | 'Minimap' | 'XScale' | 'YScale' | 'MinimapOverlay';
export type WidgetEventType = 'showOverlay' | 'hideOverlay' | 'fadeOutOverlay';

export interface ChartData {
    columns: (string | number)[][],
    types: {[key: string]: ColumnType},
    names: {[key: string]: string},
    colors: {[key: string]: string}
}

export class ChartWidget {
    private readonly _chartContainer: HTMLDivElement;
    private readonly _chartCanvas: HTMLCanvasElement;

    private readonly _tooltip: HTMLDivElement;

    private readonly _minimapContainer: HTMLDivElement;
    private readonly _minimapChartCanvas: HTMLCanvasElement;
    private readonly _minimapOverlayCanvas: HTMLCanvasElement;

    private readonly _chartWindow: ChartWindow;
    private readonly _minimap: Minimap;

    private readonly _widgetState: WidgetState;

    private readonly _widgetEventBus = new EventBus<WidgetEventType>();
    private readonly _widgetPartsToRedraw = new Set<WidgetPart>();

    constructor(private readonly _widgetContainer: HTMLDivElement, title: string, data: ChartData) {
        this.updateDimensions = this.updateDimensions.bind(this);
        this.draw = this.draw.bind(this);

        this._widgetContainer.className = 'widget-container';
        this._widgetContainer.innerHTML = (widgetTemplate as string).trim();

        const titleElement = this._widgetContainer.getElementsByClassName('widget-title')[0] as HTMLHeadingElement;
        titleElement.innerText = title;

        this._chartContainer = this._widgetContainer.getElementsByClassName('chart-container')[0] as HTMLDivElement;
        this._chartCanvas = this._widgetContainer.getElementsByClassName('chart-canvas')[0] as HTMLCanvasElement;

        this._tooltip = this._widgetContainer.getElementsByClassName('tooltip')[0] as HTMLDivElement;

        this._minimapContainer = this._widgetContainer.getElementsByClassName('minimap-container')[0] as HTMLDivElement;
        this._minimapChartCanvas = this._widgetContainer.getElementsByClassName('minimap-chart-canvas')[0] as HTMLCanvasElement;
        this._minimapOverlayCanvas = this._widgetContainer.getElementsByClassName('minimap-overlay-canvas')[0] as HTMLCanvasElement;

        const {clientHeight, clientWidth} = this._minimapChartCanvas;

        this._widgetState = new WidgetState(data, 10, clientHeight, clientWidth);

        this.updateDimensions();

        let timeScaleStepInUnits = Math.floor(desiredDistanceBetweenTimeScaleLabels / this._widgetState.pxPerUnit);

        if (timeScaleStepInUnits !== 1) {
            timeScaleStepInUnits = Math.pow(2, Math.ceil(log2(timeScaleStepInUnits)));
        }

        this._widgetState.chartWindowState.timeScaleStepInUnits = timeScaleStepInUnits;

        globalEventBus.subscribe('resize', this.updateDimensions);

        this._widgetEventBus.subscribe('showOverlay', () => {
            this._minimapOverlayCanvas.classList.remove('hidden');
            this._minimapOverlayCanvas.classList.remove('transparent');
            this._widgetState.minimapOverlayIsVisible = true;
        });

        this._widgetEventBus.subscribe('hideOverlay', () => {
            this._minimapOverlayCanvas.classList.add('hidden');
            this._widgetState.minimapOverlayIsVisible = false;
        });

        this._widgetEventBus.subscribe('fadeOutOverlay', () => {
            this._minimapOverlayCanvas.classList.add('transparent');
        });

        this._chartWindow = new ChartWindow(
            this._chartCanvas, this._chartContainer, this._tooltip, this._widgetState, this._widgetEventBus
        );
        this._minimap = new Minimap(this._minimapChartCanvas, this._minimapOverlayCanvas, this._widgetState);

        this.addChartSwitchers();
        this.initTooltip();

        this._widgetState.chartWindowState.updateLastMaxYVal(true);
        this._widgetState.minimapState.updateLastMaxYVal(true);
        this._widgetState.chartWindowState.prevViewPortWidthInUntits = this._widgetState.viewPortWidthInUntits;

        requestAnimationFrame(this.draw);
    }

    private draw(timestamp: number) {
        const {
            widgetResized, viewPortChanged,
            charts,
            chartWindowState, minimapState, animationManager
        } = this._widgetState;

        animationManager.onTick(timestamp);

        this._widgetPartsToRedraw.clear();
        this._widgetState.animationManager.addAffectedParts(this._widgetPartsToRedraw);

        if (widgetResized) {
            this._widgetPartsToRedraw.add('ChartWindow');
            this._widgetPartsToRedraw.add('Minimap');
            this._widgetPartsToRedraw.add('MinimapOverlay');
            this._widgetPartsToRedraw.add('XScale');
            this._widgetPartsToRedraw.add('YScale');
        }

        if (viewPortChanged) {
            this._widgetPartsToRedraw.add('ChartWindow');
            this._widgetPartsToRedraw.add('MinimapOverlay');
            this._widgetPartsToRedraw.add('XScale');
        }

        if (this._widgetPartsToRedraw.has('ChartWindow')) {
            this._chartWindow.drawCharts();
        }

        if (this._widgetPartsToRedraw.has('Minimap')) {
            this._minimap.drawCharts();
        }

        if (this._widgetPartsToRedraw.has('XScale')) {
            this._chartWindow.drawTimeScaleLabels();
        }

        if (this._widgetPartsToRedraw.has('YScale')) {
            this._chartWindow.drawGrid();
        }

        if (this._widgetPartsToRedraw.has('MinimapOverlay')) {
            this._minimap.redrawOverlay();
        }

        this._widgetState.resetChangeFlags();

        requestAnimationFrame(this.draw);
    }

    private updateDimensions() {
        const dpr = window.devicePixelRatio || 0;

        this._widgetState.chartWindowState.height = (this._chartContainer.clientHeight * dpr) << 0;
        this._widgetState.width = (this._minimapContainer.clientWidth * dpr) << 0;
        this._widgetState.minimapState.height = (this._minimapContainer.clientHeight * dpr) << 0;

        resizeCanvas(this._chartCanvas, dpr);
        resizeCanvas(this._minimapChartCanvas, dpr);
        resizeCanvas(this._minimapOverlayCanvas, dpr);
    }

    private initTooltip() {
        const {charts} = this._widgetState;
        const tooltipDotContainer = this._tooltip.getElementsByClassName('tooltip-dot-container')[0] as HTMLDivElement;
        const yValueContainer = this._tooltip.getElementsByClassName('y-value-container')[0] as HTMLDivElement;

        for (let i = 0; i < charts.length; i++) {
            const chart = charts[i];

            const dot = document.createElement('div');
            dot.className = 'tooltip-dot';
            dot.style.borderColor = chart.color.toString();

            tooltipDotContainer.appendChild(dot);

            const chartYValueLabel = document.createElement('div');
            chartYValueLabel.style.color = chart.color.toString();

            const chartYValueNumber = document.createElement('div');
            chartYValueNumber.className = 'y-value-number'

            const chartYValueCaption = document.createElement('div');
            chartYValueCaption.className = 'y-value-caption';

            chartYValueLabel.appendChild(chartYValueNumber);
            chartYValueLabel.appendChild(chartYValueCaption);

            yValueContainer.appendChild(chartYValueLabel);
        }
    }

    private addChartSwitchers() {
        const {charts, chartWindowState, minimapState} = this._widgetState;
        const chartSwitcherContainer = this._widgetContainer.getElementsByClassName('chart-switcher-container')[0] as HTMLDivElement;

        const container = document.createElement('div');
        container.innerHTML = buttonTemplate.trim();

        const chartSwitcherTemplate = container.firstChild!;

        for (let i = 0; i < charts.length; i++) {
            const chart = charts[i];
            const chartSwitcher = chartSwitcherTemplate.cloneNode(true) as HTMLAnchorElement;

            const text = chartSwitcher.getElementsByClassName('chart-switcher-text')[0] as HTMLSpanElement;
            text.innerText = chart.name;

            const iconCircle = chartSwitcher.getElementsByClassName('chart-switcher-icon-circle')[0] as HTMLDivElement;
            iconCircle.style.backgroundColor = chart.color.toString();

            chartSwitcher.onclick = () => {
                this._widgetState.toggleChart(chart);

                const lastChartIsHiding = charts.filter((c) => c.visible).length === 0;

                if (lastChartIsHiding) {
                    this._widgetEventBus.fireEvent('fadeOutOverlay');
                } else {

                } if (chart.visible) {
                    if (!this._widgetState.minimapOverlayIsVisible) {
                        this._widgetEventBus.fireEvent('showOverlay');
                    }

                    chartSwitcher.classList.add('active');
                } else {
                    chartSwitcher.classList.remove('active');
                }
            };

            chartSwitcherContainer.appendChild(chartSwitcher);
        }
    }
}
