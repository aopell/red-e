import type { AvailabilityLevel } from "src/util";

export default class EStatus {
    userId: string;
    availability: AvailabilityLevel;
    timeAvailable?: number;
    reminderCount: number;
    creationTimestamp: number;

    /**
     * Creates a new `EStatus`
     * @param userId The ID of the user this status belongs to
     * @param availability The availability level of this status update
     * @param timeAvailable Time at which the status holder will be available
     */
    constructor(userId: string, availability: AvailabilityLevel, timeAvailable?: number) {
        this.userId = userId;
        this.availability = availability;
        this.timeAvailable = timeAvailable;
        this.reminderCount = 0;
        this.creationTimestamp = Date.now();
    }

    /**
     * Creates an `EStatus` from a JSON object
     * @param obj The object to deserialize
     */
    static fromJSON(obj: any): EStatus {
        const estatus = new EStatus(obj.userId, obj.availability, obj.timeAvailable);
        estatus.reminderCount = obj.reminderCount;
        estatus.creationTimestamp = obj.creationTimestamp;
        return estatus;
    }
}