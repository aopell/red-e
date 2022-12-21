import type { Client, Collection, Snowflake, SlashCommandBuilder, Interaction } from "discord.js";
import type ClientState from "./botstate";
import type { EmojiKeys, AvailabilityLevel } from "./util";

export type AnyEmoji = AvailabilityLevel | EmojiKeys;

export type Config = {
    token: string,
    guildId: Snowflake,
    clientId: Snowflake,
    availabilityEmojis: Record<AnyEmoji, string>,
    avatoji: Record<Snowflake | "default", string>,
    defaultTimezone: string,
    expirationHours: number,
    latePings: number[],
    lateMessages: string[]
};

export type CommandHandler = {
    data: SlashCommandBuilder,
    execute: (client: RedEClient, interaction: Interaction) => Promise<void>
}

export type RedEClient = Client & { config: Config, state: ClientState, commands: Collection<string, CommandHandler> };