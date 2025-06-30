import moment from "moment-timezone";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { AttachmentBuilder, Snowflake } from "discord.js";

import { GuildMember, User } from "discord.js";
import EStatus from "./models/e-status";
import type { RedEClient, Config } from "./typedefs";
import type EMessage from "./models/e-message";

export enum AvailabilityLevel {
    UNKNOWN = "UNKNOWN",
    UNAVAILABLE = "UNAVAILABLE",
    MAYBE = "MAYBE",
    AVAILABLE_LATER = "AVAILABLE_LATER",
    AVAILABLE = "AVAILABLE",
    READY = "READY",
    DONE = "DONE",
}

type AvailabilityColorLevel = Exclude<AvailabilityLevel | "LATE", AvailabilityLevel.AVAILABLE_LATER>;

export const AvailabilityColors: Record<AvailabilityColorLevel, number> = {
    UNKNOWN: 0x7a7a7a,
    UNAVAILABLE: 0xef5a73,
    MAYBE: 0xffac33,
    AVAILABLE: 0x226699,
    READY: 0x2cd261,
    DONE: 0x9241d4,
    LATE: 0xFF7939,
} as const;

export enum EmojiKeys {
    AGREE = "AGREE",
    FIVE_MINUTES = "FIVE_MINUTES",
    FIFTEEN_MINUTES = "FIFTEEN_MINUTES",
    THIRTY_MINUTES = "THIRTY_MINUTES",
    ONE_HOUR = "ONE_HOUR",
    EIGHT_O_CLOCK = "EIGHT_O_CLOCK",
    NINE_O_CLOCK = "NINE_O_CLOCK",
    TEN_O_CLOCK = "TEN_O_CLOCK",
    ELEVEN_O_CLOCK = "ELEVEN_O_CLOCK",
    LATE = "LATE",
}

export enum TimeExtensions {
    TWO_HOURS = "TWO_HOURS",
    TWELVE_O_CLOCK = "TWELVE_O_CLOCK"
}

/**
 * Gets the average color of all statuses
 * @param config Bot config
 * @param statuses List of statuses
 * @param calcAverage If true, averages all of the colors
 * @param currentTime Allows changing the current time
 */
