const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.commands = new Collection();

const loadCommands = (dir) => {
    const commandFiles = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of commandFiles) {
        if (file.isDirectory()) {
            loadCommands(path.join(dir, file.name));
        } else if (file.name.endsWith('.js')) {
            const command = require(path.join(dir, file.name));
            client.commands.set(command.data.name, command);
        }
    }
};

const loadEvents = (dir) => {
    const eventFiles = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of eventFiles) {
        if (file.isDirectory()) {
            loadEvents(path.join(dir, file.name));
        } else if (file.name.endsWith('.js')) {
            const event = require(path.join(dir, file.name));
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
    }
};

const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

const eventsPath = path.join(__dirname, 'events');
loadEvents(eventsPath);

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);