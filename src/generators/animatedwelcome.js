const { createCanvas, loadImage, registerFont } = require('@napi-rs/canvas');
const GIFEncoder = require('gif-encoder-2');
const fetch = require('node-fetch');
const path = require('path');
const sharp = require('sharp');

// Optional: Use a custom font if needed
// registerFont(path.join(__dirname, 'fonts', 'YourFont.ttf'), { family: 'YourFont' });

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  return await res.buffer();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let word of words) {
    const testLine = line + word + ' ';
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line.length > 0) {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

async function generateAnimatedWelcome(user, guild, messageTemplate, backgroundURL) {
  const width = 700;
  const height = 250;
  const encoder = new GIFEncoder(width, height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(80);
  encoder.setQuality(10);

  try {
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
    const welcomeMsg = messageTemplate
      .replace('{user}', user.username)
      .replace('{server}', guild.name);

    const [avatarBuffer, backgroundBuffer] = await Promise.all([
      fetchImageBuffer(avatarURL),
      fetchImageBuffer(backgroundURL || 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGpvcXFuZDA0ZHJzbzhhbXc2djI5a2drMXByZnY5YWMzNWQ0MzR5OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1jRItUChOutcU0MDsc/giphy.gif'),
    ]);

    const gifData = await sharp(backgroundBuffer, { animated: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { pages, width: frameW, height: frameH, channels } = gifData.info;
    const frameHeight = gifData.info.pageHeight || frameH / pages;
    const frameSize = frameW * frameHeight * channels;

    if (!gifData.data || gifData.data.length < frameSize) {
      throw new Error('GIF buffer too small or corrupted.');
    }

    const avatarImage = await loadImage(avatarBuffer);

    for (let i = 0; i < Math.min(pages, 60); i++) {
      const start = i * frameSize;
      const end = start + frameSize;
      const frameBuffer = gifData.data.slice(start, end);

      const resizedFrame = await sharp(frameBuffer, {
        raw: { width: frameW, height: frameHeight, channels },
      })
        .resize(width, height)
        .png()
        .toBuffer();

      const frameImage = await loadImage(resizedFrame);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frameImage, 0, 0, width, height);

      // Draw circular avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(100, height / 2, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImage, 50, height / 2 - 50, 100, 100);
      ctx.restore();

      // Draw texts
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(user.username, 200, 100);

      ctx.font = '20px Arial';
      const lines = wrapText(ctx, welcomeMsg, width - 220);
      lines.forEach((line, index) => {
        ctx.fillText(line, 200, 150 + index * 24);
      });

      encoder.addFrame(ctx);
    }

    encoder.finish();
    const buffer = encoder.out.getData();

    if (!buffer || buffer.length < 100) {
      throw new Error('Generated welcome GIF is too small or empty.');
    }

    return buffer;
  } catch (err) {
    console.error('Error generating animated welcome:', err);
    throw new Error('Failed to generate animated welcome image.');
  }
}

module.exports = { generateAnimatedWelcome };
