const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GIFEncoder = require('gifencoder');
const { loadImageBuffer, cropToCircle } = require('../utils');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Jimp = require('jimp');

// Create a safe temp directory
const TEMP_DIR = path.join(os.tmpdir(), 'cwk-gen');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function generateAnimatedWelcome(options) {
    const {
        frames = 15,
        frameDelay = 100,
        quality = 10,
        width = 1200,
        height = 400,
        avatarSize = 200,
        font = 'Arial',
        textColor = '#FFFFFF'
    } = options;

    // Create unique temp file path
    const tempPath = path.join(TEMP_DIR, `welcome_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.gif`);
    let tempFileCreated = false;

    try {
        // Initialize GIF encoder
        const encoder = new GIFEncoder(width, height);
        const outputStream = fs.createWriteStream(tempPath);
        tempFileCreated = true;

        encoder.createReadStream().pipe(outputStream);
        encoder.start();
        encoder.setRepeat(0);
        encoder.setDelay(frameDelay);
        encoder.setQuality(quality);

        // Load assets in parallel
        const [avatarImage, bgFrames] = await Promise.all([
            loadImageBuffer(options.avatarURL)
                .then(buf => cropToCircle(buf, avatarSize))
                .then(buf => loadImage(buf)),
            loadGifFrames(options.background)
        ]);

        // Render frames
        for (let i = 0; i < frames; i++) {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Background frame
            const bgFrame = await loadImage(bgFrames[i % bgFrames.length]);
            ctx.drawImage(bgFrame, 0, 0, width, height);

            // Dark overlay for readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, width, height);

            // Avatar (centered)
            const avatarX = (width - avatarSize) / 2;
            ctx.drawImage(avatarImage, avatarX, 50, avatarSize, avatarSize);

            // Text rendering with shadow
            ctx.font = `bold 42px ${font}`;
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 8;
            
            // Title
            ctx.fillText(options.title || 'WELCOME', width / 2, height - 120);
            
            // Username
            ctx.font = `bold 36px ${font}`;
            ctx.fillText(options.username, width / 2, height - 70);

            encoder.addFrame(ctx);
        }

        // Finalize GIF
        encoder.finish();
        
        // Wait for file to finish writing
        await new Promise((resolve, reject) => {
            outputStream.on('finish', resolve);
            outputStream.on('error', reject);
        });

        // Verify file was created
        if (!fs.existsSync(tempPath)) {
            throw new Error('GIF file was not created');
        }

        // Read and return buffer
        return fs.readFileSync(tempPath);

    } catch (error) {
        console.error('Error generating welcome GIF:', {
            error: error.message,
            tempPath,
            options: {
                width,
                height,
                frames
            }
        });
        throw error;
    } finally {
        // Cleanup temp file
        if (tempFileCreated && fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.error('Failed to cleanup temp file:', cleanupError.message);
            }
        }
    }
}

async function loadGifFrames(source) {
    try {
        if (!source) throw new Error('No background source provided');
        
        if (typeof source === 'string') {
            // Handle local files
            if (!fs.existsSync(source)) {
                throw new Error(`File not found: ${source}`);
            }

            // Handle GIFs
            if (source.endsWith('.gif')) {
                const gif = await Jimp.read(source);
                return [gif.bitmap];
            }

            // Handle static images
            return [await loadImageBuffer(source)];
        }

        // Handle Buffer input
        if (Buffer.isBuffer(source)) {
            return [await Jimp.read(source)];
        }

        throw new Error('Invalid background source type');
    } catch (error) {
        console.error('Error loading background frames:', error.message);
        throw new Error(`Background loading failed: ${error.message}`);
    }
}

module.exports = { 
    generateAnimatedWelcome,
    _tempDir: TEMP_DIR // Expose for testing/cleanup
};
