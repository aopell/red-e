/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').ButtonInteraction | import('discord.js').SelectMenuInteraction} Interaction
 */

const EStatus = require("../models/e-status");
const { AvailabilityLevel, EmojiKeys, TimeUnit, getNearestHourAfter } = require("../util");

module.exports = {
    name: "interactionCreate",
    once: false,
    /**
     * Handles a button or select menu interaction
     * @param {Client} client The bot client
     * @param {Interaction} interaction The interaction
     */
    async execute(client, interaction) {
        if (!(interaction.isButton() || interaction.isSelectMenu())) return;
        if (interaction.customId.startsWith("|")) return;

        const userId = interaction.member.id;
        const emessage = client.state.getEMessage(interaction.guildId, interaction.channelId);

        if (!emessage) {
            interaction.reply({ content: ":x: There is no e message in this channel", ephemeral: true });
            return;
        }

        const currentStatus = emessage.getStatus(userId);
        const creatorStatus = emessage.getStatus(emessage.creatorId);
        const currentTimeAvailable = currentStatus?.timeAvailable ?? Date.now();
        const tz = client.state.getGuildPreference(interaction.guildId, "defaultTimezone", client.config.defaultTimezone);

        switch (interaction.customId) {
            case AvailabilityLevel.AVAILABLE:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE));
                break;
            case EmojiKeys.AGREE:
                if (creatorStatus.timeAvailable < Date.now()) {
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
            case EmojiKeys.ONE_HOUR:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (1 * TimeUnit.HOURS)));
                break;
            case EmojiKeys.TWO_HOURS:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (2 * TimeUnit.HOURS)));
                break;
            case EmojiKeys.TEN_O_CLOCK:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(22, tz)));
                break;
            case EmojiKeys.ELEVEN_O_CLOCK:
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(23, tz)));
                break;
            case EmojiKeys.TWELVE_O_CLOCK:
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