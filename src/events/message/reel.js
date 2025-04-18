const { Events } = require('discord.js');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TEMP_DIRECTORY = path.join(__dirname, 'temp');

function generateFilename() {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    return `${timestamp}-${uuid}.mp4`;
}

function getTemporaryFilePath() {
    const filename = generateFilename();
    return path.join(TEMP_DIRECTORY, filename);
}

function downloadInstagramReel(url, outputPath) {
    return new Promise((resolve, reject) => {
        exec(`yt-dlp -f mp4 "${url}" -o "${outputPath}"`, (err) =>
            err ? reject(err) : resolve(outputPath)
        );
    });
}

async function handleInstagramReel(reelUrl, message) {
    const tempFilePath = getTemporaryFilePath();

    try {
        await downloadInstagramReel(reelUrl, tempFilePath);
        await message.reply({
            files: [tempFilePath],
            allowedMentions: { repliedUser: false }
        });
    } catch (error) {
        console.error(`Failed to download reel from: ${reelUrl}`, error);
    } finally {
        fs.unlink(tempFilePath, (unlinkError) => {
            if (unlinkError) {
                console.error(`Failed to delete temporary file: ${tempFilePath}`, unlinkError);
            }
        });
    }
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const matches = message.content.match(/https?:\/\/(?:www\.)?instagram\.com\/reel\/[^\s]+/g);
        if (matches) {
            for (const reelUrl of matches) {
                await handleInstagramReel(reelUrl, message);
            }
        }
    }
};
