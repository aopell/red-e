import { SlashCommandBuilder } from "discord.js";
import EMessage from "../models/e-message";
import EStatus from "../models/e-status";
import { AvailabilityLevel, EmojiKeys, TimeUnit, getNearestHourAfter, EmojiText, createChart } from "../util";

import type { RedEClient } from "../typedefs";
import type { Interaction, ChatInputCommandInteraction } from "discord.js";

export default {
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
                        .addChoices(
                            { name: "now", value: AvailabilityLevel.AVAILABLE },
                            { name: "in 5 minutes", value: EmojiKeys.FIVE_MINUTES },
                            { name: "in 15 minutes", value: EmojiKeys.FIFTEEN_MINUTES },
                            { name: "in 1 hour", value: EmojiKeys.ONE_HOUR },
                            { name: "in 2 hours", value: EmojiKeys.TWO_HOURS },
                            { name: "at 10:00 PM", value: EmojiKeys.TEN_O_CLOCK },
                            { name: "at 11:00 PM", value: EmojiKeys.ELEVEN_O_CLOCK },
                            { name: "at midnight", value: EmojiKeys.TWELVE_O_CLOCK },
                            { name: "at some point", value: AvailabilityLevel.UNKNOWN },
                        ),
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
                .setDescription("Creates a chart of the current EMessage if one exists")
                .addBooleanOption(option =>
                    option
                        .setName("ephemeral")
                        .setDescription("Whether this should be an ephemeral response. Defaults to false.")
                        .setRequired(false),
                ),
        ),

    async execute(client: RedEClient, interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inGuild()) return;

        const subcommands: Record<string, any> = {
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
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleShow(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
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
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleStart(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const { channelId, guildId, user, options } = interaction;

    let emessage = client.state.getEMessage(guildId, channelId);
    if (emessage) {
        interaction.reply({ content: `${EmojiText.X_MARK} There is already an e message in this channel.`, ephemeral: true });
        return;
    }

    const tz = client.state.getGuildPreference(interaction.guildId, "defaultTimezone", client.config.defaultTimezone);

    const estatuses: Record<string, EStatus> = {
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

    emessage = new EMessage(user.id, channelId, guildId, estatuses[options.getString("when", true)]);
    client.state.setEMessage(guildId, channelId, emessage);

    const message = await interaction.reply({ ...(await emessage.toMessage(client)), fetchReply: true });
    if (message) {
        emessage.messageIds.push(message.id);
        client.state.setEMessage(guildId, channelId, emessage);
    }
}

/**
 * Executes the "delete" subcommand
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleDelete(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
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
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleChart(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const { channelId, guildId } = interaction;
    const emessage = client.state.getEMessage(guildId, channelId);
    if (!emessage) {
        interaction.reply({ content: `${EmojiText.X_MARK} There is no e message in this channel`, ephemeral: true });
        return;
    }

    const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

    await interaction.deferReply({ ephemeral });
    await interaction.followUp({ files: [await createChart(emessage, client)], ephemeral });
}
