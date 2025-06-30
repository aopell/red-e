import { SlashCommandBuilder } from "discord.js";
import { EmojiText, formattedDateInTimezone } from "../util";
import moment from "moment-timezone";
import { defaultTimezone } from "../config.json";

import type { RedEClient } from "../typedefs";
import type { Interaction, ChatInputCommandInteraction } from "discord.js";
import { ChannelType } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName("set-e")
        .setDescription("Modifies preferences for the server")
        .addSubcommandGroup(group =>
            group
                .setName("role")
                .setDescription("Modifies the availabiliteeee role for the server")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("show")
                        .setDescription("Shows the availabiliteeee role for this server"),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("set")
                        .setDescription("Sets the availabiliteeee role for this server")
                        .addRoleOption(option =>
                            option
                                .setName("role")
                                .setDescription("The role to set as the server's availabiliteeee role")
                                .setRequired(true),
                        ),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Removes the availabiliteeee role for this server"),
                ),
        )
        .addSubcommandGroup(group =>
            group
                .setName("voicechannel")
                .setDescription("Modifies voice channel tracking for the server")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("show")
                        .setDescription("Show which voice channels are being tracked"),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("track")
                        .setDescription("Start tracking a voice channel")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("The voice channel to start tracking")
                                .setRequired(true),
                        ),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Stop tracking a voice channel")
                        .addChannelOption(option =>
                            option
                                .setName("channel")
                                .setDescription("The voice channel to stop tracking")
                                .setRequired(true),
                        ),
                ),
        )
        .addSubcommandGroup(group =>
            group
                .setName("timezone")
                .setDescription("Modifies the default timezone for this server")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("show")
                        .setDescription("Show which timezone the server is using"),
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("set")
                        .setDescription("Set the timezone for this server")
                        .addStringOption(option =>
                            option
                                .setName("tz")
                                .setDescription("TZ database timezone identifier")
                                .setRequired(true),
                        ),
                ),
        ),


    /**
     * Executes the command
     * @param client The current client
     * @param interaction The interaction object
     */
    async execute(client: RedEClient, interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inGuild()) return;

        const groups: Record<string, any> = {
            role: handleRole,
            voicechannel: handleVoiceChannel,
            timezone: handleTimezone,
        };

        const subcommands: Record<string, any> = {
        };

        if (interaction.options.getSubcommandGroup()) {
            await groups[interaction.options.getSubcommandGroup(true)](client, interaction);
        } else {
            await subcommands[interaction.options.getSubcommand()](client, interaction);
        }
    },
};

/**
 * Handles the "role" subcommand group
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleRole(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const availabilityRole = client.state.getGuildPreference(interaction.guildId, "availabilityRole", null);

    switch (interaction.options.getSubcommand()) {
        case "show":
            interaction.reply({ content: availabilityRole ? `The current availabiliteeee role is <@&${availabilityRole}>` : "There is no availabiliteeee role set", ephemeral: true });
            return;
        case "set":
            client.state.setGuildPreference(interaction.guildId, "availabilityRole", interaction.options.getRole("role", true).id);
            interaction.reply({ content: `Availabiliteeee role updated to <@&${interaction.options.getRole("role", true).id}>`, ephemeral: true });
            break;
        case "remove":
            client.state.setGuildPreference(interaction.guildId, "availabilityRole", null);
            interaction.reply({ content: "Removed the availabiliteeee role from this server", ephemeral: true });
            break;
        default:
            interaction.reply({ content: `${EmojiText.X_MARK} Not a valid option`, ephemeral: true });
            break;
    }
}

/**
 * Handles the "voicechannel" subcommand
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleVoiceChannel(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    const trackedChannels = client.state.getGuildPreference(interaction.guildId, "voiceChannels", []);
    let channel = interaction.options.getChannel("channel");
    if (channel && channel.type !== ChannelType.GuildVoice) {
        interaction.reply({ content: `${EmojiText.X_MARK} Please select a voice channel`, ephemeral: true });
        return;
    }

    switch (interaction.options.getSubcommand()) {
        case "show":
            interaction.reply({ content: `Currently tracking ${trackedChannels.length === 0 ? "no channels" : trackedChannels.map((c: any) => `<#${c}>`).join(", ")}`, ephemeral: true });
            return;
        case "track":
            channel = interaction.options.getChannel("channel", true);
            if (trackedChannels.includes(channel.id)) {
                interaction.reply({ content: `${EmojiText.X_MARK} That channel is already tracked`, ephemeral: true });
                return;
            }
            trackedChannels.push(channel.id);
            break;
        case "remove":
            channel = interaction.options.getChannel("channel", true);
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

    client.state.setGuildPreference(interaction.guildId, "voiceChannels", trackedChannels);
    interaction.reply({ content: `${EmojiText.CHECK_TICK} Voice channel tracking updated to track ${trackedChannels.length === 0 ? "no channels" : trackedChannels.map((c: any) => `<#${c}>`).join(", ")}`, ephemeral: true });
}

/**
 * Handles the "timezone" subcommand
 * @param client The current client
 * @param interaction The interaction object
 */
async function handleTimezone(client: RedEClient, interaction: ChatInputCommandInteraction<"cached" | "raw">) {
    let timezone = client.state.getGuildPreference(interaction.guildId, "defaultTimezone", null) || defaultTimezone;
    if (interaction.options.getString("tz")) {
        timezone = interaction.options.getString("tz");
        if (!moment.tz.names().includes(timezone)) {
            interaction.reply({ content: `${EmojiText.X_MARK} The timezone \`${timezone}\` is not valid. For a list of example timezones, see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`, ephemeral: true });
        }
    }

    switch (interaction.options.getSubcommand()) {
        case "show":
            interaction.reply({ content: `Timezone set to \`${timezone}\`. Current time is ${formattedDateInTimezone(Date.now(), timezone, "LLLL")}.`, ephemeral: true });
            return;
        case "set":
            client.state.setGuildPreference(interaction.guildId, "defaultTimezone", timezone);
            interaction.reply({ content: `Timezone updated to \`${timezone}\`. Current time is ${formattedDateInTimezone(Date.now(), timezone, "LLLL")}.`, ephemeral: true });
            return;
        default:
            interaction.reply({ content: `${EmojiText.X_MARK} Not a valid option`, ephemeral: true });
            break;
    }
}