const { SlashCommandBuilder } = require("@discordjs/builders");
const EMessage = require("../models/e-message");
const EStatus = require("../models/e-status");
const { AvailabilityLevel } = require("../util");

/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').CommandInteraction} CommandInteraction
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName("e")
        .setDescription("Shows the current E status"),

    /**
     * Executes the command
     * @param {Client} client The current client
     * @param {CommandInteraction} interaction The interaction object
     */
    async execute(client, interaction) {
        const { channelId, guildId, user } = interaction;
        let emessage = client.state.getEMessage(guildId, channelId);
        if (!emessage) {
            emessage = new EMessage(user.id, channelId, guildId, new EStatus(AvailabilityLevel.UNKNOWN));
            client.state.setEMessage(guildId, channelId, emessage);
        }

        const message = await interaction.reply({ ...(await emessage.toMessage(client)), ephemeral: false, fetchReply: true });
        if (message) {
            emessage.messageIds.push(message.id);
            client.state.setEMessage(guildId, channelId, emessage);
        }
    },
};