/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').VoiceState} VoiceState
 */

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
        console.log("Voice state changed");
        console.log(JSON.stringify(oldState));
        console.log(JSON.stringify(newState));
    },
};