const { createCanvas, loadImage, registerFont } = require('canvas');
const sharp = require('sharp');
const axios = require('axios');

/**
 * Load an image from URL or Buffer
 * @param {string|Buffer} source
 * @returns {Promise<Buffer>}
 */
async function loadImageBuffer(source) {
    if (Buffer.isBuffer(source)) return source;
    if (typeof source === 'string') {
        if (source.startsWith('http')) {
            const response = await axios.get(source, { responseType: 'arraybuffer' });
            return Buffer.from(response.data, 'binary');
        }
        return sharp(source).toBuffer();
    }
    throw new Error('Invalid image source');
}

/**
 * Crop image to a circle
 * @param {Buffer} buffer
 * @param {number} size
 * @returns {Promise<Buffer>}
 */
async function cropToCircle(buffer, size) {
    const circle = Buffer.from(
        `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`
    );

    return sharp(buffer)
        .resize(size, size)
        .composite([{
            input: circle,
            blend: 'dest-in'
        }])
        .toBuffer();
}

/**
 * Load and register a font
 * @param {string} path
 * @param {object} options
 */
function loadFont(path, options) {
    registerFont(path, options);
}

/**
 * Register multiple fonts
 * @param {Array<{path: string, family: string, weight?: string, style?: string}>} fonts
 */
function registerFonts(fonts) {
    fonts.forEach(font => {
        registerFont(font.path, {
            family: font.family,
            weight: font.weight,
            style: font.style
        });
    });
}

/**
 * Wrap text within a width
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string}
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines.join('\n');
}

module.exports = {
    loadImageBuffer,
    cropToCircle,
    loadFont,
    registerFonts,
    wrapText,
    createCanvas,
    loadImage
};
