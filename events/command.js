module.exports = {
    name: "interactionCreate",
    once: true,
    async execute(client, interaction) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            console.log(`Beginning execution of command: ${interaction.commandName}`);
            await command.execute(interaction);
            console.log(`Completed execution of command: ${interaction.commandName}`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: ":x: There was an error while executing this command!", ephemeral: true });
        }
    },
};