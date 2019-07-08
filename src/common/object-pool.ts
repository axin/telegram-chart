export class ObjectPool<T> {
    objects: T[] = [];

    constructor(private createObject: () => T) {}

    bookObjects(n: number) {
        if (n > this.objects.length) {
            for (let i = 0, diff = ((n - this.objects.length) * 1.5) << 0; i < diff; i++) {
                this.objects.push(this.createObject());
            }
        }
    }
}

export class DivPool extends ObjectPool<HTMLDivElement> {
    constructor (className: string, parent: HTMLElement) {
        super(() => {
            const res = document.createElement('div');

            res.classList.add(className);
            parent.appendChild(res);
    
            return res;
        });
    }

    bookObjects(n: number) {
        super.bookObjects(n);

        for (let i = 0; i < this.objects.length; i++) {
            // this.objects[i].style.visibility = 'hidden';
        }
    }
}
