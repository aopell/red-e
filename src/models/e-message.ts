import { EmbedBuilder, ActionRowBuilder, ButtonBuilder } from "discord.js";
import { getGuildMemberOrUser, discordTimestamp, getStatusMessage, getColorFromStatuses, AvailabilityLevel, EmojiKeys, TimeUnit, TimestampFlags } from "../util";
import EStatus from "./e-status";

import type { RedEClient } from "../typedefs";
import { TextChannel, Snowflake } from "discord.js";
import { ButtonStyle } from "discord.js";

export default class EMessage {
    creatorId: Snowflake;
    channelId: Snowflake;
    guildId: Snowflake;
    messageIds: Snowflake[];
    statusLog: EStatus[];
    statuses: Record<string, number>;
    creationTimestamp: number;
    lastUpdated: number;

    /**
     * Creates a new `EMessage`
     * @param creatorId ID of the message creator
     * @param channelId ID of the channel where the message was created
     * @param guildId ID of the guild where the message was created
     * @param senderStatus Initial status for the message creator
     */
    constructor(creatorId: Snowflake, channelId: Snowflake, guildId: Snowflake, senderStatus?: EStatus) {
        this.creatorId = creatorId;
        this.channelId = channelId;
        this.guildId = guildId;
        this.messageIds = [];
        this.statusLog = senderStatus ? [senderStatus] : [];
        this.statuses = { [creatorId]: 0 };
        this.creationTimestamp = Date.now();
        this.lastUpdated = Date.now();
    }

    /**
     * Creates an `EMessage` from a JSON object
     * @param obj The object to deserialize
     */
    static fromJSON(obj: any): EMessage {
        const emessage = new EMessage(obj.creatorId, obj.channelId, obj.guildId);
        emessage.messageIds = obj.messageIds;
        emessage.statusLog = obj.statusLog.map((s: any) => EStatus.fromJSON(s));
        emessage.statuses = obj.statuses;
        emessage.creationTimestamp = obj.creationTimestamp;
        emessage.lastUpdated = obj.lastUpdated;
        return emessage;
    }

    get proposedTime(): number | undefined {
        const creatorStatus = this.getStatus(this.creatorId);
        return creatorStatus?.timeAvailable ?? creatorStatus?.creationTimestamp;
    }

    /**
     * Gets the most recent status of a given user
     * @param userId ID of the user to get status of
     */
    getStatus(userId: Snowflake): EStatus | undefined {
        const logIndex = this.statuses[userId];
        if (logIndex === undefined) {
            return undefined;
        }
        return this.statusLog[logIndex];
    }

    /**
     * Updates the status for the provided user with the given status
     * @param client The bot client
     * @param userId ID of the user whose status to update
     * @param status the new status for that user
     * @param updateRoles whether or not to update the availability role's members
     */
    updateStatus(client: RedEClient, userId: Snowflake, status: EStatus, updateRoles = true): EStatus {
        const newLength = this.statusLog.push(status);
        this.statuses[userId] = newLength - 1;
        this.lastUpdated = Date.now();
        client.state.setEMessage(this.guildId, this.channelId, this);
        if (updateRoles) this.updateAvailabilityRole(client);
        return status;
    }

    /**
     * Updates the guild's availability role, if it exists
     * @param client The bot client
     */
    async updateAvailabilityRole(client: RedEClient) {
        const roleId = client.state.getGuildPreference(this.guildId, "availabilityRole", null);
        if (!roleId) {
            return;
        }
        const guild = await client.guilds.fetch(this.guildId);
        const role = await guild.roles.fetch(roleId);

        if (role === null) {
            console.warn(`Couldn't update availability role ${roleId}: Role not found`);
            return;
        }

        const memberIds = (await guild.members.list({ limit: 500 })).map(u => u.id);

        const availableRoles = [AvailabilityLevel.AVAILABLE, AvailabilityLevel.AVAILABLE_LATER, AvailabilityLevel.MAYBE, AvailabilityLevel.READY, AvailabilityLevel.DONE];

        for (const userId of memberIds) {
            const status = this.getStatus(userId);
            const member = await guild.members.fetch(userId);
            if (status && availableRoles.includes(status.availability)) {
                member.roles.add(role);
            } else {
                member.roles.remove(role);
            }
        }
    }

