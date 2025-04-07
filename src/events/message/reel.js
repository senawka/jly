const { Events } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'temp');

// very pro naming method
const generateFilename = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${result}.mp4`;
};

const downloadReel = (url, outputPath) => {
    return new Promise((resolve, reject) => {
        exec(`yt-dlp -f mp4 "${url}" -o "${outputPath}"`, (error) => {
            if (error) reject(error);
            else resolve(outputPath);
        });
    });
};

const handleInstagramReel = async (link, message) => {
    const filename = generateFilename();
    const filePath = path.join(tempDir, filename);

    try {
        await downloadReel(link, filePath);
        await message.reply({
            files: [filePath],
            allowedMentions: { repliedUser: false }
        });
    } catch (err) {
        console.error(`yt-dlp failed for: ${link}\n`, err);
        // add fallback with lightweight solution
        try {
            const fallbackUrl = new URL(link);
            fallbackUrl.hostname = 'instagramez.com';
            await message.reply({
                content: `awawawa (something fucked up, try this): ${fallbackUrl.toString()}`,
                allowedMentions: { repliedUser: false }
            });
        } catch (fallbackErr) {
            console.error(`Fallback failed for: ${link}\n`, fallbackErr);
        }
    } finally {
        fs.unlink(filePath, (err) => {
            if (err) console.error(`Failed to delete temp file: ${filePath}\n`, err);
        });
    }
};

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        const pattern = /(https?:\/\/(www\.)?instagram\.com\/reel\/[^\s]+)/g;
        const matches = message.content.match(pattern);
        if (matches) {
            for (const link of matches) {
                await handleInstagramReel(link, message);
            }
        }
    }
};