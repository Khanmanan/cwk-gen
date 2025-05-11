const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GIFEncoder = require('gifencoder');
const { loadImageBuffer, cropToCircle, wrapText } = require('../utils');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

async function generateAnimatedWelcome(options) {
  const {
    frames = 15,
    frameDelay = 100,
    quality = 10,
    width = 1200,
    height = 400,
    avatarSize = 200
  } = options;

  // Create temp file path
  const tempPath = path.join(__dirname, `../../temp/welcome_${Date.now()}.gif`);
  
  try {
    // Setup GIF encoder with proper stream handling
    const encoder = new GIFEncoder(width, height);
    const stream = encoder.createReadStream().pipe(fs.createWriteStream(tempPath));
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(frameDelay);
    encoder.setQuality(quality);

    // Load avatar with proper Jimp handling
    const avatarBuffer = await loadImageBuffer(options.avatarURL);
    const circularAvatar = await cropToCircle(avatarBuffer, avatarSize);
    const avatarImage = await loadImage(circularAvatar);

    // Load background frames
    const bgFrames = await loadGifFrames(options.background);

    // Render frames
    for (let i = 0; i < frames; i++) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background frame
      const bgFrame = await loadImage(bgFrames[i % bgFrames.length]);
      ctx.drawImage(bgFrame, 0, 0, width, height);

      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);

      // Avatar
      const avatarX = (width - avatarSize) / 2;
      ctx.drawImage(avatarImage, avatarX, 50, avatarSize, avatarSize);

      // Text rendering
      ctx.font = `bold 42px ${options.font || 'Arial'}`;
      ctx.fillStyle = options.textColor || '#FFFFFF';
      ctx.textAlign = 'center';
      
      // Title
      ctx.fillText(options.title || 'WELCOME', width / 2, height - 120);
      
      // Username
      ctx.font = `bold 36px ${options.font || 'Arial'}`;
      ctx.fillText(options.username, width / 2, height - 70);

      // Add frame
      encoder.addFrame(ctx);
    }

    encoder.finish();
    
    // Wait for stream to finish
    await new Promise((resolve) => stream.on('finish', resolve));
    
    // Read and cleanup
    const buffer = fs.readFileSync(tempPath);
    fs.unlinkSync(tempPath);
    
    return buffer;

  } catch (error) {
    // Cleanup temp file if exists
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw error;
  }
}

// Improved GIF frame loader
async function loadGifFrames(source) {
  try {
    if (typeof source === 'string') {
      if (source.endsWith('.gif')) {
        const gif = await Jimp.read(source);
        return [gif.bitmap]; // Returns first frame for static fallback
      }
      return [await loadImageBuffer(source)];
    }
    return [await Jimp.read(source)];
  } catch (error) {
    console.error('Error loading frames:', error);
    throw new Error('Failed to load background image');
  }
}

module.exports = { generateAnimatedWelcome };