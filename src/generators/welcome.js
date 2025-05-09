const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer, cropToCircle, wrapText } = require('../utils');

/**
 * Generate a welcome image for Discord
 * @param {object} options
 * @param {string} options.username - User's username
 * @param {string} options.avatarURL - URL to user's avatar
 * @param {string|Buffer} [options.background] - Background image URL or Buffer
 * @param {string} [options.title="WELCOME"] - Title text
 * @param {string} [options.message="Welcome to the server!"] - Welcome message
 * @param {string} [options.color="#7289DA"] - Primary color
 * @param {string} [options.textColor="#FFFFFF"] - Text color
 * @param {number} [options.width=800] - Image width
 * @param {number} [options.height=300] - Image height
 * @param {number} [options.avatarSize=150] - Avatar size
 * @param {string} [options.font="sans-serif"] - Font family
 * @param {boolean} [options.shadow=true] - Whether to add text shadow
 * @returns {Promise<Buffer>}
 */
async function generateWelcomeImage(options) {
    const {
        username,
        avatarURL,
        background,
        title = "WELCOME",
        message = "Welcome to the server!",
        color = "#7289DA",
        textColor = "#FFFFFF",
        width = 800,
        height = 300,
        avatarSize = 150,
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
            
            // Apply blur and darken
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.drawImage(bgImage, 0, 0, width, height);
            ctx.restore();
            
            // Dark overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, width, height);
        } catch (err) {
            console.error('Error loading background image, using solid color instead:', err);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }

    // Draw avatar
    try {
        const avatarBuffer = await loadImageBuffer(avatarURL);
        const circularAvatar = await cropToCircle(avatarBuffer, avatarSize);
        const avatarImage = await loadImage(circularAvatar);
        
        const avatarX = (width - avatarSize) / 2;
        const avatarY = (height - avatarSize) / 2 - 20;
        
        // Add white border
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    } catch (err) {
        throw new Error(`Failed to load avatar: ${err.message}`);
    }

    // Draw title
    ctx.font = `bold 40px ${font}`;
    ctx.fillStyle = textColor;
    if (shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    }
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, (width - titleWidth) / 2, 50);

    // Draw username
    ctx.font = `bold 30px ${font}`;
    const usernameWidth = ctx.measureText(username).width;
    ctx.fillText(username, (width - usernameWidth) / 2, height - 60);

    // Draw message
    ctx.font = `25px ${font}`;
    ctx.shadowColor = 'transparent';
    const wrappedMessage = wrapText(ctx, message, width - 100);
    const lines = wrappedMessage.split('\n');
    const lineHeight = 30;
    const messageY = height - 100 - (lines.length - 1) * lineHeight;
    
    lines.forEach((line, i) => {
        const lineWidth = ctx.measureText(line).width;
        ctx.fillText(line, (width - lineWidth) / 2, messageY + i * lineHeight);
    });

    return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeImage };
