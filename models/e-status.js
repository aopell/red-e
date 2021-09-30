class EStatus {
    /**
     * Creates a new `EStatus`
     * @param {string} availability The availability level of this status update
     * @param {number} [timeAvailable] Time at which the status holder will be available
     */
    constructor(availability, timeAvailable = undefined) {
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
        estatus.availability = obj.availability;
        estatus.timeAvailable = obj.timeAvailable;
        estatus.reminderCount = obj.reminderCount;
        estatus.creationTimestamp = obj.creationTimestamp;
        return estatus;
    }
}

module.exports = EStatus;