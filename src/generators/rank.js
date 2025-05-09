const { createCanvas, loadImage } = require('canvas');
const { loadImageBuffer, cropToCircle } = require('../utils');

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
        
        const avatarX = 30;
        const avatarY = (height - avatarSize) / 2;
        
        // Add white border
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    } catch (err) {
        throw new Error(`Failed to load avatar: ${err.message}`);
    }

    // Text settings
    if (shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
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
    ctx.fillText(`${xp} / ${requiredXp} XP`, width - 150, 80);

    // Progress bar background
    const progressBarHeight = 20;
    const progressBarY = height - 50;
    const progressBarWidth = width - (30 + avatarSize + 20) - 30;
    const progressBarX = 30 + avatarSize + 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

    // Progress bar fill
    const progress = Math.min(xp / requiredXp, 1);
    ctx.fillStyle = progressColor;
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);

    // Progress bar outline
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

    // Progress percentage text
    ctx.font = `bold 16px ${font}`;
    ctx.fillStyle = textColor;
    const percentText = `${Math.round(progress * 100)}%`;
    const percentWidth = ctx.measureText(percentText).width;
    ctx.fillText(percentText, progressBarX + progressBarWidth / 2 - percentWidth / 2, progressBarY + progressBarHeight / 2 + 6);

    return canvas.toBuffer('image/png');
}

module.exports = { generateRankCard };
