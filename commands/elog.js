const { SlashCommandBuilder } = require("@discordjs/builders");
const fs = require("fs");
const { EmojiText, formattedDateInTimezone, AvailabilityLevel, nicknameOrUsername, getGuildMemberOrUser } = require("../util");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { MessageAttachment } = require("discord.js");

/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('../models/e-message')} EMessage
 * @typedef {import('discord.js').CommandInteraction} CommandInteraction
 */

module.exports = {
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
                        .setDescription("The log file to display as a chart")
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
                ),
        ),


    /**
     * Executes the command
     * @param {Client} client The current client
     * @param {CommandInteraction} interaction The interaction object
     */
    async execute(client, interaction) {
        const subcommands = {
            list: handleList,
            view: handleView,
            chart: handleChart,
        };

        await subcommands[interaction.options.getSubcommand()](client, interaction);
    },
};

/**
 * Executes the "list" subcommand
 * @param {Client} client The current client
 * @param {CommandInteraction} interaction The interaction object
 */
async function handleList(client, interaction) {
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
        function listItem(fileName) {
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
 * @param {Client} client The current client
 * @param {CommandInteraction} interaction The interaction object
 */
async function handleView(client, interaction) {
    const { channelId, guildId } = interaction;
    const filename = interaction.options.getString("file");
    if (filename.includes("/")) {
        interaction.reply({ content: `${EmojiText.X_MARK} File name cannot contain \`/\`.`, ephemeral: true });
        return;
    } else if (!fs.existsSync(`logs/messages/${guildId}/${channelId}/${filename}`)) {
        interaction.reply({ content: `${EmojiText.X_MARK} That file does not exist.`, ephemeral: true });
        return;
    }

    const json = JSON.parse(fs.readFileSync(`logs/messages/${guildId}/${channelId}/${filename}`));

    interaction.reply({ files: [Buffer.from(JSON.stringify(json, null, 4))], ephemeral: true });
}

/**
 * Executes the "chart" subcommand
 * @param {Client} client The current client
 * @param {CommandInteraction} interaction The interaction object
 */
async function handleChart(client, interaction) {
    const { channelId, guildId } = interaction;
    const filename = interaction.options.getString("file");
    const tz = client.state.getGuildPreference(interaction.guildId, "defaultTimezone", client.config.defaultTimezone);
    if (filename.includes("/")) {
        interaction.reply({ content: `${EmojiText.X_MARK} File name cannot contain \`/\`.`, ephemeral: true });
        return;
    } else if (!fs.existsSync(`logs/messages/${guildId}/${channelId}/${filename}`)) {
        interaction.reply({ content: `${EmojiText.X_MARK} That file does not exist.`, ephemeral: true });
        return;
    }

    /** @type {EMessage} */
    const json = JSON.parse(fs.readFileSync(`logs/messages/${guildId}/${channelId}/${filename}`));

    const AVAILABILITY_VALUES = {
        [AvailabilityLevel.DONE]: 8,
        [AvailabilityLevel.READY]: 7,
        [AvailabilityLevel.AVAILABLE]: 5,
        [AvailabilityLevel.AVAILABLE_LATER]: 2,
        [AvailabilityLevel.MAYBE]: 1,
        [AvailabilityLevel.UNKNOWN]: 0,
        [AvailabilityLevel.UNAVAILABLE]: -1,
    };

    const userIds = Object.keys(json.statuses);
    const chartValues = {};
    const timesAvailable = {};
    const lastUpdated = {};
    const nicks = {};
    const timesteps = [];
    for (const userId of userIds) {
        chartValues[userId] = [];
        timesAvailable[userId] = 0;
        lastUpdated[userId] = 0;
        nicks[userId] = nicknameOrUsername(await getGuildMemberOrUser(client, guildId, userId));
    }

    for (let i = 0; i < json.statusLog.length; i++) {
        const status = json.statusLog[i];
        timesteps.push(status.creationTimestamp);
        for (const userId of userIds) {
            if (userId == status.userId) {
                chartValues[userId].push({ x: status.creationTimestamp, y: AVAILABILITY_VALUES[status.availability] });
                timesAvailable[userId] = status.timeAvailable ?? 0;
                lastUpdated[userId] = status.creationTimestamp;
            } else if (i == 0) {
                chartValues[userId].push({ x: status.creationTimestamp, y: AVAILABILITY_VALUES[AvailabilityLevel.UNKNOWN] });
            } else if (timesAvailable[userId]) {
                const availabilityPercentage = (status.creationTimestamp - lastUpdated[userId]) / (timesAvailable[userId] - lastUpdated[userId]);
                const valueAdd = (AVAILABILITY_VALUES[AvailabilityLevel.AVAILABLE] - AVAILABILITY_VALUES[AvailabilityLevel.AVAILABLE_LATER]) * availabilityPercentage;
                chartValues[userId].push({ x: status.creationTimestamp, y: AVAILABILITY_VALUES[AvailabilityLevel.AVAILABLE_LATER] + valueAdd });
            } else {
                chartValues[userId].push({ x: status.creationTimestamp, y: chartValues[userId][i - 1] });
            }
        }
    }

    const chartOptions = {
        type: "line",
        data: {
            labels: timesteps.map(t => formattedDateInTimezone(t, tz, "MMM D LT z")),
            datasets: userIds.map(uid => ({
                label: nicks[uid],
                data: chartValues[uid],
                borderColor: "#" + Math.floor(Math.random() * (1 << 3 * 8)).toString(16).padStart(6, "0"),
                fill: false,
            })),
        },
        options: {
            scales: {
                x: {
                    type: "time",
                    distribution: "linear",
                },
                // y: {
                //     beginAtZero: true,
                // },
            },
        },
    };

    const width = 1920;
    const height = 1080;
    const canvas = new ChartJSNodeCanvas({
        width, height, plugins: {
            modern: [{
                beforeDraw: chart => {
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                },
            }],
        },
    });

    const attachment = new MessageAttachment(await canvas.renderToBuffer(chartOptions), "test-chart.png");

    interaction.reply({ files: [attachment], ephemeral: true });
}