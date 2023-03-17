import type { Snowflake } from "discord.js";
import type DatabaseConnection from "../helpers/database-connection-helper";

export default class GuildOptions {
    guild: Snowflake;
    invited: Date;
    inviter?: Snowflake;
    timezone?: string;
    lateMessages?: string[];
    lateMessageTimes?: number[];
    availabilityRole?: Snowflake;
    voiceChannels?: Snowflake[];
    authorizedUserRole?: Snowflake;

    constructor(
        guild: Snowflake,
        invited: Date,
        inviter?: Snowflake,
        timezone?: string,
        lateMessages?: string[],
        lateMessageTimes?: number[],
        availabilityRole?: Snowflake,
        voiceChannels?: Snowflake[],
        authorizedUserRole?: Snowflake,
    ) {
        this.guild = guild;
        this.invited = invited;
        this.inviter = inviter;
        this.timezone = timezone;
        this.lateMessages = lateMessages;
        this.lateMessageTimes = lateMessageTimes;
        this.availabilityRole = availabilityRole;
        this.voiceChannels = voiceChannels;
        this.authorizedUserRole = authorizedUserRole;
    }

    static async get(database: DatabaseConnection, guildId: Snowflake): Promise<GuildOptions | null> {
        const result = await database.query(`
            SELECT guild, invited, inviter, timezone, late_messages, late_message_times, availability_role, voice_channels, authorized_user_role
            FROM guild_options
            WHERE guild = $1
            LIMIT 1
        `, [guildId]);

        if (result.rowCount === 0) {
            return null;
        }

        const obj = result.rows[0];

        return new GuildOptions(
            obj.guild,
            obj.invited,
            obj.inviter,
            obj.timezone,
            obj.late_messages,
            obj.late_message_times,
            obj.availability_role,
            obj.voice_channels,
            obj.authorized_user_role,
        );
    }

    async save(database: DatabaseConnection) {
        return await database.query(`
        INSERT INTO public.guild_options
        (guild, invited, inviter, timezone, late_messages, late_message_times, availability_role, voice_channels, authorized_user_role)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (guild)
        DO UPDATE 
        SET invited=EXCLUDED.invited, inviter=EXCLUDED.inviter, timezone=EXCLUDED.timezone, late_messages=EXCLUDED.late_messages, late_message_times=EXCLUDED.late_message_times, availability_role=EXCLUDED.availability_role, voice_channels=EXCLUDED.voice_channels, authorized_user_role=EXCLUDED.authorized_user_role;
        `, [
            this.guild,
            this.invited,
            this.inviter,
            this.timezone,
            this.lateMessages,
            this.lateMessageTimes,
            this.availabilityRole,
            this.voiceChannels,
            this.authorizedUserRole,
        ]);
    }
}