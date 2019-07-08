export type GlobalEventType = 'resize';

type EventBusCallback = (data?: any) => void;

export class EventBus<T extends string> {
    private _callbacks: {[P in T]: EventBusCallback[]} = {} as any;

    subscribe(eventType: T, callback: EventBusCallback) {
        if (!Array.isArray(this._callbacks[eventType])) {
            this._callbacks[eventType] = [];
        }

        this._callbacks[eventType].push(callback);
    }

    fireEvent(eventType: T, data?: any) {
        const callbacks = this._callbacks[eventType];

        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i](data);
        }
    }
}

export const globalEventBus = new EventBus<GlobalEventType>();
