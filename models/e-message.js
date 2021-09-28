const { Embed } = require("@discordjs/builders");
const { MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const { nicknameOrUsername, getGuildMemberOrUser, discordTimestamp, getStatusMessage, getColorFromStatuses, AvailabilityLevel, EmojiKeys, formattedDateInTimezone, TimeUnit } = require("../util");
const EStatus = require("./e-status");

/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').TextChannel} TextChannel
 * @typedef {import('discord.js').Snowflake} Snowflake
 * @typedef {import('../state')} ClientState
 */

class EMessage {
    /**
     * Creates a new `EMessage`
     * @param {Snowflake} creatorId ID of the message creator
     * @param {Snowflake} channelId ID of the channel where the message was created
     * @param {Snowflake} guildId ID of the guild where the message was created
     * @param {EStatus} senderStatus Initial status for the message creator
     */
    constructor(creatorId, channelId, guildId, senderStatus) {
        this.creatorId = creatorId;
        this.channelId = channelId;
        this.guildId = guildId;
        this.messageIds = [];
        this.statusLog = [senderStatus];
        this.statuses = { [creatorId]: 0 };
        this.creationTimestamp = Date.now();
        this.lastUpdated = Date.now();
    }

    /**
     * Creates an `EMessage` from a JSON object
     * @param {object} obj The object to deserialize
     * @returns {EMessage}
     */
    static fromJSON(obj) {
        const emessage = new EMessage();
        emessage.creatorId = obj.creatorId;
        emessage.channelId = obj.channelId;
        emessage.guildId = obj.guildId;
        emessage.messageIds = obj.messageIds;
        emessage.statusLog = obj.statusLog.map(s => EStatus.fromJSON(s));
        emessage.statuses = obj.statuses;
        emessage.creationTimestamp = obj.creationTimestamp;
        emessage.lastUpdated = obj.lastUpdated;
        return emessage;
    }

    get proposedTime() {
        const creatorStatus = this.getStatus(this.creatorId);
        return creatorStatus?.timeAvailable ?? creatorStatus?.creationTimestamp;
    }

    /**
     * Gets the most recent status of a given user
     * @param {Snowflake} userId ID of the user to get status of
     * @returns {EStatus} the status of the requested user, or undefined
     */
    getStatus(userId) {
        const logIndex = this.statuses[userId];
        if (logIndex === undefined) {
            return undefined;
        }
        return this.statusLog[logIndex];
    }

    /**
     * Updates the status for the provided user with the given status
     * @param {ClientState} state The current client state
     * @param {Snowflake} userId ID of the user whose status to update
     * @param {EStatus} status the new status for that user
     * @returns {number} The index of the new status in the status log
     */
    updateStatus(state, userId, status) {
        const newLength = this.statusLog.push(status);
        this.statuses[userId] = newLength - 1;
        this.lastUpdated = Date.now();
        state.setEMessage(this.guildId, this.channelId, this);
        return newLength - 1;
    }

    /**
     * Updates all Discord messages associated with this EMessage
     * @param {Client} client The bot client
     * @param {boolean} [removeControls] Whether to remove controls from the messages
     */
    async updateAllMessages(client, removeControls = false) {
        const messageObj = await this.toMessage(client, removeControls);
        /**
         * @type {TextChannel}
         */
        const channel = await client.channels.fetch(this.channelId);
        for (const messageId of this.messageIds) {
            channel.messages.edit(messageId, messageObj).catch(err => {
                console.warn(`Couldn't update message ${messageId}: ${err}`);
            });
        }
    }

    /**
     * Gets a message object from this EMessage
     * @param {Client} client The bot client
     * @param {boolean} [removeControls] Whether to remove controls from this message
     * @returns {object}
     */
    async toMessage(client, removeControls = false) {
        const user = await getGuildMemberOrUser(client, this.guildId, this.creatorId);
        const embed = new Embed()
            .setTitle("eeee?")
            .setDescription(`${nicknameOrUsername(user)} propose${this.proposedTime && this.proposedTime >= Date.now() ? "s" : "d"} that we eeee${this.proposedTime ? " " + discordTimestamp(this.proposedTime, "R") : ""}`);

        const currentStatuses = [];
        for (const userId in this.statuses) {
            const name = nicknameOrUsername(await getGuildMemberOrUser(client, this.guildId, userId));
            const avatar = client.config?.avatoji?.[userId] ?? client.config?.avatoji?.default ?? "❓";
            const s = this.getStatus(userId);
            currentStatuses.push(s);
            embed.addField({ name: `${avatar} ${name}`, value: getStatusMessage(client.config, s) });
        }

        embed.setColor(getColorFromStatuses(client.config, currentStatuses));
        embed.setFooter({ text: "Last Updated" });
        embed.setTimestamp(Date.now());

        const buttonsRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(AvailabilityLevel.AVAILABLE)
                    .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.AVAILABLE])
                    .setStyle("SUCCESS"),
                new MessageButton()
                    .setCustomId(EmojiKeys.AGREE)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.AGREE])
                    .setStyle("PRIMARY"),
                new MessageButton()
                    .setCustomId(AvailabilityLevel.MAYBE)
                    .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.MAYBE])
                    .setStyle("SECONDARY"),
                new MessageButton()
                    .setCustomId(AvailabilityLevel.UNAVAILABLE)
                    .setEmoji(client.config.availabilityEmojis[AvailabilityLevel.UNAVAILABLE])
                    .setStyle("DANGER"),
            );

        const addTimeButtonsRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(EmojiKeys.FIVE_MINUTES)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.FIVE_MINUTES])
                    .setStyle("SECONDARY"),
                new MessageButton()
                    .setCustomId(EmojiKeys.FIFTEEN_MINUTES)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.FIFTEEN_MINUTES])
                    .setStyle("SECONDARY"),
                new MessageButton()
                    .setCustomId(EmojiKeys.ONE_HOUR)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.ONE_HOUR])
                    .setStyle("SECONDARY"),
                new MessageButton()
                    .setCustomId(EmojiKeys.TWO_HOURS)
                    .setEmoji(client.config.availabilityEmojis[EmojiKeys.TWO_HOURS])
                    .setStyle("SECONDARY"),
            );

        const timezoneName = formattedDateInTimezone(Date.now(), client.config.defaultTimezone, "z");

        const selectRow = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId("AVAILABILITY_SELECT")
                    .setPlaceholder("What time will you be available?")
                    .addOptions([
                        {
                            label: `10:00 PM ${timezoneName}`,
                            emoji: client.config.availabilityEmojis[EmojiKeys.TEN_O_CLOCK],
                            value: EmojiKeys.TEN_O_CLOCK,
                        },
                        {
                            label: `11:00 PM ${timezoneName}`,
                            emoji: client.config.availabilityEmojis[EmojiKeys.ELEVEN_O_CLOCK],
                            value: EmojiKeys.ELEVEN_O_CLOCK,
                        },
                        {
                            label: `12:00 AM ${timezoneName}`,
                            emoji: client.config.availabilityEmojis[EmojiKeys.TWELVE_O_CLOCK],
                            value: EmojiKeys.TWELVE_O_CLOCK,
                        },
                    ]),
            );

        const returnValue = {
            embeds: [embed],
            components: [buttonsRow, addTimeButtonsRow, selectRow],
        };

        if (removeControls || this.creationTimestamp < Date.now() - ((client.config.expirationHours ?? 12) * TimeUnit.HOURS)) {
            returnValue.components = [];
            embed.setFooter({ text: "This messsage was archived" });
        }

        return returnValue;
    }
}

module.exports = EMessage;