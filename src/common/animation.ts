import { WidgetPart } from '../ui/widget';

export class AnimationManager {
    lastFrameTimestamp = 0;
    private _animations: TCAnimation[] = [];

    addAffectedParts(set: Set<WidgetPart>) {
        for (let i = 0; i < this._animations.length; i++) {
            const animation = this._animations[i];

            if (animation.isRunning) {
                for (let j = 0; j < animation.affectingParts.length; j++) {
                    set.add(animation.affectingParts[j]);
                }
            }
        }
    }

    onTick(timestamp: number) {
        this.lastFrameTimestamp = timestamp;

        for (let i = 0; i < this._animations.length; i++) {
            const animation = this._animations[i];

            if (animation.isRunning) {
                animation.onTick();
            }
        }
    }

    createAnimation(
        affectingParts: WidgetPart[],
        object: {[key: string]: any},
        prop: string
    ) {
        const result = new TCAnimation(this, affectingParts, object, prop);

        this._animations.push(result);

        return result;
    }
}

export class TCAnimation {
    isRunning = false;

    animTimeInMs!: number;

    private _startVal!: number;
    private _targetVal!: number;
    private _startTime!: number;
    private _onComlete: () => void = () => undefined;

    constructor(
        private _animationManager: AnimationManager,
        readonly affectingParts: WidgetPart[],
        private _object: {[key: string]: any},
        private _prop: string
    ) {}

    start(animTimeInMs: number, targetVal: number, onComlete?: () => void) {
        this.animTimeInMs = animTimeInMs;
        this._targetVal = targetVal;

        if (onComlete) {
            this._onComlete = onComlete;
        }

        if (this.isRunning) {
            return;
        }

        this._startVal = this._object[this._prop];
        this._startTime = this._animationManager.lastFrameTimestamp;

        this.isRunning = true;
    }

    changeTarget(targetVal: number) {
        this._targetVal = targetVal;
    }

    onTick() {
        const dt = this._animationManager.lastFrameTimestamp - this._startTime;
        const nextVal = this._startVal + (this._targetVal - this._startVal) / this.animTimeInMs * dt;

        if (nextVal === this._targetVal) {
            this.isRunning = false;
            this._object[this._prop] = this._targetVal;
            this._onComlete();

            return;
        }

        if (this._startVal > this._targetVal && nextVal <= this._targetVal) {
            this.isRunning = false;
            this._object[this._prop] = this._targetVal;
            this._onComlete();

            return;
        } else if (this._startVal < this._targetVal && nextVal >= this._targetVal) {
            this.isRunning = false;
            this._object[this._prop] = this._targetVal;
            this._onComlete();

            return;
        }

        this._object[this._prop] = nextVal;
    }

    cancel() {
        this.isRunning = false;
    }
}
