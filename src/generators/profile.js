const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { loadImageBuffer, cropToCircle, wrapText, applyTextShadow, _caches } = require('../utils');

/**
 * Generate a profile card for Discord
 * @param {object} options
 * @param {string} options.username - User's username
 * @param {string} options.avatarURL - URL to user's avatar
 * @param {string} [options.bio=""] - User's bio
 * @param {Array<{name: string, value: string}>} [options.stats=[]] - User stats
 * @param {Array<{name: string, icon: string}>} [options.badges=[]] - User badges (icon is URL/path)
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
        applyTextShadow(ctx, { enabled: shadow });
        
        // Draw username
        ctx.font = `bold 30px ${font}`;
        ctx.fillStyle = textColor;
        ctx.fillText(username, 30 + avatarSize + 20, 60); // Username Y position is 60
        
        // Disable shadow for bio text
        applyTextShadow(ctx, { enabled: false });

        // Draw bio
        const bioY = 100; // Starting Y for bio content
        let bioLineHeight = 25;
        let bioLines = [];
        if (bio && bio.trim() !== "") {
            ctx.font = `18px ${font}`;
            ctx.fillStyle = textColor; 
            const wrappedBio = wrapText(ctx, bio, width - (30 + avatarSize + 20) - 30);
            bioLines = wrappedBio.split('\n');
            
            bioLines.forEach((line, i) => {
                ctx.fillText(line, 30 + avatarSize + 20, bioY + i * bioLineHeight);
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
            
            applyTextShadow(ctx, { enabled: shadow });

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
            
            applyTextShadow(ctx, { enabled: false });
        }

        // Draw badges
        if (badges && badges.length > 0) {
            applyTextShadow(ctx, { enabled: false }); // Ensure shadow is off for badges section

            const badgeSize = 32; 
            const badgeSpacing = 8;
            const badgesPerRow = 5; 
            const badgeStartX = 30 + avatarSize + 20;
            const badgeNameOffsetY = 10; // Space between badge icon and its name
            const badgeRowSpacing = 15; // Extra vertical spacing between rows of badges (icon + name)

            let currentBioHeight = 0;
            if (bio && bio.trim() !== "") {
                // bioLines and bioLineHeight are already calculated above
                currentBioHeight = bioLines.length * bioLineHeight;
            }
            
            const bioTextEndY = bioY + currentBioHeight;
            let badgeStartYValue = bioTextEndY + (currentBioHeight > 0 ? 15 : 0); 
            if (!bio || bio.trim() === "") { 
                badgeStartYValue = bioY; // Start badges where bio would have started
            }

            for (let i = 0; i < badges.length; i++) {
                const badge = badges[i];
                const row = Math.floor(i / badgesPerRow);
                const col = i % badgesPerRow;
                
                // Calculate Y position for the current badge icon
                // Each row includes badge icon height + badge name offset + badge row spacing
                const badgeIconY = badgeStartYValue + row * (badgeSize + badgeNameOffsetY + badgeRowSpacing);
                const badgeX = badgeStartX + col * (badgeSize + badgeSpacing);

                try {
                    const badgeIconBuffer = await loadImageBuffer(badge.icon);
                    const badgeImage = await loadImage(badgeIconBuffer);
                    ctx.drawImage(badgeImage, badgeX, badgeIconY, badgeSize, badgeSize);
                } catch (err) {
                    console.warn(`Failed to load badge icon for '${badge.name}' from '${badge.icon}'. Drawing placeholder.`);
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
                    ctx.fillRect(badgeX, badgeIconY, badgeSize, badgeSize);
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(badgeX, badgeIconY, badgeSize, badgeSize);
                }

                // Draw badge name
                ctx.font = `10px ${font}`; 
                ctx.fillStyle = textColor;
                const badgeNameWidth = ctx.measureText(badge.name).width;
                ctx.fillText(badge.name, badgeX + (badgeSize - badgeNameWidth) / 2, badgeIconY + badgeSize + badgeNameOffsetY);
            }
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
