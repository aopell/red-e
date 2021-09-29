/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').VoiceState} VoiceState
 */

const EStatus = require('../models/e-status');
const { AvailabilityLevel } = require('../util');

module.exports = {
    name: "voiceStateUpdate",
    once: false,
    /**
     * Handles voice state update events
     * @param {Client} client The bot client
     * @param {VoiceState} oldState Old voice state
     * @param {VoiceState} newState New voice state
     */
    async execute(client, oldState, newState) {
        const guildId = oldState.guild.id;
        const userId = oldState.id;
        const prevChannel = oldState.channelId;
        const newChannel = newState.channelId;
        const trackedChannels = client.state.getGuildPreference(guildId, "voiceChannels", []);
        const prevTracked = trackedChannels.includes(prevChannel);
        const newTracked = trackedChannels.includes(newChannel);
        const guildEMessages = client.state.getAllGuildEMessages(guildId);

        if (prevTracked && newTracked) {
            // switching channels
            // do nothing
        } else if (newTracked) {
            // joining channel
            for (const emessage of guildEMessages) {
                emessage.updateStatus(client, userId, new EStatus(AvailabilityLevel.READY), false);
                emessage.updateAllMessages(client);
            }
        } else if (prevTracked) {
            // leaving channel
            for (const emessage of guildEMessages) {
                emessage.updateStatus(client, userId, new EStatus(AvailabilityLevel.DONE), false);
                emessage.updateAllMessages(client);
            }
        }
    },
};