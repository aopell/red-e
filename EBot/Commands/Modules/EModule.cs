using Discord.Commands;
using EBot.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EBot.Commands.Modules
{
    public class EModule : ModuleBase<BotCommandContext>
    {
        [Command("e"), Summary("Gets the latest e message and creates a new copy")]
        public async Task GetLatestEMessage()
        {
            var emessage = EMessageHelper.EMessages.Where(kvp => kvp.Value.Context.Channel.Id == Context.Channel.Id).OrderByDescending(kvp => kvp.Value.CreatedTimestamp.Ticks).FirstOrDefault().Value;
            if (emessage == null) throw new CommandExecutionException("There are no e messages currently in this channel");

            await EMessageHelper.CreateEMessage(emessage, null);
        }
    }
}
