// as of the 18 of April, 2025, 4chan is temporarily unavailable, thereof this command will not work as intended.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pcg')
        .setDescription('Get the latest /pcg/ thread link.'),

    async execute(interaction) {
        async function getLatestPcgThread() {
            const catalogUrl = 'https://a.4cdn.org/vt/catalog.json';
            try {
                const response = await axios.get(catalogUrl);
                const catalog = response.data;

                let latestThread = null;
                let latestTime = 0;
                const keywords = ["Phase Connect General", "PCG"];

                for (const page of catalog) {
                    for (const thread of page.threads) {
                        const subject = thread.sub || "";
                        const com = thread.com || "";

                        if (keywords.some(keyword => subject.includes(keyword) || com.includes(keyword))) {
                            if (thread.time > latestTime) {
                                latestTime = thread.time;
                                latestThread = thread.no;
                            }
                        }
                    }
                }

                if (latestThread) {
                    return `https://boards.4channel.org/vt/thread/${latestThread}`;
                } else {
                    return null;
                }
            } catch (error) {
                console.error('Error fetching the /pcg/ thread:', error);
                return null;
            }
        }

        try {
            const latestThreadUrl = await getLatestPcgThread();
            if (latestThreadUrl) {
                await interaction.reply({ content: latestThreadUrl, ephemeral: true });
            } else {
                await interaction.reply({ content: 'No /pcg/ thread found.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error executing the /pcg/ command:', error);
            await interaction.reply({ content: `An error occurred.`, ephemeral: true });
        }
    },
};
