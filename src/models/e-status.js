class EStatus {
    /**
     * Creates a new `EStatus`
     * @param {string} userId The ID of the user this status belongs to
     * @param {string} availability The availability level of this status update
     * @param {number} [timeAvailable] Time at which the status holder will be available
     */
    constructor(userId, availability, timeAvailable = undefined) {
        this.userId = userId;
        this.availability = availability;
        this.timeAvailable = timeAvailable;
        this.reminderCount = timeAvailable ? 0 : undefined;
        this.creationTimestamp = Date.now();
    }

    /**
     * Creates an `EStatus` from a JSON object
     * @param {object} obj The object to deserialize
     * @returns {EStatus}
     */
    static fromJSON(obj) {
        const estatus = new EStatus();
        estatus.userId = obj.userId;
        estatus.availability = obj.availability;
        estatus.timeAvailable = obj.timeAvailable;
        estatus.reminderCount = obj.reminderCount;
        estatus.creationTimestamp = obj.creationTimestamp;
        return estatus;
    }
}

module.exports = EStatus;