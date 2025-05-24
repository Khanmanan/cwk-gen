const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer, applyTextShadow, _caches } = require('../utils'); // Added _caches

/**
 * Generate a server banner for Discord
 * @param {object} options
 * @param {string} options.serverName - Server name
 * @param {number} options.memberCount - Number of members
 * @param {string|Buffer} [options.background] - Background image URL or Buffer
 * @param {string} [options.color="#7289DA"] - Primary color
 * @param {string} [options.textColor="#FFFFFF"] - Text color
 * @param {number} [options.width=800] - Image width
 * @param {number} [options.height=300] - Image height
 * @param {string} [options.font="sans-serif"] - Font family
 * @param {boolean} [options.shadow=true] - Whether to add text shadow
 * @returns {Promise<Buffer>}
 */
async function generateServerBanner(options) {
    // 1. Options validation
    if (!options || typeof options !== 'object') {
        throw new TypeError('Options object is required.');
    }
    if (typeof options.serverName !== 'string' || options.serverName.trim() === '') {
        throw new TypeError('Server name must be a non-empty string.');
    }
    if (typeof options.memberCount !== 'number' || options.memberCount < 0) {
        throw new TypeError('Member count must be a non-negative number.');
    }

    const {
        serverName,
        memberCount,
        background,
        color = "#7289DA",
        textColor = "#FFFFFF",
        width = 800,
        height = 300,
        font = "sans-serif",
        shadow = true 
    } = options;

    // Font registration check
    const genericFontFamilies = ["sans-serif", "serif", "monospace"];
    if (font && !genericFontFamilies.includes(font.toLowerCase()) && !_caches._registeredFontFamilies.has(font)) {
        console.warn(`Warning (generateServerBanner for ${serverName}): Font family '${font}' was specified but not found among registered fonts. The system will attempt to use a fallback font, which may affect visual output.`);
    }

    try { // Outer try-catch for general errors
        // Create canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Draw background
        if (background) {
            try {
                const bgBuffer = await loadImageBuffer(background);
                const bgImage = await loadImage(bgBuffer);
                ctx.drawImage(bgImage, 0, 0, width, height);
            } catch (err) {
                console.error(`Error loading background for server banner (server: ${serverName}), using solid color instead:`, err);
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, width, height);
            }
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, width, height);
        }

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);

        // Apply text shadow settings before drawing text
        // Assuming applyTextShadow is available and working from utils.js
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { 
                enabled: shadow, 
                blur: 10, 
                offsetX: 5, 
                offsetY: 5 
            });
        } else {
            // Fallback or error if applyTextShadow is not loaded correctly
            console.warn("applyTextShadow function not available. Shadow might not be applied.");
             if (shadow) { // Manual fallback if function is missing
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
            }
        }
        

        // Draw server name
        ctx.font = `bold 60px ${font}`;
        ctx.fillStyle = textColor;
        const serverNameWidth = ctx.measureText(serverName).width;
        ctx.fillText(serverName, (width - serverNameWidth) / 2, height / 2 - 30);

        // Draw member count
        const membersText = `${memberCount.toLocaleString()} Members`;
        ctx.font = `30px ${font}`; // Font is set again here
        const membersWidth = ctx.measureText(membersText).width;
        ctx.fillText(membersText, (width - membersWidth) / 2, height / 2 + 40);

        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error(`Failed to generate server banner for ${serverName}:`, error);
        throw new Error(`Failed to generate server banner for ${serverName}. Reason: ${error.message}`);
    }
}

module.exports = { generateServerBanner };
