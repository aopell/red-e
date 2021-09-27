const { SlashCommandBuilder } = require("@discordjs/builders");
const EMessage = require("../models/e-message");
const EStatus = require("../models/e-status");
// eslint-disable-next-line no-unused-vars
const ClientState = require("../state");
const { AvailabilityLevel } = require("../util");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("e")
        .setDescription("Shows the current E status"),

    /**
     * Executes the command
     * @param {object} client The current client
     * @param {ClientState} state The current client state
     * @param {object} interaction The interaction object
     */
    async execute(client, state, interaction) {
        const { channelId, guildId, user } = interaction;
        // await interaction.reply({ content: "EEEE" });
        let emessage = state.getEMessage(guildId, channelId);
        console.log(emessage);
        if (!emessage) {
            emessage = new EMessage(user.id, channelId, guildId, new EStatus(AvailabilityLevel.UNKNOWN));
            state.setEMessage(guildId, channelId, emessage);
        }

        interaction.reply({ ...emessage.toMessage(client), ephemeral: true });
    },
};