const { Embed } = require("@discordjs/builders");
const ClientState = require("../state");
const { nicknameOrUsername, getGuildMemberOrUser, discordTimestamp, getStatusMessage, getColorFromStatuses } = require("../util");
const EStatus = require("./e-status");

class EMessage {
    /**
     * Creates a new `EMessage`
     * @param {string} creatorId ID of the message creator
     * @param {string} channelId ID of the channel where the message was created
     * @param {string} guildId ID of the guild where the message was created
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
        return this.getStatus(this.creatorId)?.creationTimestamp;
    }

    /**
     * Gets the most recent status of a given user
     * @param {string} userId ID of the user to get status of
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
     * @param {string} userId ID of the user whose status to update
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

    toMessage(client) {
        const user = getGuildMemberOrUser(client, this.guildId, this.creatorId);
        const embed = new Embed()
            .setTitle("eeee?")
            .setDescription(`${nicknameOrUsername(user)} proposes that we eeee${this.proposedTime ? " " + discordTimestamp(this.proposedTime, "R") : ""}`);

        const currentStatuses = [];
        for (const userId in this.statuses) {
            const name = nicknameOrUsername(getGuildMemberOrUser(client, this.guildId, userId));
            const avatar = client.config?.avatoji?.[userId] ?? client.config?.avatoji?.default ?? "❓";
            const s = this.getStatus(userId);
            currentStatuses.push(s);
            embed.addField({ name: `${avatar} ${name}`, value: getStatusMessage(client.config, s) });
        }

        embed.setColor(getColorFromStatuses(client.config, currentStatuses));
        embed.setFooter({ text: "Last Updated" });
        embed.setTimestamp(Date.now());

        return {
            embeds: [embed],
            // components: [buttonsRow, selectRow],
        };
    }
}

module.exports = EMessage;