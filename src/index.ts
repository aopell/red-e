import fs from "fs";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import config from "./config.json";
import ClientState from "./botstate";

import type { RedEClient, CommandHandler } from "./typedefs";

const client: RedEClient = <RedEClient> new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers] });

client.config = config;
client.state = ClientState.load();

client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

/* eslint-disable @typescript-eslint/no-var-requires */

for (const file of commandFiles) {
    const command: CommandHandler = require(`./commands/${file}`).default;
    client.commands.set(command.data.name, command);
    console.log(`Loaded Command | ${file} | ${command.data.name}`);
}

const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
    const event = require(`./events/${file}`).default;
    if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
    }
    console.log(`Loaded Event | ${file} | ${event.name}`);
}

client.login(config.token);