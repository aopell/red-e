/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').ButtonInteraction} ButtonInteraction
 */

const EStatus = require("../models/e-status");
const { AvailabilityLevel, EmojiKeys, TimeUnit, getStatusMessage } = require("../util");

module.exports = {
    name: "interactionCreate",
    once: false,
    /**
     * Handles a button interaction for reminder messages
     * @param {Client} client The bot client
     * @param {ButtonInteraction} interaction The interaction
     */
    async execute(client, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith("|REMINDER|")) return;

        const [,, buttonUserId, buttonAction] = interaction.customId.split("|");

        const userId = interaction.member.id;

        if (buttonUserId != userId) {
            interaction.reply({ content: `:x: That button is for <@${buttonUserId}>`, ephemeral: true });
            return;
        }

        const emessage = client.state.getEMessage(interaction.guildId, interaction.channelId);

        if (!emessage) {
            interaction.reply({ content: ":x: There is no e message in this channel", ephemeral: true });
            return;
        }

        let newStatus = null;

        switch (buttonAction) {
            case AvailabilityLevel.AVAILABLE:
                newStatus = emessage.updateStatus(client, userId, new EStatus(AvailabilityLevel.AVAILABLE));
                break;
            case AvailabilityLevel.MAYBE:
                newStatus = emessage.updateStatus(client, userId, new EStatus(AvailabilityLevel.MAYBE));
                break;
            case AvailabilityLevel.UNAVAILABLE:
                newStatus = emessage.updateStatus(client, userId, new EStatus(AvailabilityLevel.UNAVAILABLE));
                break;
            case EmojiKeys.FIVE_MINUTES:
                newStatus = emessage.updateStatus(client, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, Date.now() + (5 * TimeUnit.MINUTES)));
                break;
            case EmojiKeys.FIFTEEN_MINUTES:
                newStatus = emessage.updateStatus(client, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, Date.now() + (15 * TimeUnit.MINUTES)));
                break;
            default:
                interaction.reply({ content: "Welp... you done clicked a button. But we don't know what it do!", ephemeral: true });
                return;
        }

        await interaction.update({ content: `<@${userId}> updated their status to: ${getStatusMessage(client.config, newStatus)}`, components: [], allowedMentions: {} });
        emessage.updateAllMessages(client);
    },
};