const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const commands = [];

function getCommandFiles(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        if (file.isDirectory()) {
            getCommandFiles(path.join(dir, file.name));
        } else if (file.name.endsWith('.js')) {
            const command = require(path.join(dir, file.name));
            commands.push(command.data.toJSON());
        }
    }
}

const commandsPath = path.join(__dirname, 'commands');
getCommandFiles(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started clearing global application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] },
        );

        console.log('Successfully cleared global application (/) commands.');

        console.log('Started refreshing global application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded global application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();