const moment = require("moment-timezone");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { MessageAttachment } = require("discord.js");

/**
 * @typedef {import('discord.js').GuildMember} GuildMember
 * @typedef {import('discord.js').User} User
 * @typedef {import('./models/e-status')} EStatus
 * @typedef {import('./typedefs').Client} Client
 * @typedef {import('./models/e-message')} EMessage
 */

const AvailabilityLevel = Object.freeze({
    UNKNOWN: "UNKNOWN",
    UNAVAILABLE: "UNAVAILABLE",
    MAYBE: "MAYBE",
    AVAILABLE_LATER: "AVAILABLE_LATER",
    AVAILABLE: "AVAILABLE",
    READY: "READY",
    DONE: "DONE",
});

const AvailabilityColors = Object.freeze({
    UNKNOWN: 0x7a7a7a,
    UNAVAILABLE: 0xef5a73,
    MAYBE: 0xffac33,
    AVAILABLE: 0x226699,
    READY: 0x2cd261,
    DONE: 0x9241d4,
    LATE: 0xFF7939,
});

const EmojiKeys = Object.freeze({
    AGREE: "AGREE",
    FIVE_MINUTES: "FIVE_MINUTES",
    FIFTEEN_MINUTES: "FIFTEEN_MINUTES",
    ONE_HOUR: "ONE_HOUR",
    TWO_HOURS: "TWO_HOURS",
    TEN_O_CLOCK: "TEN_O_CLOCK",
    ELEVEN_O_CLOCK: "ELEVEN_O_CLOCK",
    TWELVE_O_CLOCK: "TWELVE_O_CLOCK",
    LATE: "LATE",
});

/**
 * Gets the average color of all statuses
 * @param {import('./typedefs').Config} config Bot config
 * @param {EStatus[]} statuses List of statuses
 * @param {bool} [calcAverage] If true, averages all of the colors
 * @param {number} [currentTime] Allows changing the current time
 * @returns {number|number[]}
 */
function getColorFromStatuses(config, statuses, calcAverage = true, currentTime = Date.now()) {
    function getAverageColor(colors) {
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (const color of colors) {
            count++;
            r += Math.pow(color >> 16, 2);
            g += Math.pow((color >> 8) % 256, 2);
            b += Math.pow(color % 256, 2);
        }

        r /= count;
        g /= count;
        b /= count;
        return (Math.round(Math.sqrt(r)) << 16) + (Math.round(Math.sqrt(g)) << 8) + Math.round(Math.sqrt(b));
    }

    function getWeightedAverageColor(c1, c2, w) {
        w = Math.min(Math.max(w, 0), 1);
        const c1R = c1 >> 16;
        const c1G = (c1 >> 8) >> 8;
        const c1B = c1 % 256;
        const c2R = c2 >> 16;
        const c2G = (c2 >> 8) >> 8;
        const c2B = c2 % 256;

        return (
            (Math.round(Math.sqrt(c1R * c1R * (1 - w) + c2R * c2R * w)) << 16) +
            (Math.round(Math.sqrt(c1G * c1G * (1 - w) + c2G * c2G * w)) << 8) +
            (Math.round(Math.sqrt(c1B * c1B * (1 - w) + c2B * c2B * w)))
        );
    }

    const colors = [];
    for (const status of statuses) {
        if (status.availability === AvailabilityLevel.AVAILABLE_LATER) {
            if (status.timeAvailable < currentTime) {
                colors.push(AvailabilityColors["LATE"]);
            } else {
                const weight = (currentTime - status.creationTimestamp) / (status.timeAvailable - status.creationTimestamp);
                colors.push(getWeightedAverageColor(AvailabilityColors[AvailabilityLevel.MAYBE], AvailabilityColors[AvailabilityLevel.AVAILABLE], weight));
            }
        } else {
            colors.push(AvailabilityColors[status.availability] ?? AvailabilityColors[AvailabilityLevel.UNKNOWN]);
        }
    }

    return calcAverage ? getAverageColor(colors) : colors;
}

