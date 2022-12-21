import EStatus from "../models/e-status";
import { AvailabilityLevel, EmojiKeys, TimeUnit, getStatusMessage } from "../util";

import type { RedEClient } from "../typedefs";
import type { Interaction } from "discord.js";

export default {
    name: "interactionCreate",
    once: false,
    /**
     * Handles a button interaction for reminder messages
     * @param client The bot client
     * @param interaction The interaction
     */
    async execute(client: RedEClient, interaction: Interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith("|REMINDER|")) return;
        if (!interaction.inGuild()) return;

        const [, , buttonUserId, buttonAction] = interaction.customId.split("|");

        const userId = interaction.member.user.id;

        if (buttonUserId != userId) {
            interaction.reply({ content: `:x: That button is for <@${buttonUserId}>`, ephemeral: true });
            return;
        }

        const emessage = client.state.getEMessage(interaction.guildId, interaction.channelId);

        if (!emessage) {
            interaction.reply({ content: ":x: There is no e message in this channel", ephemeral: true });
            return;
        }

        let newStatus: EStatus | null = null;

        switch (buttonAction) {
            case AvailabilityLevel.AVAILABLE:
                newStatus = emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE));
                break;
            case AvailabilityLevel.MAYBE:
                newStatus = emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.MAYBE));
                break;
            case AvailabilityLevel.UNAVAILABLE:
                newStatus = emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.UNAVAILABLE));
                break;
            case EmojiKeys.FIVE_MINUTES:
                newStatus = emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, Date.now() + (5 * TimeUnit.MINUTES)));
                break;
            case EmojiKeys.FIFTEEN_MINUTES:
                newStatus = emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, Date.now() + (15 * TimeUnit.MINUTES)));
                break;
            default:
                interaction.reply({ content: "Welp... you done clicked a button. But we don't know what it do!", ephemeral: true });
                return;
        }

        await interaction.update({ content: `<@${userId}> updated their status to: ${getStatusMessage(client.config, newStatus)}`, components: [], allowedMentions: {} });
        emessage.updateAllMessages(client);
    },
};