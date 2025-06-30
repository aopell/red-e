import { defaultTimezone } from "../config.json";
import type { Snowflake } from "discord.js";


export default class UserPreferences {
    userId?: Snowflake;
    timezone?: string;

    /**
     * Creates a new `GuildPreferences`
     * @param guildId The guild ID associated with these preferences
     */
    constructor(userId?: Snowflake) {
        this.userId = userId;
    }

    /**
     * Creates a `GuildPreferences` from a JSON object
     * @param obj The object to deserialize
     */
    static fromJSON(obj: any): UserPreferences {
        const uprefs = new UserPreferences();
        uprefs.userId = obj.userId;
        uprefs.timezone = obj.timezone;
        return uprefs;
    }
}