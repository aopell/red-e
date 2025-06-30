import fs from "fs";
import EMessage from "./models/e-message";
import GuildPreferences from "./models/guild-preferences";
import type { Snowflake } from "discord.js";

export default class ClientState {
    EMessages: Record<string, Record<string, EMessage | undefined>>;
    GuildPreferences: Record<Snowflake, GuildPreferences>;

    /**
     * Creates a new `ClientState`
     * @param emessages `EMessage`s for all channels
     * @param guildPreferences `GuildPreferences` for all guilds
     */
    constructor(emessages?: Record<Snowflake, Record<Snowflake, EMessage | undefined>>, guildPreferences?: Record<Snowflake, GuildPreferences>) {
        this.EMessages = emessages ?? {};
        this.GuildPreferences = guildPreferences ?? {};
    }

    static load() {
        let json = new ClientState();
        if (fs.existsSync("../state.json")) {
            json = <ClientState>JSON.parse(fs.readFileSync("../state.json").toString());
        }

        return new ClientState(
            json.EMessages,
            json.GuildPreferences,
        );
    }

    save() {
        const json = JSON.stringify(this, null, 4);
        fs.writeFileSync("../state.json", json);
    }

    /**
     * Gets the `EMessage` associated with the guild and channel
     * @param guildId The guild that contains the channel
     * @param channelId The channel whose EMessage to lookup
     * @returns The `EMessage` associated with that guild and channel, or `undefined`
     */
    getEMessage(guildId: Snowflake, channelId: Snowflake): EMessage | undefined {
        const message = this.EMessages?.[guildId]?.[channelId];
        return message ? EMessage.fromJSON(message) : undefined;
    }

    /**
     * Sets the `EMessage` associated with the guild and channel, and saves state
     * @param guildId The guild that contains the channel
     * @param channelId The channel whose EMessage to update
     * @param emessage The `EMessage` to associate with that guild and channel
     */
    setEMessage(guildId: Snowflake, channelId: Snowflake, emessage?: EMessage) {
        this.EMessages[guildId] = this.EMessages[guildId] ?? {};

        const existing = this.EMessages[guildId][channelId];
        if (!emessage && existing) {
            fs.mkdirSync(`../logs/messages/${guildId}/${channelId}`, { recursive: true });
            fs.writeFileSync(`../logs/messages/${guildId}/${channelId}/${existing.creationTimestamp}.json`, JSON.stringify(existing));
        }

        this.EMessages[guildId][channelId] = emessage;
        this.save();
    }

    /**
     * Gets all `EMessage`s in a guild
     * @param guildId The guild to get `EMessage`s for
     */
    getAllGuildEMessages(guildId: Snowflake): EMessage[] {
        const emessages: EMessage[] = [];
        for (const channelId in (this.EMessages?.[guildId] ?? [])) {
            const emessage = this.getEMessage(guildId, channelId);
            if (emessage) {
                emessages.push(emessage);
            }
        }
        return emessages;
    }

    /**
     * Gets all `EMessage`s
     */
    getAllEMessages(): EMessage[] {
        const emessages: EMessage[] = [];
        for (const guildId in (this.EMessages ?? [])) {
            emessages.push(...this.getAllGuildEMessages(guildId));
        }
        return emessages;
    }

    /**
     * Gets the preference for the guild if it exists
     * @param guildId The guild from which to fetch a preference
     * @param pref The preference to fetch
     * @param fallback A fallback value if the preference doesn't exist
     */
    getGuildPreference(guildId: Snowflake, pref: keyof GuildPreferences, fallback: any = undefined): any {
        const guildPref = this.GuildPreferences?.[guildId]?.[pref];
        return guildPref ?? fallback;
    }

    /**
     * Sets the preference for a guild, and saves state
     * @param guildId The guild for which to set a preference
     * @param pref The preference to set
     * @param value The value to set for the preference
     */
    setGuildPreference(guildId: Snowflake, pref: keyof GuildPreferences, value: any) {
        let guildPrefs = this.GuildPreferences[guildId];
        if (!guildPrefs) {
            this.GuildPreferences[guildId] = new GuildPreferences(guildId);
            guildPrefs = this.GuildPreferences[guildId];
        }
        guildPrefs[pref] = value;
        this.save();
    }
}