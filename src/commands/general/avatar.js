const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Gets a user\'s avatar')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose avatar you want to get.')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('size')
                .setDescription('The size of the avatar (128, 256, 512, 1024)')
                .setRequired(false)
                .addChoices(
                    { name: '128', value: 128 },
                    { name: '256', value: 256 },
                    { name: '512', value: 512 },
                    { name: '1024', value: 1024 }
                )),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const size = interaction.options.getInteger('size') || 256;

        try {
            const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
            const avatarUrl = user.displayAvatarURL({ format, size });
            const fullAvatarUrl = user.displayAvatarURL({ format, size: 1024 });

            const embed = new EmbedBuilder()
                .setTitle(`Avatar for ${user.username}`)
                .setImage(avatarUrl)
                .setDescription(`[View full size](${fullAvatarUrl})`)
                .setColor('#B3EBF2');

            const embeds = [embed];

            // If the user has a server-specific avatar, send that as well
            const member = await interaction.guild.members.fetch(user.id);
            if (member.avatar) {
                const serverAvatarUrl = member.displayAvatarURL({ format, size });
                const serverFullAvatarUrl = member.displayAvatarURL({ format, size: 1024 });

                const serverEmbed = new EmbedBuilder()
                    .setTitle(`Server Avatar for ${user.username}`)
                    .setImage(serverAvatarUrl)
                    .setDescription(`[View full size](${serverFullAvatarUrl})`)
                    .setColor('#B3EBF2');

                embeds.push(serverEmbed);
            }

            await interaction.reply({ embeds });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
        }
    },
};