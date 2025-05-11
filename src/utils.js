const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
const Jimp = require('jimp');
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
        // Replace sharp with Jimp
        const image = await Jimp.read(source);
        return image.getBufferAsync(Jimp.MIME_PNG);
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
    // Create circular mask
    const mask = new Jimp(size, size, 0x00000000);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const distance = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2));
            if (distance <= size/2) {
                mask.setPixelColor(0xFFFFFFFF, x, y);
            }
        }
    }

    // Process image with Jimp
    const image = await Jimp.read(buffer);
    return image
        .resize(size, size)
        .mask(mask)
        .getBufferAsync(Jimp.MIME_PNG);
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
