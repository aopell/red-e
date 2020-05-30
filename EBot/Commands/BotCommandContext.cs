using Discord.Commands;
using Discord.WebSocket;

namespace EBot.Commands
{
    public class BotCommandContext : SocketCommandContext
    {
        public DiscordBot Bot { get; set; }

        public BotCommandContext(DiscordSocketClient client, SocketUserMessage msg, DiscordBot bot) : base(client, msg) => Bot = bot;
    }
}