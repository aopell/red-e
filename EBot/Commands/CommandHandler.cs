using System;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Discord;
using Discord.Commands;
using Discord.WebSocket;
using EBot;
using EBot.Commands;
using EBot.Helpers;

namespace Ebot.Commands
{
    public class CommandHandler
    {
        private readonly DiscordBot bot;
        private readonly DiscordSocketClient client;
        private readonly CommandService commands;

        public CommandHandler(DiscordSocketClient client, CommandService commands, DiscordBot bot)
        {
            this.commands = commands;
            this.client = client;
            this.bot = bot;
        }

        public async Task InstallCommandsAsync()
        {
            // Hook the MessageReceived event into our command handler
            client.MessageReceived += HandleCommandAsync;

            commands.AddTypeReader<Guid>(new GuidTypeReader());

            // Here we discover all of the command modules in the entry 
            // assembly and load them. Starting from Discord.NET 2.0, a
            // service provider is required to be passed into the
            // module registration method to inject the 
            // required dependencies.
            //
            // If you do not use Dependency Injection, pass null.
            // See Dependency Injection guide for more information.
            await commands.AddModulesAsync(
                Assembly.GetEntryAssembly(),
                null
            );
        }

        private async Task HandleCommandAsync(SocketMessage messageParam)
        {
            // Don't process the command if it was a system message
            if (!(messageParam is SocketUserMessage message)) return;

            // Create a number to track where the prefix ends and the command begins
            int argPos = 0;

            // Determine if the message is a command based on the prefix and make sure no bots trigger commands
            if (!(message.HasCharPrefix('-', ref argPos) ||
                  message.HasMentionPrefix(client.CurrentUser, ref argPos)) ||
                message.Author.IsBot)
            {
                return;
            }

            // Create a WebSocket-based command context based on the message
            var context = new BotCommandContext(client, message, bot);

            // Execute the command with the command context we just
            // created, along with the service provider for precondition checks.

            // Keep in mind that result does not indicate a return value
            // rather an object stating if the command executed successfully.

            IResult result = await commands.ExecuteAsync(
                context,
                argPos,
                null
            );

            // Optionally, we may inform the user if the command fails
            // to be executed; however, this may not always be desired,
            // as it may clog up the request queue should a user spam a
            // command.
            if (!result.IsSuccess)
            {
                var embed = new EmbedBuilder();
                embed.WithColor(Color.Red);

                switch (result.Error)
                {
                    case CommandError.Exception when result is ExecuteResult eResult:
                        await ExceptionMessageHelper.HandleException(eResult.Exception, message.Channel);
                        return;
                    case CommandError.ParseFailed:
                    case CommandError.BadArgCount:
                        CommandInfo c = commands.Search(context, argPos).Commands.FirstOrDefault().Command;
                        string name = c.Name;
                        ModuleInfo module = c.Module;
                        while (module != null)
                        {
                            if (!string.IsNullOrEmpty(module.Group)) name = module.Group + " " + name;
                            module = module.Parent;
                        }

                        embed.WithTitle("Incorrect Command Usage");
                        embed.WithDescription($"Error parsing command. Run `+help {name}` for more information.");
                        break;
                    case CommandError.UnmetPrecondition:
                        embed.WithTitle("Error Executing Command");
                        embed.WithDescription(result.ErrorReason == "" ? "You do not have permission to use this command here." : result.ErrorReason);
                        break;
                    case CommandError.UnknownCommand:
                        // Do nothing
                        return;
                    default:
                        embed.WithTitle("Error Executing Command");
                        embed.WithColor(Color.Red);
                        embed.WithDescription(result.ErrorReason);
                        break;
                }

                await context.Channel.SendMessageAsync(embed: embed.Build());
            }
        }
    }
}