export function getColorFromStatuses(config: Config, statuses: EStatus[], calcAverage = true, currentTime: number = Date.now()): number[] {
    function getAverageColor(colors: number[]): number {
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

    function getWeightedAverageColor(c1: number, c2: number, w: number): number {
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
        if (status.availability === AvailabilityLevel.AVAILABLE_LATER && status.timeAvailable) {
            if (status.timeAvailable < currentTime) {
                colors.push(AvailabilityColors["LATE"]);
            } else {
                const weight = (currentTime - status.creationTimestamp) / (status.timeAvailable - status.creationTimestamp);
                colors.push(getWeightedAverageColor(AvailabilityColors[AvailabilityLevel.MAYBE], AvailabilityColors[AvailabilityLevel.AVAILABLE], weight));
            }
        } else if (status.availability !== AvailabilityLevel.AVAILABLE_LATER) {
            colors.push(AvailabilityColors[status.availability] ?? AvailabilityColors[AvailabilityLevel.UNKNOWN]);
        }
    }

    return calcAverage ? [getAverageColor(colors)] : colors;
}

/**
 * Gets the message for a given status
 * @param status The status
 */
export function getStatusMessage(config: Config, status: EStatus): string {
    function getAvailableLaterStatus() {
        if (!status.timeAvailable) return `${config.availabilityEmojis.UNKNOWN} Unknown`;
        if (status.timeAvailable > Date.now()) {
            return `${config.availabilityEmojis.AVAILABLE_LATER} Available ${discordTimestamp(status.timeAvailable, TimestampFlags.RELATIVE)}`;
        }
        return `${config.availabilityEmojis.LATE} Late as of ${discordTimestamp(status.timeAvailable, TimestampFlags.RELATIVE)}`;
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
 */
export async function getGuildMemberOrUser(client: RedEClient, guildId: Snowflake, userId: Snowflake): Promise<GuildMember | User> {
    const guild = await client.guilds.fetch(guildId);
    const user = await guild.members.fetch(userId);
    if (!user) {
        return await client.users.fetch(userId);
    }
    return user;
}

/**
 * Gets nickname or username for a given user or guild member object
 * @param user User or Guild Member
 */
export function nicknameOrUsername(user: GuildMember | User): string {
    if (user instanceof GuildMember) {
        return user.nickname ?? user.user.username;
    }
    return user.username;
}

/**
 * Converts a Unix timestamp to a moment object in a specified timezone
 * @param unixTimestamp Unix timestamp
 * @param timezone Unix timezone string
 */
export function dateInTimezone(unixTimestamp: number, timezone: string): moment.Moment {
    return moment(unixTimestamp).tz(timezone);
}

/**
 * Formats a Unix timestamp as a string in a specified timezone
 * @param unixTimestamp Unix timestamp
 * @param timezone Unix timezone string
 * @param format String format to use
 */
export function formattedDateInTimezone(unixTimestamp: number, timezone: string, format: string): string {
    return dateInTimezone(unixTimestamp, timezone).format(format);
}

/**
 * Converts a unix timestamp and format flag into a Discord timestamp
 * @param unixTimestamp Unix timestamp
 * @param formatFlag One of `TimestampFlags`
 */
export function discordTimestamp(unixTimestamp: number, formatFlag: TimestampFlags) {
    return `<t:${Math.floor(unixTimestamp / 1000)}:${formatFlag}>`;
}

/**
 * Finds the nearest `hour` o'clock after the current time in the given timezone.
 * @param hour hour to find, between 0 and 23 inclusive
 * @param timezone Unix timezone in which to find the hour
 * @returns Unix timestamp of nearest `hour` o'clock after the current time
 */
export function getNearestHourAfter(hour: number, timezone: string): number {
    const hourTime = moment.tz(`${hour}:00`, [moment.ISO_8601, "HH:mm"], timezone).valueOf();
    if (hourTime > Date.now() + (24 * TimeUnit.HOURS)) {
        return hourTime - (24 * TimeUnit.HOURS);
    } else if (hourTime < Date.now()) {
        return hourTime + (24 * TimeUnit.HOURS);
    }
    return hourTime;
}

export enum TimestampFlags {
    SHORT_TIME = "t",
    LONG_TIME = "T",
    SHORT_DATE = "d",
    LONG_DATE = "D",
    SHORT_DATE_TIME = "f",
    LONG_DATE_TIME = "F",
    RELATIVE = "R",
}

export enum TimeUnit {
    SECONDS = 1000,
    MINUTES = 60 * 1000,
    HOURS = 60 * 60 * 1000,
    DAYS = 24 * 60 * 60 * 1000,
}

export enum EmojiText {
    CHECK_TICK = "<a:check_tick:747247710373019738>",
    X_MARK = ":x:",
}

/**
 * Creates a chart representing the statuses in this EMessage
 * @param emessage The message to turn into a chart
 * @param client The bot client
 */
export async function createChart(emessage: EMessage, client: RedEClient): Promise<AttachmentBuilder> {
    const userIds = Object.keys(emessage.statuses);
    const tz = client.state.getGuildPreference(emessage.guildId, "defaultTimezone", client.config.defaultTimezone);
    const labels = [];
    for (const userId of userIds) {
        labels.push(nicknameOrUsername(await getGuildMemberOrUser(client, emessage.guildId, userId)));
    }

    const MSECS_PER_MIN: number = TimeUnit.MINUTES;
    const startingTime = new Date(emessage.statusLog[0].creationTimestamp);
    startingTime.setMilliseconds(0);
    startingTime.setSeconds(0);
    const datasets = [];
    const lastStatus = <Record<Snowflake, EStatus>>Object.fromEntries(userIds.map(u => [u, { userId: u, availability: AvailabilityLevel.UNKNOWN, creationTimestamp: startingTime.valueOf() }]));
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
            backgroundColor: getColorFromStatuses(client.config, userIds.map(u => lastStatus[u]), false, timestep).map(n => "#" + n.toString(16)),
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
                        callback: function (value: number, index: any, values: any): string {
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

    const width = 1920;
    const height = 1080;
    const canvas = new ChartJSNodeCanvas({
        width, height, plugins: {
            modern: [{
                beforeDraw: (chart: any) => {
                    const ctx = chart.ctx;
                    ctx.save();
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                },
            }],
        },
    });

    return new AttachmentBuilder(
        await canvas.renderToBuffer(chartOptions),
        {
            name: "echart.png",
            description: "A chart showing who was available over time",
        },
    );
}