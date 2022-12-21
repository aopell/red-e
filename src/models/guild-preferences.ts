import { defaultTimezone } from "../config.json";
import type { Snowflake } from "discord.js";


export default class GuildPreferences {
    guildId?: Snowflake;
    voiceChannels: Snowflake[];
    defaultTimezone: string;
    availabilityRole: Snowflake | null;

    /**
     * Creates a new `GuildPreferences`
     * @param guildId The guild ID associated with these preferences
     */
    constructor(guildId?: Snowflake) {
        this.guildId = guildId;
        this.voiceChannels = [];
        this.defaultTimezone = defaultTimezone;
        this.availabilityRole = null;
    }

    /**
     * Creates a `GuildPreferences` from a JSON object
     * @param obj The object to deserialize
     */
    static fromJSON(obj: any): GuildPreferences {
        const gprefs = new GuildPreferences();
        gprefs.guildId = obj.guildId;
        gprefs.voiceChannels = obj.voiceChannels;
        gprefs.defaultTimezone = obj.defaultTimezone;
        return gprefs;
    }
}