const EStatus = require("./e-status");

class EMessage {
    /**
     * Creates a new EMessage
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
        this.statuses = { creatorId: 0 };
        this.creationTimestamp = Date.now();
    }

    /**
     * Creates an EMessage from a JSON object
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
        return emessage;
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
     * @param {string} userId ID of the user whose status to update
     * @param {EStatus} status the new status for that user
     * @returns {number} The index of the new status in the status log
     */
    updateStatus(userId, status) {
        const newLength = this.statusLog.push(status);
        this.statuses[userId] = newLength - 1;
        return newLength - 1;
    }
}

module.exports = EMessage;