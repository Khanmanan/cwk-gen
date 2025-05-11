const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer, cropToCircle, wrapText } = require('../utils');

/**
 * Generate a welcome image for Discord
 * @param {object} options
 * @param {string} options.username - User's username
 * @param {string} options.avatarURL - URL to user's avatar
 * @param {string|Buffer|object} [options.background] - Background config (URL/Buffer or {image, color, blur, overlay})
 * @param {string} [options.title="WELCOME"] - Title text
 * @param {string} [options.message="Welcome to the server!"] - Welcome message
 * @param {string} [options.color="#7289DA"] - Fallback color if background fails
 * @param {string} [options.textColor="#FFFFFF"] - Text color
 * @param {number} [options.width=1200] - Image width (updated for modern Discord)
 * @param {number} [options.height=400] - Image height
 * @param {number} [options.avatarSize=200] - Avatar size
 * @param {string} [options.font="sans-serif"] - Font family
 * @param {boolean} [options.shadow=true] - Whether to add text shadow
 * @param {string} [options.avatarBorderColor="#FFFFFF"] - Avatar border color
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
        width = 1200,
        height = 400,
        avatarSize = 200,
        font = "sans-serif",
        shadow = true,
        avatarBorderColor = "#FFFFFF"
    } = options;

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background handling (supports both simple and advanced config)
    const bgConfig = typeof background === 'object' && !Buffer.isBuffer(background) 
        ? background 
        : { image: background };

    try {
        if (bgConfig?.image) {
            const bgBuffer = await loadImageBuffer(bgConfig.image);
            const bgImage = await loadImage(bgBuffer);
            
            // Apply background effects
            ctx.save();
            
            // Optional blur (default: 0)
            if (bgConfig.blur) {
                ctx.filter = `blur(${bgConfig.blur}px)`;
            }
            
            // Draw background image
            ctx.globalAlpha = bgConfig.opacity || 0.85;
            ctx.drawImage(bgImage, 0, 0, width, height);
            ctx.restore();
            
            // Overlay (default: dark semi-transparent)
            ctx.fillStyle = bgConfig.overlay || 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, width, height);
        } else {
            // Solid color fallback
            ctx.fillStyle = bgConfig.color || color;
            ctx.fillRect(0, 0, width, height);
        }
    } catch (err) {
        console.error('Background error:', err);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }

    // Draw avatar with improved border
    try {
        const avatarBuffer = await loadImageBuffer(avatarURL);
        const circularAvatar = await cropToCircle(avatarBuffer, avatarSize);
        const avatarImage = await loadImage(circularAvatar);
        
        const avatarX = (width - avatarSize) / 2;
        const avatarY = 80; // Fixed position from top
        
        // Border with configurable color
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 8, 0, Math.PI * 2);
        ctx.fillStyle = avatarBorderColor;
        ctx.fill();
        
        // Inner shadow effect
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
    } catch (err) {
        throw new Error(`Avatar processing failed: ${err.message}`);
    }

    // Text rendering with improved layout
    const centerX = width / 2;
    
    // Draw title
    ctx.font = `bold 42px ${font}`;
    ctx.fillStyle = textColor;
    if (shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
    }
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, centerX - titleWidth/2, height - 120);

    // Draw username
    ctx.font = `bold 36px ${font}`;
    ctx.shadowBlur = shadow ? 6 : 0;
    const usernameWidth = ctx.measureText(username).width;
    ctx.fillText(username, centerX - usernameWidth/2, height - 70);

    // Draw message with improved wrapping
    ctx.font = `28px ${font}`;
    ctx.shadowColor = 'transparent';
    const maxMessageWidth = width * 0.8;
    const wrappedMessage = wrapText(ctx, message, maxMessageWidth);
    const lines = wrappedMessage.split('\n');
    const lineHeight = 34;
    const messageY = height - 180;
    
    lines.forEach((line, i) => {
        const lineWidth = ctx.measureText(line).width;
        ctx.fillText(line, centerX - lineWidth/2, messageY + i * lineHeight);
    });

    return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeImage };
