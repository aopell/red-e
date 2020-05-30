using Discord.Commands;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using EBot.Helpers;
using EBot.Models;
using System.Linq;

namespace EBot.Commands.Modules
{
    public class DataModule : ModuleBase<BotCommandContext>
    {
        [Command("messages")]
        [Summary("Lists all emessages within the given time range")]
        public async Task DisplayEMessages(DateTimeOffset date)
        {
            var emessages = Context.Bot.DataStore.GetEMessages(date);

            if (emessages is null || !emessages.Any())
            {
                await ReplyAsync("None found");
                return;
            }

            foreach (var emessage in emessages)
            {
                await ReplyAsync($"Id: {emessage.Id}\nTimestamp: {emessage.CreatedTimestamp}\nGuild: {emessage.GuildId}\nChannel: {emessage.ChannelId}\nCreator: {emessage.CreatorId}");
            }
        }

        [Command("statuses")]
        [Summary("Lists all status changes for an emessage")]
        public async Task DisplayEMessages(Guid emessage)
        {
            var statuses = Context.Bot.DataStore.GetStatusChanges(emessage);

            if (statuses is null || !statuses.Any())
            {
                await ReplyAsync("None found");
                return;
            }

            StringBuilder stringBuilder = new StringBuilder();
            foreach (var status in statuses.OrderBy(x => x.Timestamp))
            {
                stringBuilder.AppendLine($"{status.UserId} {status.PrevState?.ToString() ?? "null"} -> {status.NewState}");
            }

            await ReplyAsync(stringBuilder.ToString());
        }
    }
}
