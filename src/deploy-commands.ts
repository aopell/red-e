import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { token } from "./config.json";
import type { RedEClient } from "./typedefs";
import type { Snowflake } from "discord.js";

const rest = new REST({ version: "10" }).setToken(token);

export async function deployGuildCommands(client: RedEClient, guildId: Snowflake) {
    if (!client.user) throw "Client is in invalid state for loading commands";

    const slashCommands = client.commands.map(c => c.data);

    const result = await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: slashCommands },
    );

    console.log(`Successfully registered application guild commands for ${guildId}.`);
}

export async function deployGlobalCommands(client: RedEClient) {
    if (!client.user) throw "Client is in invalid state for loading commands";

    const slashCommands = client.commands.map(c => c.data);

    const result = await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: slashCommands },
    );

    console.log("Successfully registered application global commands.");
}

export async function deleteAllGuildCommands(client: RedEClient, guildId: Snowflake) {
    if (!client.user) throw "Client is in invalid state for deleting commands";

    const result = await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId), { body: [] },
    );

    console.log(`Successfully deleted application guild commands for ${guildId}.`);
}

export async function deleteAllGlobalCommands(client: RedEClient, guildId: Snowflake) {
    if (!client.user) throw "Client is in invalid state for deleting commands";

    const result = await rest.put(
        Routes.applicationCommands(client.user.id), { body: [] },
    );

    console.log("Successfully deleted application global commands");
}