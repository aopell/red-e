using System.Threading.Tasks;
using Discord.Commands;
using EBot.Helpers;

namespace EBot.Commands.Modules
{
    [Group("avatar")]
    public class AvatarModule : ModuleBase<BotCommandContext>
    {
        [Command]
        [Summary("Gets an emojified version of your avatar")]
        public async Task Avatar()
        {
            // SocketUser user = Context.Guild.GetUser
            string response = await AvatarEmojiHelper.GetAvatarEmoji(Context.User.Id);
            _ = Context.Channel.SendMessageAsync(response);
        }

        [Command("delete")]
        [Summary("Deletes your avatar emoji")]
        public async Task Delete()
        {
            if(await AvatarEmojiHelper.DeleteAvatarEmoji(Context.User.Id))
            {
                _ = Context.Channel.SendMessageAsync("Successfuly deleted");
                return;
            }
            _ = Context.Channel.SendMessageAsync("Could not find an emote to delete");
        }
    }
}