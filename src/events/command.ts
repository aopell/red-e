import type { RedEClient } from "../typedefs";
import type { Interaction } from "discord.js";

export default {
    name: "interactionCreate",
    once: false,
    /**
     * Handles a command interaction
     * @param client The bot client
     * @param interaction The interaction
     */
    async execute(client: RedEClient, interaction: Interaction) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            console.log(`Beginning execution of command: ${interaction.commandName}`);
            await command.execute(client, interaction);
            console.log(`Completed execution of command: ${interaction.commandName}`);
        } catch (error) {
            console.log(error);
            await interaction.reply({ content: ":x: There was an error while executing this command!", ephemeral: true });
        }
    },
};