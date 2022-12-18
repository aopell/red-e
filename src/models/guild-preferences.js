const config = require("../config.json");

/**
 * @typedef {import('discord.js').Snowflake} Snowflake
 */

class GuildPreferences {
    /**
     * Creates a new `GuildPreferences`
     * @param {Snowflake} guildId The guild ID associated with these preferences
     */
    constructor(guildId) {
        /**
         * @type {Snowflake}
         */
        this.guildId = guildId;
        /**
         * @type {Snowflake[]}
         */
        this.voiceChannels = [];
        /**
         * @type {string}
         */
        this.defaultTimezone = config.defaultTimezone;
        /**
         * @type {Snowflake}
         */
        this.availabilityRole = null;
    }

    /**
     * Creates a `GuildPreferences` from a JSON object
     * @param {object} obj The object to deserialize
     * @returns {GuildPreferences}
     */
    static fromJSON(obj) {
        const gprefs = new GuildPreferences();
        gprefs.guildId = obj.guildId;
        gprefs.voiceChannels = obj.voiceChannels;
        gprefs.defaultTimezone = obj.defaultTimezone;
        return gprefs;
    }
}

module.exports = GuildPreferences;