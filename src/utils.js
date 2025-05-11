const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
const Jimp = require('jimp');
const axios = require('axios');
const path = require('path');
const createtempFile = require('tmp')
// Cache for loaded fonts
const fontCache = new Map();

/**
 * Load an image from URL or Buffer with enhanced error handling
 * @param {string|Buffer} source
 * @returns {Promise<Buffer>}
 */
async function loadImageBuffer(source) {
    try {
        if (Buffer.isBuffer(source)) {
            // Validate buffer contains image data
            await Jimp.read(source); 
            return source;
        }

        if (typeof source === 'string') {
            if (source.startsWith('http')) {
                const response = await axios.get(source, { 
                    responseType: 'arraybuffer',
                    timeout: 5000
                });
                const buffer = Buffer.from(response.data, 'binary');
                // Validate downloaded image
                await Jimp.read(buffer);
                return buffer;
            }

            // Handle local files
            if (!fs.existsSync(source)) {
                throw new Error(`File not found: ${source}`);
            }
            const image = await Jimp.read(source);
            return image.getBufferAsync(Jimp.MIME_PNG);
        }

        throw new Error('Invalid image source type');
    } catch (error) {
        console.error('Image loading failed:', {
            sourceType: typeof source,
            source: source instanceof Buffer ? 'Buffer' : source,
            error: error.message
        });
        throw new Error(`Failed to load image: ${error.message}`);
    }
}

/**
 * Optimized circle cropping with cache and better masking
 * @param {Buffer} buffer
 * @param {number} size
 * @returns {Promise<Buffer>}
 */
async function cropToCircle(buffer, size) {
    try {
        // Reuse mask for same size (improves performance)
        const maskKey = `circle-mask-${size}`;
        let mask = maskCache.get(maskKey);

        if (!mask) {
            mask = new Jimp(size, size, 0x00000000);
            // Create anti-aliased circle
            const radius = size / 2;
            const center = radius;
            
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
                    const alpha = Math.round(Math.max(0, 255 - (Math.max(0, distance - radius + 0.5) * 255)));
                    mask.setPixelColor(Jimp.rgbaToInt(255, 255, 255, alpha), x, y);
                }
            }
            maskCache.set(maskKey, mask);
        }

        const image = await Jimp.read(buffer);
        return image
            .cover(size, size) // Maintain aspect ratio
            .mask(mask.clone()) // Clone cached mask
            .getBufferAsync(Jimp.MIME_PNG);

    } catch (error) {
        console.error('Circle crop failed:', {
            inputSize: buffer?.length,
            outputSize: size,
            error: error.message
        });
        throw new Error(`Avatar processing failed: ${error.message}`);
    }
}

// Mask cache for circle cropping
const maskCache = new Map();

/**
 * Enhanced font loader with cache
 * @param {string} path
 * @param {object} options
 */
function loadFont(fontPath, options) {
    try {
        const resolvedPath = path.resolve(fontPath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Font file not found: ${resolvedPath}`);
        }

        const cacheKey = `${resolvedPath}-${options.family}-${options.weight || 'normal'}-${options.style || 'normal'}`;
        if (!fontCache.has(cacheKey)) {
            registerFont(resolvedPath, options);
            fontCache.set(cacheKey, true);
        }
    } catch (error) {
        console.error('Font loading error:', {
            path: fontPath,
            error: error.message
        });
        throw error;
    }
}

/**
 * Batch register fonts with validation
 * @param {Array<{path: string, family: string, weight?: string, style?: string}>} fonts
 */
function registerFonts(fonts) {
    if (!Array.isArray(fonts)) {
        throw new Error('Fonts must be an array');
    }

    fonts.forEach(font => {
        try {
            loadFont(font.path, {
                family: font.family,
                weight: font.weight,
                style: font.style
            });
        } catch (error) {
            console.error(`Failed to register font ${font.family}:`, error);
        }
    });
}

/**
 * Improved text wrapping with hyphenation support
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string}
 */
function wrapText(ctx, text, maxWidth) {
    if (!text || typeof text !== 'string') return '';
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width < maxWidth) {
            currentLine = testLine;
        } else {
            // Attempt hyphenation if word is too long
            if (ctx.measureText(word).width > maxWidth) {
                const hyphenated = hyphenateWord(ctx, word, maxWidth);
                lines.push(currentLine);
                currentLine = hyphenated;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
    }
    lines.push(currentLine);
    return lines.join('\n');
}

/**
 * Hyphenate long words that exceed maxWidth
 */
function hyphenateWord(ctx, word, maxWidth) {
    for (let i = word.length - 1; i > 0; i--) {
        const part = word.substring(0, i) + '-';
        if (ctx.measureText(part).width <= maxWidth) {
            return part;
        }
    }
    return word; // Return as-is if can't hyphenate
}
function ensureTempDir() {
    const tempDir = path.join(os.tmpdir(), 'cwk-gen');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
}

// Safe temp file creation
function createTempFile(extension = '') {
    const tempDir = ensureTempDir();
    return path.join(tempDir, `temp_${Date.now()}${extension}`);
}

module.exports = {
    loadImageBuffer,
    cropToCircle,
    loadFont,
    registerFonts,
    wrapText,
    createCanvas,
    loadImage,
    // Export cache for testing/management
    _caches: {
        fontCache,
        maskCache
    }
};