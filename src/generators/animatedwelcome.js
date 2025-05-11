const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GIFEncoder = require('gifencoder');
const { loadImageBuffer } = require('../utils');
const fs = require('fs');

async function generateAnimatedWelcome(options) {
  const {
    frames = 15,         // Number of animation frames
    frameDelay = 100,    // ms between frames
    quality = 10         // 1-30 (lower = better)
  } = options;

  // Setup GIF encoder
  const encoder = new GIFEncoder(options.width, options.height);
  encoder.createReadStream().pipe(fs.createWriteStream('./temp.gif'));
  encoder.start();
  encoder.setRepeat(0);    // 0 = loop forever
  encoder.setDelay(frameDelay);
  encoder.setQuality(quality);

  // Load assets
  const [bgFrames, avatar] = await Promise.all([
    loadGifFrames(options.background), // Implement this function
    loadImageBuffer(options.avatarURL).then(b => cropToCircle(b, options.avatarSize))
  ]);

  // Render each frame
  for (let i = 0; i < frames; i++) {
    const canvas = createCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d');
    
    // Animated background
    ctx.drawImage(
      await loadImage(bgFrames[i % bgFrames.length]),
      0, 0, options.width, options.height
    );

    // Static elements (avatar, text)
    ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
    ctx.fillRect(0, 0, options.width, options.height);
    
    // Draw avatar
    const avatarImg = await loadImage(avatar);
    const avatarX = (options.width - options.avatarSize) / 2;
    ctx.drawImage(avatarImg, avatarX, 50, options.avatarSize, options.avatarSize);

    // Add frame to GIF
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return fs.readFileSync('./temp.gif');
}

// Helper to extract GIF frames
async function loadGifFrames(source) {
  if (typeof source === 'string') {
    return require('gif-frames')({ 
      url: source, 
      frames: 'all' 
    }).then(frames => frames.map(f => f.getImage()));
  }
  return [await loadImageBuffer(source)];
}

module.exports = { generateAnimatedWelcome };