/**
 * Gets the message for a given status
 * @param {EStatus} status The status
 * @returns {string}
 */
function getStatusMessage(config, status) {
    function getAvailableLaterStatus() {
        if (status.timeAvailable > Date.now()) {
            return `${config.availabilityEmojis.AVAILABLE_LATER} Available ${discordTimestamp(status.timeAvailable, "R")}`;
        }
        return `${config.availabilityEmojis.LATE} Late as of ${discordTimestamp(status.timeAvailable, "R")}`;
    }

    return {
        UNKNOWN: `${config.availabilityEmojis.UNKNOWN} Unknown`,
        UNAVAILABLE: `${config.availabilityEmojis.UNAVAILABLE} Unavailable`,
        MAYBE: `${config.availabilityEmojis.MAYBE} Maybe Later`,
        AVAILABLE_LATER: getAvailableLaterStatus(),
        AVAILABLE: `${config.availabilityEmojis.AVAILABLE} Available Now`,
        READY: `${config.availabilityEmojis.READY} Ready (In Voice)`,
        DONE: `${config.availabilityEmojis.DONE} Sleeeep`,
    }[status.availability] ?? `${config.availabilityEmojis.UNKNOWN} Unknown`;
}

/**
 * Gets the guild member or user object for the given guildId and userId
 * @returns {Promise<GuildMember|User>}
 */
async function getGuildMemberOrUser(client, guildId, userId) {
    const guild = await client.guilds.fetch(guildId);
    let user = await guild.members.fetch(userId);
    if (!user) {
        user = client.users.fetch(userId);
    }
    return user;
}

/**
 * Gets nickname or username for a given user or guild member object
 * @param {GuildMember|User} user User or Guild Member
 * @returns {string}
 */
function nicknameOrUsername(user) {
    return user?.nickname ?? user?.user?.username ?? user?.username;
}

/**
 * Converts a Unix timestamp to a moment object in a specified timezone
 * @param {number} unixTimestamp Unix timestamp
 * @param {string} timezone Unix timezone string
 * @returns {moment.Moment}
 */
function dateInTimezone(unixTimestamp, timezone) {
    return moment(unixTimestamp).tz(timezone);
}

/**
 * Formats a Unix timestamp as a string in a specified timezone
 * @param {number} unixTimestamp Unix timestamp
 * @param {string} timezone Unix timezone string
 * @param {string} format String format to use
 * @returns {string}
 */
function formattedDateInTimezone(unixTimestamp, timezone, format) {
    return dateInTimezone(unixTimestamp, timezone).format(format);
}

/**
 * Converts a unix timestamp and format flag into a Discord timestamp
 * @param {number} unixTimestamp Unix timestamp
 * @param {string} formatFlag One of `TimestampFlags`
 * @returns {string}
 */
function discordTimestamp(unixTimestamp, formatFlag) {
    return `<t:${Math.floor(unixTimestamp / 1000)}:${formatFlag}>`;
}

/**
 * Finds the nearest `hour` o'clock after the current time in the given timezone.
 * @param {number} hour hour to find, between 0 and 23 inclusive
 * @param {string} timezone Unix timezone in which to find the hour
 * @returns {number} Unix timestamp of nearest `hour` o'clock after the current time
 */
function getNearestHourAfter(hour, timezone) {
    const hourTime = moment.tz(`${hour}:00`, [moment.ISO_8601, "HH:mm"], timezone).valueOf();
    if (hourTime > Date.now() + (24 * TimeUnit.HOURS)) {
        return hourTime - (24 * TimeUnit.HOURS);
    } else if (hourTime < Date.now()) {
        return hourTime + (24 * TimeUnit.HOURS);
    }
    return hourTime;
}

