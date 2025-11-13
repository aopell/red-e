import EStatus from "../models/e-status";
import { AvailabilityLevel } from "../util";

import type { RedEClient } from "../typedefs";
import { TextChannel, type VoiceState } from "discord.js";

export default {
    name: "voiceStateUpdate",
    once: false,
    /**
     * Handles voice state update events
     * @param client The bot client
     * @param oldState Old voice state
     * @param newState New voice state
     */
    async execute(client: RedEClient, oldState: VoiceState, newState: VoiceState) {
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
                const userStatus = emessage.getStatus(userId);
                const channel = await client.channels.fetch(emessage.channelId);
                switch (userStatus?.availability ?? AvailabilityLevel.UNAVAILABLE) {
                    case AvailabilityLevel.AVAILABLE:
                    case AvailabilityLevel.AVAILABLE_LATER:
                    case AvailabilityLevel.MAYBE:
                    case AvailabilityLevel.UNKNOWN:
                        // send a message to the channel
                        if (channel instanceof TextChannel) {
                            // if (emessage.countWithStatus(AvailabilityLevel.READY) >= 0) break;
                            channel.send(`:loud_sound: <@${userId}> has joined <#${newChannel}>`);
                        }
                        break;
                    default:
                        break;
                }

                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.READY), false);
                emessage.updateAllMessages(client);
            }
        } else if (prevTracked) {
            // leaving channel
            for (const emessage of guildEMessages) {
                emessage.updateStatus(client, userId, new EStatus(userId, AvailabilityLevel.DONE), false);
                emessage.updateAllMessages(client);
            }
        }
    },
};