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

        const userId = interaction.member.id;
        const emessage = client.state.getEMessage(interaction.guildId, interaction.channelId);

        if (!emessage) {
            interaction.reply({ content: ":x: There is no e message in this channel", ephemeral: true });
            return;
        }

        const currentStatus = emessage.getStatus(userId);
        const creatorStatus = emessage.getStatus(emessage.creatorId);
        const currentTimeAvailable = currentStatus?.timeAvailable ?? Date.now();

        switch (interaction.customId) {
            case AvailabilityLevel.AVAILABLE:
                emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE));
                break;
            case EmojiKeys.AGREE:
                if (creatorStatus.timeAvailable < Date.now()) {
                    emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE));
                } else {
                    emessage.updateStatus(client.state, userId, new EStatus(creatorStatus.availability, creatorStatus.timeAvailable));
                }
                break;
            case AvailabilityLevel.MAYBE:
                emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.MAYBE));
                break;
            case AvailabilityLevel.UNAVAILABLE:
                emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.UNAVAILABLE));
                break;
            case EmojiKeys.FIVE_MINUTES:
                emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (5 * TimeUnit.MINUTES)));
                break;
            case EmojiKeys.FIFTEEN_MINUTES:
                emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (15 * TimeUnit.MINUTES)));
                break;
            case EmojiKeys.ONE_HOUR:
                emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (1 * TimeUnit.HOURS)));
                break;
            case EmojiKeys.TWO_HOURS:
                emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, currentTimeAvailable + (2 * TimeUnit.HOURS)));
                break;
            case "AVAILABILITY_SELECT":
                switch (interaction.values[0]) {
                    case EmojiKeys.TEN_O_CLOCK:
                        emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(22, client.config.defaultTimezone)));
                        break;
                    case EmojiKeys.ELEVEN_O_CLOCK:
                        emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(23, client.config.defaultTimezone)));
                        break;
                    case EmojiKeys.TWELVE_O_CLOCK:
                        emessage.updateStatus(client.state, userId, new EStatus(AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(0, client.config.defaultTimezone)));
                        break;
                }
                break;
            default:
                interaction.reply({ content: "Welp... you done clicked a button. But we don't know what it do!", ephemeral: true });
                break;
        }

        await interaction.deferUpdate();

        emessage.updateAllMessages(client);
    },
};