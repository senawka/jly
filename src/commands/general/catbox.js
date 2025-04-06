// GIFs larger than 20 MB must be converted to webm
// all uploads via Discord are restricted to file upload limits (i.e., non-Nitro users are limited to 10 MB, while Nitro users are limited to 500 MB)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('catbox')
        .setDescription('Upload a file to catbox.moe')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('The file to upload')
                .setRequired(true)),
    async execute(interaction) {
        const file = interaction.options.getAttachment('file');

        if (!file) {
            return interaction.reply({ content: 'You must provide a file to upload!', ephemeral: true });
        }

        if (file.size > 200 * 1024 * 1024) {
            return interaction.reply({ content: 'The file size exceeds the 200 MB limit.', ephemeral: true });
        }

        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, file.name);
        const writer = fs.createWriteStream(filePath);

        const embed = new EmbedBuilder()
            .setTitle('Catbox.moe Upload')
            .setColor('#B3EBF2')
            .setDescription('Uploading your file. Please wait...')
            .setThumbnail('https://catbox.moe/pictures/logo_white.png');

        await interaction.reply({ embeds: [embed], ephemeral: true });

        try {
            const downloadResponse = await axios({
                method: 'get',
                url: file.url,
                responseType: 'stream',
                timeout: 60000
            });

            downloadResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('userhash', '');
            form.append('fileToUpload', fs.createReadStream(filePath));

            const uploadResponse = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                timeout: 120000
            });

            fs.unlinkSync(filePath);

            if (uploadResponse.data.startsWith('https://')) {
                embed.setColor('#B3EBF2')
                    .setDescription(`Your file has been uploaded successfully!\n`)
                    .addFields({ name: 'Link:', value: uploadResponse.data });

                await interaction.editReply({ embeds: [embed], ephemeral: true });
            } else {
                throw new Error('Unexpected response from Catbox.moe');
            }
        } catch (error) {
            console.error('Error uploading file to Catbox.moe:', error);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            embed.setColor('#B3EBF2')
                .setDescription('An error occurred while uploading the file.');

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } finally {
            if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
                fs.rmdirSync(tempDir);
            }
        }
    },
};