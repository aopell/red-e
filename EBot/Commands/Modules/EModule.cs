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
            var emessage = EMessageHelper.EMessages.GetValueOrDefault(Context.Channel.Id);
            if (emessage == null) throw new CommandExecutionException("There is no e message currently in this channel");

            await EMessageHelper.CreateEMessage(Context, emessage);
        }
    }
}
