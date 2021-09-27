const { GuildMember, User } = require("discord.js");
const moment = require("moment");
const EStatus = require("./models/e-status");

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
 * @param {object} config Bot config
 * @param {EStatus[]} statuses List of statuses
 * @returns {number}
 */
function getColorFromStatuses(config, statuses) {
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
            const weight = (Date.now() - status.creationTimestamp) / (status.timeAvailable - status.creationTimestamp);
            colors.push(getWeightedAverageColor(AvailabilityColors[AvailabilityLevel.MAYBE], AvailabilityColors[AvailabilityLevel.AVAILABLE], weight));
        } else {
            colors.push(AvailabilityColors[status.availability] ?? AvailabilityColors[AvailabilityLevel.UNKNOWN]);
        }
    }

    return getAverageColor(colors);
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
 * @returns {GuildMember|User}
 */
function getGuildMemberOrUser(client, guildId, userId) {
    let user = client.guilds?.cache?.get(guildId)?.members?.cache?.get(userId);
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

function dateInTimezone(unixTimestamp, timezone) {
    return moment(unixTimestamp).tz(timezone);
}

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

const TimestampFlags = Object.freeze({
    SHORT_TIME: "t",
    LONG_TIME: "T",
    SHORT_DATE: "d",
    LONG_DATE: "D",
    SHORT_DATE_TIME: "f",
    LONG_DATE_TIME: "F",
    RELATIVE: "R",
});

module.exports = {
    AvailabilityLevel,
    AvailabilityColors,
    EmojiKeys,
    TimestampFlags,
    getColorFromStatuses,
    getStatusMessage,
    getGuildMemberOrUser,
    nicknameOrUsername,
    dateInTimezone,
    formattedDateInTimezone,
    discordTimestamp,
};