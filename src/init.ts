import './styles.css';
import { ChartWidget, ChartData } from './ui/widget';
import { darkTheme, lightTheme } from './themes';
import { globalEventBus } from './common/event-bus';

document.body.ontouchstart = (e) => { e.stopPropagation(); };
document.body.ontouchmove = (e) => { e.stopPropagation(); };

let nightMode = false;

export function getCurrentTheme() {
    if (nightMode) {
        return darkTheme;
    }

    return lightTheme;
}

const xhr = new XMLHttpRequest();

xhr.open('GET', '/chart_data.json', true);
xhr.send();

xhr.onreadystatechange = () => {
    if (xhr.readyState != 4) {
        return;
    }

    const chartData = JSON.parse(xhr.responseText) as any[];
    const container = document.getElementById('container')!;

    for (const d of chartData) {
        container.appendChild(document.createElement('div'));
    }

    for (let i = 0; i < chartData.length; i++) {
        new ChartWidget(container.children[i] as HTMLDivElement, `Chart ${i + 1}`, chartData[i] as ChartData);
    }

    setModeSwithcerText();
}

document.getElementById('mode-switcher')!.addEventListener('click', () => {
    nightMode = !nightMode;

    setModeSwithcerText();
    
    document.documentElement.className = nightMode ? 'dark' : '';
});

throttle('resize', () => {
    globalEventBus.fireEvent('resize');
});

function setModeSwithcerText() {
    const modeSwitcher = document.getElementById('mode-switcher')!;

    if (nightMode) {
        modeSwitcher.innerText = 'Switch to Day Mode';
    } else {
        modeSwitcher.innerText = 'Switch to Night Mode';
    }
}

function throttle(type: string, callback: Function) {
    let running = false;

    const func = () => {
        if (running) {
            return;
        }

        running = true;

        requestAnimationFrame(() => {
            callback();
            running = false;
        });
    };

    window.addEventListener(type, func);
}
