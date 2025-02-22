const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.commands = new Collection();
const commands = [];

// Commands laden
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach(file => {
    if (file.endsWith('.js')) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
});

// Events laden
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath).forEach(file => {
    if (file.endsWith('.js')) {
        const event = require(`./events/${file}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
});

// Bot opstarten
client.once('ready', async () => {
    console.log(`${client.user.tag} is online!`);
    client.user.setActivity(config.status, { type: 'WATCHING' });
    
    // Commands registreren bij Discord
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
        console.log('Registering commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Commands registered successfully!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.login(config.token);
