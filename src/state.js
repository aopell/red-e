const fs = require("fs");
const EMessage = require("./models/e-message");
const GuildPreferences = require("./models/guild-preferences");

/**
 * @typedef {import('discord.js').Snowflake} Snowflake
 */

class ClientState {
    /**
     * Creates a new `ClientState`
     * @param {Map<Snowflake, Map<Snowflake, EMessage>} emessages `EMessage`s for all channels
     * @param {Map<Snowflake, GuildPreferences} guildPreferences `GuildPreferences` for all guilds
     */
    constructor(emessages, guildPreferences) {
        /**
         * The `EMessage`s for all channels
         * @type {Map<Snowflake, Map<Snowflake, EMessage>}
         */
        this.EMessages = emessages ?? {};
        /**
         * The `GuildPreferences` for all guilds
         * @type {Map<Snowflake, GuildPreferences}
         */
        this.GuildPreferences = guildPreferences ?? {};
    }

    static load() {
        let json = {};
        if (fs.existsSync("state.json")) {
            json = JSON.parse(fs.readFileSync("state.json"));
        }

        return new ClientState(
            json.EMessages,
            json.GuildPreferences,
        );
    }

    save() {
        const json = JSON.stringify(this, null, 4);
        fs.writeFileSync("state.json", json);
    }

    /**
     * Gets the `EMessage` associated with the guild and channel
     * @param {Snowflake} guildId The guild that contains the channel
     * @param {Snowflake} channelId The channel whose EMessage to lookup
     * @returns {EMessage} The `EMessage` associated with that guild and channel, or `undefined`
     */
    getEMessage(guildId, channelId) {
        const message = this.EMessages?.[guildId]?.[channelId];
        return message ? EMessage.fromJSON(message) : undefined;
    }

    /**
     * Sets the `EMessage` associated with the guild and channel, and saves state
     * @param {Snowflake} guildId The guild that contains the channel
     * @param {Snowflake} channelId The channel whose EMessage to update
     * @param {EMessage} emessage The `EMessage` to associate with that guild and channel
     */
    setEMessage(guildId, channelId, emessage) {
        this.EMessages[guildId] = this.EMessages[guildId] ?? {};

        const existing = this.EMessages[guildId][channelId];
        if (!emessage && existing) {
            fs.mkdirSync(`logs/messages/${guildId}/${channelId}`, { recursive: true });
            fs.writeFileSync(`logs/messages/${guildId}/${channelId}/${existing.creationTimestamp}.json`, JSON.stringify(existing));
        }

        this.EMessages[guildId][channelId] = emessage;
        this.save();
    }

    /**
     * Gets all `EMessage`s in a guild
     * @param {Snowflake} guildId The guild to get `EMessage`s for
     * @returns {EMessage[]}
     */
    getAllGuildEMessages(guildId) {
        const emessages = [];
        for (const channelId in (this.EMessages?.[guildId] ?? [])) {
            const emessage = this.getEMessage(guildId, channelId);
            if (emessage) {
                emessages.push(emessage);
            }
        }
        return emessages;
    }

    /**
     * Gets all `EMessage`s
     * @returns {EMessage[]}
     */
    getAllEMessages() {
        const emessages = [];
        for (const guildId in (this.EMessages ?? [])) {
            emessages.push(...this.getAllGuildEMessages(guildId));
        }
        return emessages;
    }

    /**
     * Gets the preference for the guild if it exists
     * @param {Snowflake} guildId The guild from which to fetch a preference
     * @param {string} pref The preference to fetch
     * @param {any} [fallback] A fallback value if the preference doesn't exist
     * @returns {any}
     */
    getGuildPreference(guildId, pref, fallback = undefined) {
        const guildPref = this.GuildPreferences?.[guildId]?.[pref];
        return guildPref ?? fallback;
    }

    /**
     * Gets the specified preference for all guilds
     * @param {string} pref The preference to fetch
     * @param {any} [fallback] A fallback value if the preference doesn't exist
     * @returns {Map<Snowflake, any>} Map of guild ID to the preference value
     */
    getAllGuildsPreference(pref, fallback = undefined) {
        const allPrefs = {};
        for (const guildId in this.GuildPreferences) {
            allPrefs[guildId] = this.getGuildPreference(guildId, pref, fallback);
        }
        return allPrefs;
    }

    /**
     * Sets the preference for a guild, and saves state
     * @param {Snowflake} guildId The guild for which to set a preference
     * @param {string} pref The preference to set
     * @param {any} value The value to set for the preference
     */
    setGuildPreference(guildId, pref, value) {
        let guildPrefs = this.GuildPreferences[guildId];
        if (!guildPrefs) {
            this.GuildPreferences[guildId] = new GuildPreferences(guildId);
            guildPrefs = this.GuildPreferences[guildId];
        }
        guildPrefs[pref] = value;
        this.save();
    }
}

module.exports = ClientState;