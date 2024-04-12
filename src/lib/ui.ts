export const getTextColor = (backgroundColor: string) => {
    // Remove the leading '#' if it exists
    backgroundColor = backgroundColor.replace('#', '');

    // Convert the background color to RGB values
    const r = parseInt(backgroundColor.substring(0, 2), 16);
    const g = parseInt(backgroundColor.substring(2, 4), 16);
    const b = parseInt(backgroundColor.substring(4, 6), 16);

    // Calculate the perceived brightness of the background color
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Choose the text color based on the brightness of the background
    return brightness > 128 ? '#000000' : '#FFFFFF';
}




