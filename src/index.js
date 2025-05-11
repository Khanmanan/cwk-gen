const { generateWelcomeImage } = require('./generators/welcome');
const { generateRankCard } = require('./generators/rank');
const { generateProfileCard } = require('./generators/profile');
const { generateServerBanner } = require('./generators/banner');
const { loadFont, registerFonts } = require('./utils');
const { generateAnimatedWelcome } = require('./generators/animatedwelcome');

module.exports = {
    generateWelcomeImage,
    generateAnimatedWelcome, 
    generateRankCard,
    generateProfileCard,
    generateServerBanner,
    loadFont,
    registerFonts
};
