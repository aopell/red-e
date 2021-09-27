const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("e")
        .setDescription("Shows the current E status"),

    async execute(interaction) {
        await interaction.reply({ content: "EEEE" });
    },
};