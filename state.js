const fs = require("fs");
const EMessage = require("./models/e-message");

/**
 * @typedef {import('discord.js').Snowflake} Snowflake
 */

class ClientState {
    /**
     * Creates a new `ClientState`
     * @param {Map<Snowflake, Map<Snowflake, EMessage>} emessages `EMessage`s for all channels
     */
    constructor(emessages) {
        /**
         * The `EMessage`s for all channels
         * @type {Map<Snowflake, Map<Snowflake, EMessage>}
         */
        this.EMessages = emessages ?? {};
    }

    static load() {
        let json = {};
        if (fs.existsSync("state.json")) {
            json = JSON.parse(fs.readFileSync("state.json"));
        }

        return new ClientState(
            json.EMessages,
        );
    }

    save() {
        const json = JSON.stringify(this);
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
        this.EMessages[guildId][channelId] = emessage;
        this.save();
    }

    /**
     * Gets all `EMessage`s
     * @returns {EMessage[]}
     */
    getAllEMessages() {
        const emessages = [];
        for (const guildId in (this.EMessages ?? [])) {
            for (const channelId in (this.EMessages?.[guildId] ?? [])) {
                emessages.push(this.getEMessage(guildId, channelId));
            }
        }
        return emessages;
    }
}

module.exports = ClientState;