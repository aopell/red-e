using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Discord;
using Discord.Commands;
using EBot.Helpers;

namespace EBot.Commands.Modules
{
    [Group("help")]
    public class HelpModule : ModuleBase<BotCommandContext>
    {
        [Command]
        [Summary("Displays all available commands and how to use them")]
        public async Task Help(int page = 1)
        {
            if (page <= 0)
            {
                throw new CommandExecutionException(
                    "Number too low",
                    $"{Context.User.Mention}, you can't go to {(page == 0 ? "the zeroth" : "a negative")} page"
                );
            }

            const int NUM_PER_PAGE = 5;
            int totalPages = (int)Math.Ceiling(HelpHelper.AllCommands.Count / (double)NUM_PER_PAGE);
            if (page > totalPages)
            {
                throw new CommandExecutionException(
                    "Number too high",
                    $"{Context.User.Mention}, you can't go to page {page}, there are only {totalPages}"
                );
            }

            ReactionMessageHelper.CreatePaginatedMessage(
                Context.User.Id,
                await ReplyAsync(embed: buildPage(page)),
                totalPages,
                page,
                m => { return Task.FromResult(((string)null, buildPage(m.CurrentPage))); }
            );

            Embed buildPage(int num)
            {
                var result = new EmbedBuilder();
                result.WithTitle("Help");
                result.WithFooter($"Page {num} of {totalPages}");
                var commands = HelpHelper.AllCommands.Skip((num - 1) * NUM_PER_PAGE).Take(NUM_PER_PAGE);
                foreach (HelpInfo c in commands.OrderBy(c => c.Command)) result.AddField(c.ToString(), c.Summary ?? "*No help text provided*");
                return result.Build();
            }
        }

        [Command]
        [Summary("Displays help for a specific command")]
        public async Task Help([Remainder] string command)
        {
            bool detailed = true;
            var commands = HelpHelper.AllCommands.Where(c => c.Command == command);
            if (!commands.Any())
            {
                detailed = false;
                commands = HelpHelper.AllCommands.Where(c => c.Command.StartsWith(command + " "));
            }

            if (!commands.Any())
            {
                throw new CommandExecutionException("Bad argument", $"{Context.User.Mention}, there were no commands matching \"{command}\" found");
            }

            var result = new EmbedBuilder();
            result.WithTitle("Help");
            foreach (HelpInfo c in commands.OrderBy(c => c.Command))
            {
                var info = new StringBuilder();
                info.AppendLine(c.Summary ?? "*No help text provided*");
                info.AppendLine();
                if (detailed && c.Parameters.Count > 0)
                {
                    info.AppendLine("**Parameters**");
                    foreach (HelpParam param in c.Parameters)
                    {
                        info.AppendLine(
                            $"`{(param.Optional ? "Optional " : "")}{param.Type} {param.Name}{(param.Remainder ? "..." : "")}{(param.Optional ? $" = {param.DefaultValue}" : "")}`{(!string.IsNullOrEmpty(param.Summary) ? $" - *{param.Summary}*" : "")}"
                        );
                    }

                    info.AppendLine();
                }

                result.AddField(c.ToString(), info.ToString());
            }

            await ReplyAsync(embed: result.Build());
        }
    }
}