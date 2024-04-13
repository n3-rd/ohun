export function isLightColor(color: string): boolean {
    // Parse the background color into RGB values
    if (!color.startsWith('#')) {
        throw new Error('Invalid color format. Expected hex color.');
    }
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Calculate the relative luminance of the color
    const luminance = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return (luminance < 0.5);
}

export function getTextColor(backgroundColor: string): string {
    return isLightColor(backgroundColor) ? '#000' : '#fff';
}