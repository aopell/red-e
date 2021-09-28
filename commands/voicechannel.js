const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmojiText } = require("../util");

/**
 * @typedef {import('../typedefs').Client} Client
 * @typedef {import('discord.js').CommandInteraction} CommandInteraction
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName("voicechannel")
        .setDescription("Adds or removes tracking for a voice channel")
        .addStringOption(option =>
            option
                .setName("action")
                .setDescription("Action to take with the voice channel")
                .setRequired(true)
                .addChoice("track", "track")
                .addChoice("remove", "remove"),
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("The voice channel to act upon")
                .setRequired(true),
        ),


    /**
     * Executes the command
     * @param {Client} client The current client
     * @param {CommandInteraction} interaction The interaction object
     */
    async execute(client, interaction) {
        const trackedChannels = client.state.getGuildPreference(interaction.guildId, "voiceChannels", []);
        const channel = interaction.options.getChannel("channel");
        if (!channel.isVoice()) {
            interaction.reply({ content: `${EmojiText.X_MARK} Please select a voice channel`, ephemeral: true });
            return;
        }

        switch (interaction.options.get("action").value) {
            case "track":
                if (trackedChannels.includes(channel.id)) {
                    interaction.reply({ content: `${EmojiText.X_MARK} That channel is already tracked`, ephemeral: true });
                    return;
                }
                trackedChannels.push(channel.id);
                break;
            case "remove":
                if (!trackedChannels.includes(channel.id)) {
                    interaction.reply({ content: `${EmojiText.X_MARK} That channel is not being tracked`, ephemeral: true });
                    return;
                }
                trackedChannels.splice(trackedChannels.indexOf(channel.id), 1);
                break;
            default:
                interaction.reply({ content: `${EmojiText.X_MARK} Not a valid option`, ephemeral: true });
                break;
        }

        client.state.setGuildPreference(interaction.guildId, "voiceChanneels", trackedChannels);
        interaction.reply({ content: `${EmojiText.CHECK_TICK} Voice channel tracking updated successfully`, ephemeral: true });
    },
};