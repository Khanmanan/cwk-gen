const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer, cropToCircle, wrapText, applyTextShadow, _caches } = require('../utils'); // Added _caches

/**
 * Generate a profile card for Discord
 * @param {object} options
 * @param {string} options.username - User's username
 * @param {string} options.avatarURL - URL to user's avatar
 * @param {string} [options.bio=""] - User's bio
 * @param {Array<{name: string, value: string}>} [options.stats=[]] - User stats
 * @param {Array<{name: string, icon: string}>} [options.badges=[]] - User badges
 * @param {string|Buffer} [options.background] - Background image URL or Buffer
 * @param {string} [options.color="#7289DA"] - Primary color
 * @param {string} [options.textColor="#FFFFFF"] - Text color
 * @param {number} [options.width=600] - Image width
 * @param {number} [options.height=400] - Image height
 * @param {number} [options.avatarSize=150] - Avatar size
 * @param {string} [options.font="sans-serif"] - Font family
 * @param {boolean} [options.shadow=true] - Whether to add text shadow for username and stats
 * @returns {Promise<Buffer>}
 */
async function generateProfileCard(options) {
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
        bio = "",
        stats = [],
        badges = [],
        background,
        color = "#7289DA",
        textColor = "#FFFFFF",
        width = 600,
        height = 400,
        avatarSize = 150,
        font = "sans-serif",
        shadow = true 
    } = options;

    // Font registration check
    const genericFontFamilies = ["sans-serif", "serif", "monospace"];
    if (font && !genericFontFamilies.includes(font.toLowerCase()) && !_caches._registeredFontFamilies.has(font)) {
        console.warn(`Warning (generateProfileCard for ${username}): Font family '${font}' was specified but not found among registered fonts. The system will attempt to use a fallback font, which may affect visual output.`);
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
                console.error(`Error loading background for profile card (user: ${username}), using solid color instead:`, err);
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
            const avatarY = 30;
            
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF'; 
            ctx.fill();
            
            ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        } catch (err) {
            throw new Error(`Failed to load or process avatar for ${username}. Reason: ${err.message}`);
        }

        // Apply shadow for username
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { enabled: shadow });
        } else {
            console.warn("applyTextShadow function not available. Shadow might not be applied for username.");
            if (shadow) { // Manual fallback
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
        }
        
        // Draw username
        ctx.font = `bold 30px ${font}`;
        ctx.fillStyle = textColor;
        ctx.fillText(username, 30 + avatarSize + 20, 60);
        
        // Disable shadow for bio text
        if (typeof applyTextShadow === 'function') {
            applyTextShadow(ctx, { enabled: false });
        } else {
             // Manual fallback
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Draw bio
        if (bio) {
            ctx.font = `18px ${font}`;
            ctx.fillStyle = textColor; 
            const wrappedBio = wrapText(ctx, bio, width - (30 + avatarSize + 20) - 30);
            const lines = wrappedBio.split('\n');
            const lineHeight = 25; 
            const bioY = 100; 
            
            lines.forEach((line, i) => {
                ctx.fillText(line, 30 + avatarSize + 20, bioY + i * lineHeight);
            });
        }

        // Draw stats
        if (stats.length > 0) {
            const statBoxHeight = 80; 
            const statBoxY = height - statBoxHeight - 30; 
            const statBoxWidth = width - 60; 
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
            ctx.roundRect(30, statBoxY, statBoxWidth, statBoxHeight, 10); 
            ctx.fill();
            
            // Apply shadow for stats text
            if (typeof applyTextShadow === 'function') {
                applyTextShadow(ctx, { enabled: shadow });
            } else {
                console.warn("applyTextShadow function not available. Shadow might not be applied for stats.");
                 if (shadow) { // Manual fallback
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 5;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                }
            }

            const statItemWidth = statBoxWidth / stats.length;
            stats.forEach((stat, i) => {
                const statX = 30 + i * statItemWidth;
                
                ctx.font = `bold 16px ${font}`;
                ctx.fillStyle = textColor;
                const nameWidth = ctx.measureText(stat.name).width;
                ctx.fillText(stat.name, statX + (statItemWidth - nameWidth) / 2, statBoxY + 30);
                
                ctx.font = `20px ${font}`; 
                const valueWidth = ctx.measureText(stat.value).width;
                ctx.fillText(stat.value, statX + (statItemWidth - valueWidth) / 2, statBoxY + 60);
            });
            
            if (typeof applyTextShadow === 'function') {
                applyTextShadow(ctx, { enabled: false });
            } else {
                // Manual fallback
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }

        // Draw badges
        if (badges.length > 0) {
            const badgeSize = 40;
            const badgeSpacing = 10;
            const badgesPerRow = 5; 
            const badgeStartX = 30 + avatarSize + 20; 
            let badgeStartY = 150; 
            if (!bio) badgeStartY = 100; 

            badges.forEach(async (badge, i) => {
                const row = Math.floor(i / badgesPerRow);
                const col = i % badgesPerRow;
                
                const badgeX = badgeStartX + col * (badgeSize + badgeSpacing);
                const badgeY = badgeStartY + row * (badgeSize + badgeSpacing);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
                ctx.beginPath();
                ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        return canvas.toBuffer('image/png');

    } catch (error) { 
        console.error(`Failed to generate profile card for ${username}:`, error);
        if (error.message.startsWith('Failed to load or process avatar for')) {
            throw error; 
        }
        throw new Error(`Failed to generate profile card for ${username}. Reason: ${error.message}`);
    }
}

module.exports = { generateProfileCard };
