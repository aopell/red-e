using Discord.Commands;
using EBot.Helpers;
using EBot.Tools;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EBot.Commands.Modules
{
    [Group("e")]
    public class EModule : ModuleBase<BotCommandContext>
    {
        [Command, Summary("Displays the e message from this channel")]
        public async Task DisplayEMessage()
        {
            var emessage = EMessageHelper.EMessages.GetValueOrDefault(Context.Channel.Id);
            if (emessage == null) throw new CommandExecutionException("There is no e message currently in this channel");

            await EMessageHelper.CreateEMessage(emessage);
        }

        [Command("delete"), Summary("Deletes the e message from this channel")]
        public async Task DeleteEMessage()
        {
            if (EMessageHelper.EMessages.GetValueOrDefault(Context.Channel.Id) == null) throw new CommandExecutionException("There is no e message currently in this channel");

            var message = await Context.Channel.SendMessageAsync("Are you sure you want to delete the current e message?");
            ReactionMessageHelper.CreateConfirmReactionMessage(
                Context.User.Id,
                message,
                (rm, sr) =>
                {
                    EMessageHelper.EMessages[Context.Channel.Id] = null;
                    EMessageHelper.SaveEMessages();
                    return message.ModifyAsync(mp => mp.Content = $"{Strings.ReadyEmoji} Message deleted successfully");
                },
                (rm, sr) => message.ModifyAsync(mp => mp.Content = $"{Strings.UnavailableEmoji} Message not deleted")
            );
        }
    }
}
