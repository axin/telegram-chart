export interface Theme {
    appBgColor: string;
    textColor: string;
    gridLineColor: string;
    minimapOverlayColor: string;
    mimimapFrameColor: string;
}

export const lightTheme: Theme = {
    appBgColor: 'white',
    textColor: '#96A2AA',
    gridLineColor: '#F2F4F5',
    minimapOverlayColor: 'rgba(232, 244, 249, 0.6)',
    mimimapFrameColor: 'rgba(208, 228, 242, 0.8)'
};

export const darkTheme: Theme = {
    appBgColor: '#242F3E',
    textColor: '#546778',
    gridLineColor: '#293544',
    minimapOverlayColor: 'rgba(0, 0, 0, 0.6)',
    mimimapFrameColor: 'rgba(108, 128, 142, 0.8)'
};
