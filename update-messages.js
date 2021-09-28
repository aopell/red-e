/**
 * @typedef {import('./typedefs').Client} Client
 * @typedef {import('discord.js').CommandInteraction} Interaction
 */

const { TimeUnit } = require("./util");

/**
 * Updates the message
 * @param {Client} client The bot client
 */
async function updateMessages(client) {
    for (const emessage of client.state.getAllEMessages()) {
        emessage.updateAllMessages(client);

        if (emessage.creationTimestamp < Date.now() - ((client.config.expirationHours ?? 12) * TimeUnit.HOURS)) {
            client.state.setEMessage(emessage.guildId, emessage.channelId, undefined);
        }
    }
}

module.exports = { updateMessages };