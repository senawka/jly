const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// dynamically import ESM-only node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const toSlug = (str) => str.toLowerCase().replace(/\s+/g, '-');

const formatLinks = (tags) => {
  if (!tags?.length) return null;
  return tags.map(tag => {
    const urlType = tag.type === 'group' ? 'group' : tag.type;
    return `[${tag.name}](https://nhentai.net/${urlType}/${toSlug(tag.name)}/)`;
  }).join(', ');
};

const extractLanguage = (tags) => {
  const langs = tags.filter(tag => tag.type === 'language' && tag.name.toLowerCase() !== 'translated');
  if (!langs.length) return null;
  if (langs.some(tag => tag.name.toLowerCase() === 'english')) return 'English';
  return langs.map(tag => tag.name.charAt(0).toUpperCase() + tag.name.slice(1)).join(', ');
};

const formatDate = (unix) => {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const createEmbedFields = (data) => {
  const tags = data.tags;

  const getTagsByType = (type) => tags.filter(tag => tag.type === type);

  const artists = getTagsByType('artist');
  const groups = getTagsByType('group');
  const characters = getTagsByType('character');
  const parodies = getTagsByType('parody');
  const languages = getTagsByType('language');
  const generalTags = getTagsByType('tag');

  const fields = [];

  if (data.num_pages) {
    fields.push({ name: 'Pages', value: `${data.num_pages}`, inline: true });
  }

  const artistGroupLinks = formatLinks([...artists, ...groups]);
  if (artistGroupLinks) {
    fields.push({ name: 'Artists', value: artistGroupLinks, inline: true });
  }

  const characterLinks = formatLinks(characters);
  if (characterLinks) {
    fields.push({ name: 'Characters', value: characterLinks, inline: true });
  }

  const parodyLinks = formatLinks(parodies);
  if (parodyLinks) {
    fields.push({ name: 'Parodies', value: parodyLinks, inline: true });
  }

  const languageList = extractLanguage(languages);
  if (languageList) {
    fields.push({ name: 'Language', value: languageList, inline: true });
  }

  if (generalTags.length) {
    fields.push({ name: 'Tags', value: generalTags.map(tag => tag.name).join(', '), inline: false });
  }

  return fields;
};

const resolveTitle = (titleObj) => {
  const { pretty, japanese, english } = titleObj;
  if (pretty?.trim()) return pretty;
  if (japanese && english) return `${japanese} | ${english}`;
  return japanese || english || 'Untitled';
};

const createDoujinEmbed = (data, code) => {
  const title = resolveTitle(data.title);
  const url = `https://nhentai.net/g/${code}/`;
  const uploadDate = formatDate(data.upload_date);

  return new EmbedBuilder()
    .setColor('#B3EBF2')
    .setTitle(title)
    .setURL(url)
    .addFields(createEmbedFields(data))
    .setFooter({ text: `Publication Date: ${uploadDate}` });
};

const fetchDoujinData = async (code) => {
  const apiUrl = `https://nhentai.net/api/gallery/${code}`;
  const res = await fetch(apiUrl);
  if (!res.ok) return null;
  return await res.json();
};

const isChannelNSFW = (channel) => channel && channel.nsfw;
const replyNSFWWarning = async (interaction) => {
  return interaction.reply({
    content: 'This command is only available in NSFW channels.',
    ephemeral: true
  });
};

const replyNotFound = async (interaction) => {
  return interaction.reply({
    content: 'No doujinshi found for that code.',
    ephemeral: true
  });
};

const replyFetchError = async (interaction) => {
  return interaction.reply({
    content: 'An unexpected error occurred while fetching the doujinshi.',
    ephemeral: true
  });
};

const replyWithEmbed = async (interaction, embed) => {
  return interaction.reply({ embeds: [embed] });
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nhentai')
    .setDescription('Search doujinshi by NHentai code')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('The NHentai doujinshi code')
        .setRequired(true)),

  async execute(interaction) {
    if (!isChannelNSFW(interaction.channel)) {
      return await replyNSFWWarning(interaction);
    }

    const code = interaction.options.getString('code');

    try {
      const data = await fetchDoujinData(code);
      if (!data) return await replyNotFound(interaction);

      const embed = createDoujinEmbed(data, code);
      return await replyWithEmbed(interaction, embed);
    } catch (error) {
      console.error('Fetch error:', error);
      return await replyFetchError(interaction);
    }
  }
};
