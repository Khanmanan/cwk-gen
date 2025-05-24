const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer, cropToCircle, wrapText, applyTextShadow, _caches } = require('../utils'); // Added _caches

/**
 * Generate a welcome image for Discord
 * @param {object} options
 * @param {string} options.username - User's username
 * @param {string} options.avatarURL - URL to user's avatar
 * @param {string|Buffer|object} [options.background] - Background config (URL/Buffer or {image, color, blur, overlayOpacity, overlayColor})
 * @param {string} [options.title="WELCOME"] - Title text
 * @param {string} [options.message="Welcome to the server!"] - Welcome message
 * @param {string} [options.color="#7289DA"] - Fallback color if background fails or not provided
 * @param {string} [options.textColor="#FFFFFF"] - Text color
 * @param {number} [options.width=1200] - Image width
 * @param {number} [options.height=400] - Image height
 * @param {number} [options.avatarSize=200] - Avatar size
 * @param {string} [options.font="sans-serif"] - Font family
 * @param {boolean} [options.shadow=true] - Whether to add text shadow
 * @param {string} [options.avatarBorderColor="#FFFFFF"] - Avatar border color
 * @returns {Promise<Buffer>}
 */
async function generateWelcomeImage(options) {
    // 1. Options validation
    if (!options || typeof options !== 'object') {
        throw new TypeError('Options object is required.');
    }
    if (typeof options.username !== 'string' || options.username.trim() === '') {
        throw new TypeError('Username must be a non-empty string.');
    }
    if (typeof options.avatarURL !== 'string' || options.avatarURL.trim() === '') {
        throw new TypeError('Avatar URL must be a non-empty string.');
    }

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

    // Font registration check
    const genericFontFamilies = ["sans-serif", "serif", "monospace"];
    if (font && !genericFontFamilies.includes(font.toLowerCase()) && !_caches._registeredFontFamilies.has(font)) {
        console.warn(`Warning (generateWelcomeImage for ${username}): Font family '${font}' was specified but not found among registered fonts. The system will attempt to use a fallback font, which may affect visual output.`);
    }

    try { 
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const defaultBgConfig = {
            image: null,
            color: color, 
            blur: 0,
            overlayOpacity: 0.5,
            overlayColor: 'rgba(0, 0, 0, 0.5)' 
        };

        let bgConfig = defaultBgConfig;
        if (typeof background === 'string' || Buffer.isBuffer(background)) {
            bgConfig = { ...defaultBgConfig, image: background };
        } else if (typeof background === 'object' && background !== null) {
            bgConfig = { ...defaultBgConfig, ...background };
        }

        try { 
            if (bgConfig.image) {
                const bgBuffer = await loadImageBuffer(bgConfig.image);
                const bgImage = await loadImage(bgBuffer);
                
                ctx.save();
                if (bgConfig.blur && typeof bgConfig.blur === 'number' && bgConfig.blur > 0) {
                    ctx.filter = `blur(${bgConfig.blur}px)`;
                }
                ctx.drawImage(bgImage, 0, 0, width, height);
                ctx.restore(); 
                
                ctx.fillStyle = bgConfig.overlayColor;
                ctx.globalAlpha = bgConfig.overlayOpacity;
                ctx.fillRect(0, 0, width, height);
                ctx.globalAlpha = 1.0; 
            } else {
                ctx.fillStyle = bgConfig.color;
                ctx.fillRect(0, 0, width, height);
            }
        } catch (err) {
            console.error(`Error processing background for welcome image (user: ${username}), using solid color fallback:`, err);
            ctx.fillStyle = color; 
            ctx.fillRect(0, 0, width, height);
        }
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;

        // Draw avatar
        try {
            const avatarBuffer = await loadImageBuffer(avatarURL);
            const circularAvatar = await cropToCircle(avatarBuffer, avatarSize);
            const avatarImage = await loadImage(circularAvatar);
            
            const avatarX = (width - avatarSize) / 2;
            const avatarY = 80; 
            
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 8, 0, Math.PI * 2); 
            ctx.fillStyle = avatarBorderColor;
            ctx.fill();
            
            ctx.save();
            ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();

        } catch (err) {
            throw new Error(`Failed to load or process avatar for ${username} (welcome image). Reason: ${err.message}`);
        }

        const centerX = width / 2;
        
        // Apply shadow for title
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { 
                enabled: shadow, 
                color: 'rgba(0, 0, 0, 0.7)', 
                blur: 8, 
                offsetX: 0, 
                offsetY: 3 
            });
        } else {
            console.warn("applyTextShadow function not available. Shadow might not be applied for title.");
             if (shadow) { // Manual fallback
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 3;
            }
        }
        

        // Draw title
        ctx.font = `bold 42px ${font}`;
        ctx.fillStyle = textColor;
        const titleText = title.toUpperCase(); 
        const titleWidth = ctx.measureText(titleText).width;
        ctx.fillText(titleText, centerX - titleWidth/2, height - 120);

        // Apply shadow for username
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { 
                enabled: shadow, 
                blur: 6, 
                offsetX: 0, 
                offsetY: 0 
            });
        } else {
            console.warn("applyTextShadow function not available. Shadow might not be applied for username.");
            if (shadow) { // Manual fallback
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'; // Default shadow color
                ctx.shadowBlur = 6;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }
        
        // Draw username
        ctx.font = `bold 36px ${font}`;
        ctx.fillStyle = textColor; 
        const usernameText = username;
        const usernameWidth = ctx.measureText(usernameText).width;
        ctx.fillText(usernameText, centerX - usernameWidth/2, height - 70);

        // Disable shadow for message text
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { enabled: false });
        } else {
            // Manual fallback
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Draw custom message
        ctx.font = `28px ${font}`;
        ctx.fillStyle = textColor; 
        const maxMessageWidth = width * 0.8; 
        const wrappedMessage = wrapText(ctx, message, maxMessageWidth);
        const lines = wrappedMessage.split('\n');
        const lineHeight = 34; 
        
        const messageBlockHeight = lines.length * lineHeight;
        const messageStartY = height - 120 - messageBlockHeight - 20; 

        lines.forEach((line, i) => {
            const lineWidth = ctx.measureText(line).width;
            ctx.fillText(line, centerX - lineWidth/2, messageStartY + i * lineHeight);
        });

        return canvas.toBuffer('image/png');

    } catch (error) { 
        console.error(`Failed to generate welcome image for ${username}:`, error);
        if (error.message.includes(`Failed to load or process avatar for ${username} (welcome image)`)) {
            throw error;
        }
        throw new Error(`Failed to generate welcome image for ${username}. Reason: ${error.message}`);
    }
}

module.exports = { generateWelcomeImage };