    /**
     * Pings any late users
     * @param client The bot client
     */
    async pingLateUsers(client: RedEClient) {
        for (const userId in this.statuses) {
            const status = this.getStatus(userId);
            if (
                status
                && status.availability == AvailabilityLevel.AVAILABLE_LATER
                && status.reminderCount < client.config.latePings.length
                && status.timeAvailable
                && status.timeAvailable + (client.config.latePings[status.reminderCount] * TimeUnit.MINUTES) < Date.now()
            ) {
                status.reminderCount += 1;
                const channel = await client.channels.fetch(this.channelId);
                const msg = client.config.lateMessages[Math.floor(Math.random() * client.config.lateMessages.length)];

                const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`|REMINDER|${userId}|${AvailabilityLevel.AVAILABLE}`)
                            .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.AVAILABLE])
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`|REMINDER|${userId}|${EmojiKeys.FIVE_MINUTES}`)
                            .setEmoji(client.config.availabilityEmojis[EmojiKeys.FIVE_MINUTES])
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`|REMINDER|${userId}|${EmojiKeys.FIFTEEN_MINUTES}`)
                            .setEmoji(client.config.availabilityEmojis[EmojiKeys.FIFTEEN_MINUTES])
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`|REMINDER|${userId}|${AvailabilityLevel.MAYBE}`)
                            .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.MAYBE])
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`|REMINDER|${userId}|${AvailabilityLevel.UNAVAILABLE}`)
                            .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.UNAVAILABLE])
                            .setStyle(ButtonStyle.Danger),
                    );

                if (channel instanceof TextChannel) {
                    const avatar = client.config?.avatoji?.[userId] ?? client.config?.avatoji?.default ?? "❓";
                    channel.send({ content: msg.replace("{@}", `${avatar} <@${userId}>`), components: [buttonsRow] });
                } else {
                    console.warn(`Couldn't send reminder message to ${this.channelId}: Not a text channel`);
                }
            }
        }

        client.state.setEMessage(this.guildId, this.channelId, this);
    }

    /**
     * Updates all Discord messages associated with this EMessage
     * @param client The bot client
     * @param removeControls Whether to remove controls from the messages
     */
    async updateAllMessages(client: RedEClient, removeControls = false) {
        const messageObj = await this.toMessage(client, removeControls);
        const channel = await client.channels.fetch(this.channelId);
        for (const messageId of this.messageIds) {
            if (channel instanceof TextChannel) {
                channel.messages.edit(messageId, messageObj).catch(err => {
                    console.warn(`Couldn't update message ${messageId}: ${err}`);
                });
            } else {
                console.warn(`Couldn't update message ${messageId}: Not a text channel`);
            }
        }
    }

    /**
     * Gets a message object from this EMessage
     * @param client The bot client
     * @param removeControls Whether to remove controls from this message
     */
    async toMessage(client: RedEClient, removeControls = false) {
        const user = await getGuildMemberOrUser(client, this.guildId, this.creatorId);
        const ownerAvatar = client.config?.avatoji?.[this.creatorId] ?? client.config?.avatoji?.default ?? "❓";
        const embed = new EmbedBuilder()
            .setTitle("Are you red-e?")
            .setDescription(`${ownerAvatar} <@${user.id}> is red-e${this.proposedTime ? " " + discordTimestamp(this.proposedTime, TimestampFlags.RELATIVE) : ""}`);

        const currentStatuses: EStatus[] = [];
        for (const userId in this.statuses) {
            const name = `<@${userId}>`;
            const avatar = client.config?.avatoji?.[userId] ?? client.config?.avatoji?.default ?? "❓";
            const s = this.getStatus(userId);
            if (s) {
                currentStatuses.push(s);

                embed.setDescription(`${embed.data.description}\n\n**${avatar} ${name}**\n${getStatusMessage(client.config, s)}`);
            }
        }

        embed.setColor(getColorFromStatuses(client.config, currentStatuses)[0]);
        embed.setFooter({ text: "Last Updated" });
        embed.setTimestamp(Date.now());

        const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(AvailabilityLevel.AVAILABLE)
                    .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.AVAILABLE])
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.AGREE)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.AGREE])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(AvailabilityLevel.MAYBE)
                    .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.MAYBE])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(AvailabilityLevel.UNAVAILABLE)
                    .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.UNAVAILABLE])
                    .setStyle(ButtonStyle.Danger),
            );

        const addTimeButtonsRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.FIVE_MINUTES)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.FIVE_MINUTES])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.FIFTEEN_MINUTES)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.FIFTEEN_MINUTES])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.THIRTY_MINUTES)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.THIRTY_MINUTES])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.ONE_HOUR)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.ONE_HOUR])
                    .setStyle(ButtonStyle.Secondary),
            );

        const hourButtons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.EIGHT_O_CLOCK)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.EIGHT_O_CLOCK])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.NINE_O_CLOCK)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.NINE_O_CLOCK])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.TEN_O_CLOCK)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.TEN_O_CLOCK])
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(EmojiKeys.ELEVEN_O_CLOCK)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.ELEVEN_O_CLOCK])
                    .setStyle(ButtonStyle.Secondary),
            );


        const returnValue = {
            embeds: [embed],
            components: [buttonsRow, addTimeButtonsRow, hourButtons],
        };

        if (removeControls || this.creationTimestamp < Date.now() - ((client.config.expirationHours ?? 12) * TimeUnit.HOURS)) {
            returnValue.components = [];
            embed.setFooter({ text: "This messsage was archived" });
        }

        return returnValue;
    }
}