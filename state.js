const fs = require("fs");
// eslint-disable-next-line no-unused-vars
const EMessage = require("./models/e-message");

class ClientState {
    /**
     * Creates a new `ClientState`
     * @param {Map<string, Map<string, EMessage>} emessages `EMessage`s for all channels
     */
    constructor(emessages) {
        /**
         * The `EMessage`s for all channels
         * @type {Map<string, Map<string, EMessage>}
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
     * @param {string} guildId The guild that contains the channel
     * @param {string} channelId The channel whose EMessage to lookup
     * @returns {EMessage} The `EMessage` associated with that guild and channel, or `undefined`
     */
    getEMessage(guildId, channelId) {
        const message = this.EMessages?.[guildId]?.[channelId];
        return message ? EMessage.fromJSON(message) : undefined;
    }

    /**
     * Sets the `EMessage` associated with the guild and channel, and saves state
     * @param {string} guildId The guild that contains the channel
     * @param {string} channelId The channel whose EMessage to update
     * @param {EMessage} emessage The `EMessage` to associate with that guild and channel
     */
    setEMessage(guildId, channelId, emessage) {
        this.EMessages[guildId] = this.EMessages[guildId] ?? {};
        this.EMessages[guildId][channelId] = emessage;
        this.save();
    }
}

module.exports = ClientState;