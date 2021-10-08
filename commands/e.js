const { SlashCommandBuilder } = require("@discordjs/builders");
const EMessage = require("../models/e-message");
const EStatus = require("../models/e-status");
const { AvailabilityLevel, EmojiKeys, TimeUnit, getNearestHourAfter, EmojiText, createChart } = require("../util");

/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').CommandInteraction} CommandInteraction
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName("e")
        .setDescription("Creates or views an e status message")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("Create a new e message with your provided availability")
                .addStringOption(option =>
                    option
                        .setName("when")
                        .setDescription("Your availability")
                        .setRequired(true)
                        .addChoices([
                            ["now", AvailabilityLevel.AVAILABLE],
                            ["in 5 minutes", EmojiKeys.FIVE_MINUTES],
                            ["in 15 minutes", EmojiKeys.FIFTEEN_MINUTES],
                            ["in 1 hour", EmojiKeys.ONE_HOUR],
                            ["in 2 hours", EmojiKeys.TWO_HOURS],
                            ["at 10:00 PM", EmojiKeys.TEN_O_CLOCK],
                            ["at 11:00 PM", EmojiKeys.ELEVEN_O_CLOCK],
                            ["at midnight", EmojiKeys.TWELVE_O_CLOCK],
                            ["at some point", AvailabilityLevel.UNKNOWN],
                        ]),
                ),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("show")
                .setDescription("Shows the current EMessage if one exists"),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Delete the current EMessage if one exists"),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("chart")
                .setDescription("Creates a chart of the current EMessage if one exists"),
        ),


    /**
     * Executes the command
     * @param {Client} client The current client
     * @param {CommandInteraction} interaction The interaction object
     */
    async execute(client, interaction) {
        const subcommands = {
            show: handleShow,
            start: handleStart,
            delete: handleDelete,
            chart: handleChart,
        };

        await subcommands[interaction.options.getSubcommand()](client, interaction);
    },
};

/**
 * Executes the "show" subcommand
 * @param {Client} client The current client
 * @param {CommandInteraction} interaction The interaction object
 */
async function handleShow(client, interaction) {
    const { channelId, guildId } = interaction;
    const emessage = client.state.getEMessage(guildId, channelId);
    if (!emessage) {
        interaction.reply({ content: `${EmojiText.X_MARK} There is no e message in this channel`, ephemeral: true });
        return;
    }

    const message = await interaction.reply({ ...(await emessage.toMessage(client)), ephemeral: false, fetchReply: true });
    if (message) {
        emessage.messageIds.push(message.id);
        client.state.setEMessage(guildId, channelId, emessage);
    }
}

/**
 * Executes the "start" subcommand
 * @param {Client} client The current client
 * @param {CommandInteraction} interaction The interaction object
 */
async function handleStart(client, interaction) {
    const { channelId, guildId, user, options } = interaction;

    let emessage = client.state.getEMessage(guildId, channelId);
    if (emessage) {
        interaction.reply({ content: `${EmojiText.X_MARK} There is already an e message in this channel.`, ephemeral: true });
        return;
    }

    const tz = client.state.getGuildPreference(interaction.guildId, "defaultTimezone", client.config.defaultTimezone);

    const estatuses = {
        [AvailabilityLevel.AVAILABLE]: new EStatus(user.id, AvailabilityLevel.AVAILABLE),
        [EmojiKeys.FIVE_MINUTES]: new EStatus(user.id, AvailabilityLevel.AVAILABLE_LATER, Date.now() + (5 * TimeUnit.MINUTES)),
        [EmojiKeys.FIFTEEN_MINUTES]: new EStatus(user.id, AvailabilityLevel.AVAILABLE_LATER, Date.now() + (15 * TimeUnit.MINUTES)),
        [EmojiKeys.ONE_HOUR]: new EStatus(user.id, AvailabilityLevel.AVAILABLE_LATER, Date.now() + (1 * TimeUnit.HOURS)),
        [EmojiKeys.TWO_HOURS]: new EStatus(user.id, AvailabilityLevel.AVAILABLE_LATER, Date.now() + (2 * TimeUnit.HOURS)),
        [EmojiKeys.TEN_O_CLOCK]: new EStatus(user.id, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(22, tz)),
        [EmojiKeys.ELEVEN_O_CLOCK]: new EStatus(user.id, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(23, tz)),
        [EmojiKeys.TWELVE_O_CLOCK]: new EStatus(user.id, AvailabilityLevel.AVAILABLE_LATER, getNearestHourAfter(0, tz)),
        [AvailabilityLevel.UNKNOWN]: new EStatus(user.id, AvailabilityLevel.UNKNOWN),
    };

    emessage = new EMessage(user.id, channelId, guildId, estatuses[options.get("when").value]);
    client.state.setEMessage(guildId, channelId, emessage);

    await interaction.reply(await emessage.toMessage(client));
    const message = interaction.fetchReply();
    if (message) {
        emessage.messageIds.push(message.id);
        client.state.setEMessage(guildId, channelId, emessage);
    }
}

/**
 * Executes the "delete" subcommand
 * @param {Client} client The current client
 * @param {CommandInteraction} interaction The interaction object
 */
async function handleDelete(client, interaction) {
    const { channelId, guildId } = interaction;
    const emessage = client.state.getEMessage(guildId, channelId);
    if (!emessage) {
        interaction.reply({ content: `${EmojiText.X_MARK} There is no e message in this channel`, ephemeral: true });
        return;
    }

    emessage.updateAllMessages(client, true);
    client.state.setEMessage(guildId, channelId, undefined);
    interaction.reply({ content: `${EmojiText.CHECK_TICK} Successfully deleted e message`, ephemeral: true });
}

/**
 * Executes the "chart" subcommand
 * @param {Client} client The current client
 * @param {CommandInteraction} interaction The interaction object
 */
async function handleChart(client, interaction) {
    const { channelId, guildId } = interaction;
    const emessage = client.state.getEMessage(guildId, channelId);
    if (!emessage) {
        interaction.reply({ content: `${EmojiText.X_MARK} There is no e message in this channel`, ephemeral: true });
        return;
    }

    interaction.reply({ files: [createChart(emessage, client)] });
}