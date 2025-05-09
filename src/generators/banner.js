const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer } = require('../utils');

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
            console.error('Error loading background image, using solid color instead:', err);
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

    // Text settings
    if (shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
    }

    // Draw server name
    ctx.font = `bold 60px ${font}`;
    ctx.fillStyle = textColor;
    const serverNameWidth = ctx.measureText(serverName).width;
    ctx.fillText(serverName, (width - serverNameWidth) / 2, height / 2 - 30);

    // Draw member count
    const membersText = `${memberCount.toLocaleString()} Members`;
    ctx.font = `30px ${font}`;
    const membersWidth = ctx.measureText(membersText).width;
    ctx.fillText(membersText, (width - membersWidth) / 2, height / 2 + 40);

    return canvas.toBuffer('image/png');
}

module.exports = { generateServerBanner };
