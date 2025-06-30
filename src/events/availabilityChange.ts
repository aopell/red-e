import EStatus from "../models/e-status";
import { AvailabilityLevel, EmojiKeys, TimeExtensions, TimeUnit, getNearestHourAfter } from "../util";

import type { RedEClient } from "../typedefs";
import type { Interaction } from "discord.js";

export default {
    name: "interactionCreate",
    once: false,
    /**
     * Handles a button or select menu interaction
     * @param client The bot client
     * @param interaction The interaction
     */
    async execute(client: RedEClient, interaction: Interaction) {
        if (!(interaction.isButton() || interaction.isStringSelectMenu())) return;
        if (interaction.customId.startsWith("|")) return;
        if (!interaction.inGuild()) return;

        const userId = interaction.member.user.id;
        const emessage = client.state.getEMessage(interaction.guildId, interaction.channelId);

        if (!emessage) {
            interaction.reply({ content: ":x: There is no e message in this channel", ephemeral: true });
            return;
        }

        const currentStatus = emessage.getStatus(userId);
        const creatorStatus = emessage.getStatus(emessage.creatorId);
        const currentTimeAvailable = currentStatus?.timeAvailable ?? Date.now();
        const tz = client.state.getGuildPreference(interaction.guildId, "defaultTimezone", client.config.defaultTimezone);

        if (!creatorStatus) {
            interaction.reply({ content: ":x: The current e message is in an invalid state", ephemeral: true });
            return;
        }

        switch (interaction.customId) {
            case AvailabilityLevel.AVAILABLE:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE));
                break;
            case EmojiKeys.AGREE:
                if (creatorStatus.timeAvailable && creatorStatus.timeAvailable < Date.now()) {
                    emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE));
                } else {
                    emessage.updateStatus(client, userId, new EStatus(userId, creatorStatus.availability, creatorStatus.timeAvailable));
                }
                break;
            case AvailabilityLevel.MAYBE:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.MAYBE));
                break;
            case AvailabilityLevel.UNAVAILABLE:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.UNAVAILABLE));
                break;
            case EmojiKeys.FIVE_MINUTES:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (5 * TimeUnit.MINUTES)));
                break;
            case EmojiKeys.FIFTEEN_MINUTES:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (15 * TimeUnit.MINUTES)));
                break;
            case EmojiKeys.THIRTY_MINUTES:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (30 * TimeUnit.MINUTES)));
                break;
            case EmojiKeys.ONE_HOUR:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (1 * TimeUnit.HOURS)));
                break;
            case TimeExtensions.TWO_HOURS:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (2 * TimeUnit.HOURS)));
                break;
            case EmojiKeys.EIGHT_O_CLOCK:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(20, tz)));
                break;
            case EmojiKeys.NINE_O_CLOCK:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(21, tz)));
                break;
            case EmojiKeys.TEN_O_CLOCK:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(22, tz)));
                break;
            case EmojiKeys.ELEVEN_O_CLOCK:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(23, tz)));
                break;
            case TimeExtensions.TWELVE_O_CLOCK:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(0, tz)));
                break;
            default:
                interaction.reply({ content: "Welp... you done clicked a button. But we don't know what it do!", ephemeral: true });
                break;
        }

        await interaction.deferUpdate();

        emessage.updateAllMessages(client);
    },
};