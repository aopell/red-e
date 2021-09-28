/**
 * @typedef {import('discord.js').Snowflake} Snowflake
 * @typedef {import('discord.js').EmojiResolvable} EmojiResolvable
 * @typedef {import('discord.js').Client} DiscordClient
 * @typedef {import('./state.js')} ClientState
 */

/**
 * @typedef {Object} Config Bot configuration
 * @property {string} token Discord bot token
 * @property {Snowflake} guildId Testing guild ID for slash commands
 * @property {Snowflake} clientId Discord application ID
 * @property {Map<string, EmojiResolvable>} availabilityEmojis Emojis for each availability status
 * @property {Map<Snowflake|"default", EmojiResolvable>} avatoji Avatoji® - avatar emojis for user IDs
 * @property {string} defaultTimezone The default UNIX timezone to use
 * @property {number} expirationHours EMessages will expire this many hours after creation
 */

/**
 * @typedef {DiscordClient & {config: Config, state: ClientState}} Client
 */

/**
 * @typedef {"UNKNOWN"|"UNAVAILABLE"|"MAYBE"|"AVAILABLE_LATER"|"AVAILABLE"|"READY"|"DONE"} AvailabilityStatus
 */

/**
 * @typedef {"AGREE"|"FIVE_MINUTES"|"FIFTEEN_MINUTES"|"ONE_HOUR"|"TWO_HOURS"|"TEN_O_CLOCK"|"ELEVEN_O_CLOCK"|"TWELVE_O_CLOCK"|"LATE"} EmojiKey
 */

/**
 * @typedef {AvailabilityStatus | EmojiKey} AvailabilityEmoji
 */

module.exports = {};