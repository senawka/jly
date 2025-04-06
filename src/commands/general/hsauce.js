const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nhentai')
        .setDescription('Lookup doujinshi by code')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('the code of the doujinshi')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.channel || !interaction.channel.nsfw) {
            return interaction.reply({ content: 'This command can only be used in NSFW channels.', ephemeral: true });
        }
        
        const code = interaction.options.getString('code');
        const apiUrl = `https://nhentai.net/api/gallery/${code}`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                return interaction.reply({ content: 'Could not find doujinshi for that code.', ephemeral: true });
            }
            
            const data = await response.json();

            const prettyTitle = data.title.pretty;
            let finalTitle = prettyTitle;
            if (!finalTitle || finalTitle.trim() === '') {
                const japTitle = data.title.japanese;
                const engTitle = data.title.english;
                if (japTitle && engTitle) {
                    finalTitle = `${japTitle} | ${engTitle}`;
                } else {
                    finalTitle = japTitle || engTitle || 'Untitled';
                }
            }
            
            const galleryUrl = `https://nhentai.net/g/${code}/`;
            const numPages = data.num_pages ? `${data.num_pages}` : null;

            const tags = data.tags;
            const artists = tags.filter(tag => tag.type === 'artist');
            const groups = tags.filter(tag => tag.type === 'group');
            const artistAndGroup = [...artists, ...groups];

            const characters = tags.filter(tag => tag.type === 'character');
            const parodies = tags.filter(tag => tag.type === 'parody');
            let languages = tags.filter(tag => tag.type === 'language' && tag.name.toLowerCase() !== 'translated');
            const generalTags = tags.filter(tag => tag.type === 'tag');

            const formatName = (name) => name.toLowerCase().replace(/\s+/g, '-');

            const formatArtistGroupLinks = (tagArray) => {
                if (!tagArray.length) return null;
                return tagArray
                    .map(tag => {
                        let baseUrl;
                        if (tag.type === 'group') {
                            baseUrl = 'https://nhentai.net/group/';
                        } else { 
                            baseUrl = 'https://nhentai.net/artist/';
                        }
                        return `[${tag.name}](${baseUrl}${formatName(tag.name)}/)`;
                    })
                    .join(', ');
            };

            const formatCharacterLinks = (tagArray) => {
                if (!tagArray.length) return null;
                return tagArray
                    .map(tag => `[${tag.name}](https://nhentai.net/character/${formatName(tag.name)}/)`)
                    .join(', ');
            };

            const formatParodyLinks = (tagArray) => {
                if (!tagArray.length) return null;
                return tagArray
                    .map(tag => `[${tag.name}](https://nhentai.net/parody/${formatName(tag.name)}/)`)
                    .join(', ');
            };

            const artistLinks = formatArtistGroupLinks(artistAndGroup);
            const characterLinks = formatCharacterLinks(characters);
            const parodyLinks = formatParodyLinks(parodies);
            const generalTagList = generalTags.length ? generalTags.map(tag => tag.name).join(', ') : null;

            let languageList = null;
            if (languages.length) {
                if (languages.some(tag => tag.name.toLowerCase() === 'english')) {
                    languageList = 'English';
                } else if (languages.length === 1) {
                    languageList = languages[0].name.charAt(0).toUpperCase() + languages[0].name.slice(1);
                } else {
                    languageList = languages
                        .map(tag => tag.name.charAt(0).toUpperCase() + tag.name.slice(1))
                        .join(', ');
                }
            }

            const pubDate = new Date(data.upload_date * 1000);
            const formattedDate = pubDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            let embedFields = [];
            if (numPages) {
                embedFields.push({ name: 'Pages', value: numPages, inline: true });
            }
            if (artistLinks) {
                embedFields.push({ name: 'Artists', value: artistLinks, inline: true });
            }
            if (characterLinks) {
                embedFields.push({ name: 'Characters', value: characterLinks, inline: true });
            }
            if (parodyLinks) {
                embedFields.push({ name: 'Parodies', value: parodyLinks, inline: true });
            }
            if (languageList) {
                embedFields.push({ name: 'Language', value: languageList, inline: true });
            }
            if (generalTagList) {
                embedFields.push({ name: 'Tags', value: generalTagList, inline: false });
            }

            const embed = new EmbedBuilder()
                .setColor('#B3EBF2')
                .setTitle(finalTitle)
                .setURL(galleryUrl)
                .addFields(embedFields)
                .setFooter({ text: `Publication Date: ${formattedDate}` });

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching nhentai data:', error);
            await interaction.reply({ content: 'An error occurred while fetching data.', ephemeral: true });
        }
    },
};
