const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer, cropToCircle, applyTextShadow, _caches } = require('../utils'); // Added _caches

/**
 * Generate a rank card for Discord
 * @param {object} options
 * @param {string} options.username - User's username
 * @param {string} options.avatarURL - URL to user's avatar
 * @param {number} options.level - User's level
 * @param {number} options.xp - Current XP
 * @param {number} options.requiredXp - Required XP for next level
 * @param {number} options.rank - User's rank position
 * @param {string|Buffer} [options.background] - Background image URL or Buffer
 * @param {string} [options.color="#7289DA"] - Primary color
 * @param {string} [options.textColor="#FFFFFF"] - Text color
 * @param {string} [options.progressColor="#FFFFFF"] - Progress bar color
 * @param {number} [options.width=800] - Image width
 * @param {number} [options.height=200] - Image height
 * @param {number} [options.avatarSize=100] - Avatar size
 * @param {string} [options.font="sans-serif"] - Font family
 * @param {boolean} [options.shadow=true] - Whether to add text shadow
 * @returns {Promise<Buffer>}
 */
async function generateRankCard(options) {
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
    if (typeof options.level !== 'number' || options.level < 0) {
        throw new TypeError('Level must be a non-negative number.');
    }
    if (typeof options.xp !== 'number' || options.xp < 0) {
        throw new TypeError('XP must be a non-negative number.');
    }
    if (typeof options.requiredXp !== 'number' || options.requiredXp <= 0) {
        throw new TypeError('Required XP must be a positive number.');
    }
    if (typeof options.rank !== 'number' || options.rank < 0) { 
        throw new TypeError('Rank must be a non-negative number.');
    }

    const {
        username,
        avatarURL,
        level,
        xp,
        requiredXp,
        rank,
        background,
        color = "#7289DA",
        textColor = "#FFFFFF",
        progressColor = "#FFFFFF",
        width = 800,
        height = 200,
        avatarSize = 100,
        font = "sans-serif",
        shadow = true 
    } = options;

    // Font registration check
    const genericFontFamilies = ["sans-serif", "serif", "monospace"];
    if (font && !genericFontFamilies.includes(font.toLowerCase()) && !_caches._registeredFontFamilies.has(font)) {
        console.warn(`Warning (generateRankCard for ${username}): Font family '${font}' was specified but not found among registered fonts. The system will attempt to use a fallback font, which may affect visual output.`);
    }

    try { 
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Draw background
        if (background) {
            try {
                const bgBuffer = await loadImageBuffer(background);
                const bgImage = await loadImage(bgBuffer);
                
                ctx.save();
                ctx.globalAlpha = 0.7; 
                ctx.drawImage(bgImage, 0, 0, width, height);
                ctx.restore(); 
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, width, height);
            } catch (err) {
                console.error(`Error loading background for rank card (user: ${username}), using solid color instead:`, err);
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
            
            const avatarX = 30;
            const avatarY = (height - avatarSize) / 2;
            
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF'; 
            ctx.fill();
            
            ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        } catch (err) {
            throw new Error(`Failed to load or process avatar for ${username} (rank card). Reason: ${err.message}`);
        }

        // Apply text shadow settings
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { enabled: shadow });
        } else {
            console.warn("applyTextShadow function not available. Shadow might not be applied for rank card text.");
             if (shadow) { // Manual fallback
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
        }

        // Draw username
        ctx.font = `bold 25px ${font}`;
        ctx.fillStyle = textColor;
        ctx.fillText(username, 30 + avatarSize + 20, 50);

        // Draw rank
        ctx.font = `20px ${font}`;
        ctx.fillText(`#${rank}`, 30 + avatarSize + 20, 80);
        
        // Draw level
        ctx.font = `bold 20px ${font}`;
        ctx.fillText(`Level: ${level}`, width - 150, 50);

        // Draw XP
        ctx.font = `20px ${font}`;
        ctx.fillText(`${xp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`, width - 150, 80);

        // Progress bar
        const progressBarHeight = 20;
        const progressBarY = height - 50;
        const progressBarWidth = width - (30 + avatarSize + 20) - 30; 
        const progressBarX = 30 + avatarSize + 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        const currentProgress = Math.min(xp / requiredXp, 1); 
        ctx.fillStyle = progressColor;
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * currentProgress, progressBarHeight);

        ctx.strokeStyle = textColor; 
        ctx.lineWidth = 2;
        ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
        
        // Disable shadow for progress percentage text.
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { enabled: false });
        } else {
            // Manual fallback
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        ctx.font = `bold 16px ${font}`;
        ctx.fillStyle = textColor; 
        const percentText = `${Math.round(currentProgress * 100)}%`;
        const percentTextMetrics = ctx.measureText(percentText);
        const percentTextX = progressBarX + (progressBarWidth / 2) - (percentTextMetrics.width / 2);
        const percentTextY = progressBarY + (progressBarHeight / 2) + 6; 

        ctx.fillText(percentText, percentTextX, percentTextY);

        return canvas.toBuffer('image/png');

    } catch (error) { 
        console.error(`Failed to generate rank card for ${username}:`, error);
        if (error.message.includes(`Failed to load or process avatar for ${username} (rank card)`)) {
            throw error;
        }
        throw new Error(`Failed to generate rank card for ${username}. Reason: ${error.message}`);
    }
}

module.exports = { generateRankCard };
