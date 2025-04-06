const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');


const formatName = name => name.toLowerCase().replace(/\s+/g, '-');
const formatArtistGroupLinks = tags => {
  if (!tags.length) return null;
  return tags
    .map(tag => {
      const baseUrl = tag.type === 'group'
        ? 'https://nhentai.net/group/'
        : 'https://nhentai.net/artist/';
      return `[${tag.name}](${baseUrl}${formatName(tag.name)}/)`;
    })
    .join(', ');
};

const formatCharacterLinks = tags => {
  if (!tags.length) return null;
  return tags
    .map(tag => `[${tag.name}](https://nhentai.net/character/${formatName(tag.name)}/)`)
    .join(', ');
};

const formatParodyLinks = tags => {
  if (!tags.length) return null;
  return tags
    .map(tag => `[${tag.name}](https://nhentai.net/parody/${formatName(tag.name)}/)`)
    .join(', ');
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nhentai')
    .setDescription('Lookup doujinshi by code')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('The code of the doujinshi')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.channel || !interaction.channel.nsfw) {
      return interaction.reply({
        content: 'This command can only be used in NSFW channels.',
        ephemeral: true
      });
    }

    const code = interaction.options.getString('code');
    const apiUrl = `https://nhentai.net/api/gallery/${code}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        return interaction.reply({
          content: 'Could not find doujinshi for that code.',
          ephemeral: true
        });
      }

      const data = await response.json();
      const { pretty, japanese, english } = data.title;
      const finalTitle = (pretty && pretty.trim())
        ? pretty
        : (japanese && english)
          ? `${japanese} | ${english}`
          : (japanese || english || 'Untitled');

      const galleryUrl = `https://nhentai.net/g/${code}/`;
      const numPages = data.num_pages ? `${data.num_pages}` : null;
      const tags = data.tags;

      const artists = tags.filter(tag => tag.type === 'artist');
      const groups = tags.filter(tag => tag.type === 'group');
      const artistAndGroup = [...artists, ...groups];
      const characters = tags.filter(tag => tag.type === 'character');
      const parodies = tags.filter(tag => tag.type === 'parody');
      const languages = tags.filter(tag => tag.type === 'language' && tag.name.toLowerCase() !== 'translated');
      const generalTags = tags.filter(tag => tag.type === 'tag');

      const artistLinks = formatArtistGroupLinks(artistAndGroup);
      const characterLinks = formatCharacterLinks(characters);
      const parodyLinks = formatParodyLinks(parodies);
      const generalTagList = generalTags.length ? generalTags.map(tag => tag.name).join(', ') : null;

      const languageList = languages.length
        ? languages.some(tag => tag.name.toLowerCase() === 'english')
          ? 'English'
          : languages.length === 1
            ? languages[0].name[0].toUpperCase() + languages[0].name.slice(1)
            : languages
              .map(tag => tag.name[0].toUpperCase() + tag.name.slice(1))
              .join(', ')
        : null;

      const pubDate = new Date(data.upload_date * 1000);
      const formattedDate = pubDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const embedFields = [];
      if (numPages) embedFields.push({ name: 'Pages', value: numPages, inline: true });
      if (artistLinks) embedFields.push({ name: 'Artists', value: artistLinks, inline: true });
      if (characterLinks) embedFields.push({ name: 'Characters', value: characterLinks, inline: true });
      if (parodyLinks) embedFields.push({ name: 'Parodies', value: parodyLinks, inline: true });
      if (languageList) embedFields.push({ name: 'Language', value: languageList, inline: true });
      if (generalTagList) embedFields.push({ name: 'Tags', value: generalTagList, inline: false });

      const embed = new EmbedBuilder()
        .setColor('#B3EBF2')
        .setTitle(finalTitle)
        .setURL(galleryUrl)
        .addFields(embedFields)
        .setFooter({ text: `Publication Date: ${formattedDate}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching nhentai data:', error);
      await interaction.reply({
        content: 'An error occurred while fetching data.',
        ephemeral: true
      });
    }
  }
};
