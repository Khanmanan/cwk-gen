# cwk-gen - Discord Image Generator for Node.js

[![npm version](https://img.shields.io/npm/v/cwk-gen.svg)](https://www.npmjs.com/package/cwk-gen)
[![GitHub license](https://img.shields.io/github/license/Khanmanan/cwk-gen.svg)](https://github.com/Khanmanan/cwk-gen/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Khanmanan/cwk-gen.svg)](https://github.com/Khanmanan/cwk-gen/issues)

A high-quality image generator for Discord bots that creates welcome images, rank cards, profile cards, and server banners with extensive customization options.

## Features

- 🖼️ Generate welcome images with username, avatar, and custom background
- 🏆 Create rank cards with level, XP, and rank position
- 📇 Design profile cards with user bio, stats, and badges
- 🎉 Produce server banners with server name and member count
- 🎨 Customizable fonts, colors, and backgrounds
- ⭕ Automatic avatar cropping to circles
- ✍️ Text wrapping and shadow effects
- 📊 Progress bars for XP tracking

## Installation

```bash
npm install cwk-gen
```
## Quick Start

```javascript
const { generateWelcomeImage } = require('cwk-gen');

async function createWelcome() {
    const buffer = await generateWelcomeImage({
        username: "JohnDoe",
        avatarURL: "https://cdn.discordapp.com/avatars/123456789012345678/a_abcdefghijklmnopqrstuvwxyz123456.png",
        message: "Welcome to our server!",
        color: "#5865F2"
    });
    
    // In Discord.js
    const attachment = new Discord.AttachmentBuilder(buffer, { name: 'welcome.png' });
    channel.send({ files: [attachment] });
}
```

## Documentation

### Welcome Images
```javascript
generateWelcomeImage({
    username: "string",          // Required
    avatarURL: "string",         // Required
    background: "string|Buffer", // Optional
    title: "string",             // Default: "WELCOME"
    message: "string",           // Default: "Welcome to the server!"
    // ...and more options
});
```

### Rank Cards
```javascript
generateRankCard({
    username: "string",          // Required
    avatarURL: "string",         // Required
    level: number,               // Required
    xp: number,                  // Required
    requiredXp: number,          // Required
    rank: number,                // Required
    // ...and more options
});
```

### Profile Cards
```javascript
generateProfileCard({
    username: "string",          // Required
    avatarURL: "string",         // Required
    bio: "string",               // Optional
    stats: Array<{name, value}>, // Optional
    badges: Array<{name, icon}>, // Optional
    // ...and more options
});
```

### Server Banners
```javascript
generateServerBanner({
    serverName: "string",        // Required
    memberCount: number,         // Required
    // ...and more options
});
```

## Examples

### Advanced Rank Card with Custom Font
```javascript
const { generateRankCard, registerFonts } = require('cwk-gen');

registerFonts([
    { path: './fonts/Poppins-Bold.ttf', family: 'Poppins', weight: 'bold' }
]);

generateRankCard({
    username: "JaneDoe",
    avatarURL: avatarURL,
    level: 15,
    xp: 1250,
    requiredXp: 2000,
    rank: 42,
    font: "Poppins",
    progressColor: "#FF9900"
});
```
## Exmaples 
 Example bot

[here is the example bot](https://github.com/Khanmanan/cwk-gen-bot.git)

 Images example
 
[Click here to view the example images](assets/example)

 Make sure to star 🌟 the repo also join our server for project and development ❤️. 
## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

<div align="center"> <a href="https://discord.gg/QukxRRFhzQ"><img src="https://invidget.switchblade.xyz/QukxRRFhzQ"/></a>

<br><br>

Project Link: [https://github.com/Khanmanan/cwk-gen](https://github.com/Khanmanan/cwk-gen)
