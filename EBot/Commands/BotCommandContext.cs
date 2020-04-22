using Discord;
using Discord.Commands;
using Discord.WebSocket;
using System;
using System.Collections.Generic;
using System.Text;

namespace EBot.Commands
{
    public class BotCommandContext : SocketCommandContext
    {
        public DiscordBot Bot { get; set; }

        public BotCommandContext(DiscordSocketClient client, SocketUserMessage msg, DiscordBot bot) : base(client, msg)
        {
            Bot = bot;
        }

        public string NicknameOrUsername(ulong userId) => NicknameOrUsername(Guild.GetUser(userId));

        public string NicknameOrUsername(IUser user)
        {
            return user is IGuildUser gu && !string.IsNullOrEmpty(gu.Nickname) ? gu.Nickname : user.Username;
        }
    }
}