const TimestampFlags = Object.freeze({
    SHORT_TIME: "t",
    LONG_TIME: "T",
    SHORT_DATE: "d",
    LONG_DATE: "D",
    SHORT_DATE_TIME: "f",
    LONG_DATE_TIME: "F",
    RELATIVE: "R",
});

const TimeUnit = Object.freeze({
    SECONDS: 1000,
    MINUTES: 60 * 1000,
    HOURS: 60 * 60 * 1000,
    DAYS: 24 * 60 * 60 * 1000,
});

const EmojiText = Object.freeze({
    CHECK_TICK: "<a:check_tick:747247710373019738>",
    X_MARK: ":x:",
});

/**
 * Creates a chart representing the statuses in this EMessage
 * @param {EMessage} emessage The message to turn into a chart
 * @param {Client} client The bot client
 * @returns {MessageAttachment}
 */
async function createChart(emessage, client) {
    const userIds = Object.keys(emessage.statuses);
    const tz = client.state.getGuildPreference(emessage.guildId, "defaultTimezone", client.config.defaultTimezone);
    const labels = [];
    for (const userId of userIds) {
        labels.push(nicknameOrUsername(await getGuildMemberOrUser(client, emessage.guildId, userId)));
    }

    const MSECS_PER_MIN = 60000;
    const startingTime = new Date(emessage.statusLog[0].creationTimestamp);
    startingTime.setMilliseconds(0);
    startingTime.setSeconds(0);
    const datasets = [];
    /** @type {Map<string, EStatus>} */
    const lastStatus = Object.fromEntries(userIds.map(u => [u, { userId: u, availability: AvailabilityLevel.UNKNOWN, creationTimestamp: startingTime.valueOf() }]));
    lastStatus[emessage.creatorId] = emessage.statusLog[0];
    let nextIndex = 0;

    for (let timestep = startingTime.valueOf(); timestep < emessage.statusLog[emessage.statusLog.length - 1].creationTimestamp + MSECS_PER_MIN; timestep += MSECS_PER_MIN) {
        while (nextIndex < emessage.statusLog.length && emessage.statusLog[nextIndex].creationTimestamp < timestep) {
            const nextStatus = emessage.statusLog[nextIndex];
            lastStatus[nextStatus.userId] = nextStatus;
            nextIndex++;
        }

        const dataset = {
            label: formattedDateInTimezone(timestep, tz, "LT"),
            data: userIds.map(() => 1),
            backgroundColor: getColorFromStatuses(client.config, userIds.map(u => lastStatus[u]), false, timestep, true).map(n => "#" + n.toString(16)),
            borderWidth: 0,
        };

        datasets.push(dataset);
    }

    const chartOptions = {
        type: "horizontalBar",
        data: {
            labels,
            datasets,
        },
        options: {
            title: {
                display: true,
                text: formattedDateInTimezone(startingTime.valueOf(), tz, "LLLL z"),
                fontSize: 36,
            },
            scales: {
                xAxes: [{
                    stacked: true,
                    ticks: {
                        callback: function (value, index, values) {
                            return formattedDateInTimezone(startingTime.valueOf() + MSECS_PER_MIN * value, tz, "LT");
                        },
                        fontSize: 20,
                    },
                }],
                yAxes: [{
                    stacked: true,
                    ticks: {
                        fontSize: 20,
                        fontStyle: "bold",
                    },
                }],
            },
            legend: {
                display: false,
            },
        },
    };

    console.log(chartOptions);

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

    const attachment = new MessageAttachment(await canvas.renderToBuffer(chartOptions), "echart.png");
    return attachment;
}

module.exports = {
    AvailabilityLevel,
    AvailabilityColors,
    EmojiKeys,
    TimestampFlags,
    TimeUnit,
    EmojiText,
    getColorFromStatuses,
    getStatusMessage,
    getGuildMemberOrUser,
    nicknameOrUsername,
    dateInTimezone,
    formattedDateInTimezone,
    discordTimestamp,
    getNearestHourAfter,
    createChart,
};