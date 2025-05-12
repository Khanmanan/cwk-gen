const { generateWelcomeImage } = require('./generators/welcome');
const { generateRankCard } = require('./generators/rank');
const { generateProfileCard } = require('./generators/profile');
const { generateServerBanner } = require('./generators/banner');
const { loadFont, registerFonts } = require('./utils');

module.exports = {
    generateWelcomeImage,
    generateRankCard,
    generateProfileCard,
    generateServerBanner,
    loadFont,
    registerFonts
};
