const crypto = require('crypto');

const words = {
    adjectives: ['bright', 'quiet', 'swift', 'bold', 'calm', 'vivid', 'cool', 'warm', 'fast', 'slow', 'dark', 'light', 'wild', 'tame', 'pure', 'rich'],
    nouns: ['canvas', 'river', 'forest', 'mountain', 'cloud', 'ocean', 'wind', 'star', 'leaf', 'stone', 'fire', 'ice', 'bird', 'wolf', 'moon', 'dream']
};

function generateSlug() {
    const adj1 = words.adjectives[crypto.randomInt(words.adjectives.length)];
    const adj2 = words.adjectives[crypto.randomInt(words.adjectives.length)];
    const noun = words.nouns[crypto.randomInt(words.nouns.length)];
    const random = crypto.randomBytes(2).toString('hex'); // 4 random chars

    return `${adj1}-${adj2}-${noun}-${random}`;
}

module.exports = { generateSlug };
