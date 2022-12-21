import fs from "fs";
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { EmojiText, formattedDateInTimezone, createChart } from "../util";

import type { RedEClient } from "../typedefs";
import type { Interaction, ChatInputCommandInteraction } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("elog")
        .setDescription("Lists or views the contents of history logs")
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Shows available logs for the current channel")
                .addIntegerOption(option =>
                    option
                        .setName("page")
                        .setDescription("Shows logs on the specified page")
                        .setRequired(false),
                ),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("view")
                .setDescription("View the specified log")
                .addStringOption(option =>
                    option
                        .setName("file")
                        .setDescription("The log file to view")
                        .setRequired(true),
                ),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("chart")
                .setDescription("Shows a chart for the specified log")
                .addStringOption(option =>
                    option
                        .setName("file")
                        .setDescription("The log file to display as a chart")
                        .setRequired(true),
                )
                .addBooleanOption(option =>
                    option
                        .setName("ephemeral")
                        .setDescription("Whether this should be an ephemeral response. Defaults to false.")
                        .setRequired(false),
                ),
        ),


    /**
     * Executes the command
     * @param client The current client
     * @param interaction The interaction object
     */
    async execute(client: RedEClient, interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inGuild()) return;

        const subcommands: Record<string, any> = {
            list: handleList,
            view: handleView,
            chart: handleChart,
        };

        await subcommands[interaction.options.getSubcommand()](client, interaction);
    },
};

/**
 * Executes the "list" subcommand
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleList(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const { channelId, guildId } = interaction;
    try {
        const files = fs.readdirSync(`logs/messages/${guildId}/${channelId}`);
        if (files.length == 0) {
            throw "No files";
        }
        const page = interaction.options.getInteger("page") ?? 1;

        const FILES_PER_PAGE = 20;
        const startIndex = FILES_PER_PAGE * (page - 1);
        const endIndex = startIndex + FILES_PER_PAGE;

        const currentPage = files.slice(startIndex, endIndex);
        if (currentPage.length == 0) {
            interaction.reply({ content: `${EmojiText.X_MARK} No more logs to show`, ephemeral: true });
            return;
        }

        const tz = client.state.getGuildPreference(interaction.guildId, "defaultTimezone", client.config.defaultTimezone);

        // eslint-disable-next-line no-inner-declarations
        function listItem(fileName: string): string {
            const [timestamp] = fileName.split(".");
            return `:page_facing_up: \`${fileName}\` (${formattedDateInTimezone(Number.parseInt(timestamp), tz, "llll z")})`;
        }

        interaction.reply({ content: `**__LOGS ${startIndex + 1}-${Math.min(endIndex, currentPage.length)} of ${files.length}__**\n` + currentPage.map(listItem).join("\n"), ephemeral: true });
    } catch (err) {
        console.log(err);
        interaction.reply({ content: `${EmojiText.X_MARK} Unable to find any logs for this channel`, ephemeral: true });
    }
}

/**
 * Executes the "list" subcommand
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleView(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const { channelId, guildId } = interaction;
    const filename = interaction.options.getString("file", true);
    if (filename.includes("/")) {
        interaction.reply({ content: `${EmojiText.X_MARK} File name cannot contain \`/\`.`, ephemeral: true });
        return;
    } else if (!fs.existsSync(`logs/messages/${guildId}/${channelId}/${filename}`)) {
        interaction.reply({ content: `${EmojiText.X_MARK} That file does not exist.`, ephemeral: true });
        return;
    }

    const json = JSON.parse(fs.readFileSync(`logs/messages/${guildId}/${channelId}/${filename}`).toString());

    interaction.reply({ files: [new AttachmentBuilder(Buffer.from(JSON.stringify(json, null, 4)), { name: filename })], ephemeral: true });
}

/**
 * Executes the "chart" subcommand
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleChart(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const { channelId, guildId } = interaction;
    const filename = interaction.options.getString("file", true);
    if (filename.includes("/")) {
        interaction.reply({ content: `${EmojiText.X_MARK} File name cannot contain \`/\`.`, ephemeral: true });
        return;
    } else if (!fs.existsSync(`logs/messages/${guildId}/${channelId}/${filename}`)) {
        interaction.reply({ content: `${EmojiText.X_MARK} That file does not exist.`, ephemeral: true });
        return;
    }

    const filePath = `logs/messages/${guildId}/${channelId}/${filename}`;
    const json = JSON.parse(fs.readFileSync(filePath).toString());

    const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

    await interaction.deferReply({ ephemeral });

    const attachment = await createChart(json, client);

    await interaction.followUp({ files: [attachment], ephemeral });
}
