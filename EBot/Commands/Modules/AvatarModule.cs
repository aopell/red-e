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
        public async Task avatar()
        {
            // SocketUser user = Context.Guild.GetUser
            string response = await AvatarEmojiHelper.getAvatarEmoji(Context.User.Id);
            _ = Context.Channel.SendMessageAsync(response);
        }

        [Command("regenerate")]
        [Summary("Force regenerates your avatar emoji")]
        public async Task regenerate()
        {
            string response = await AvatarEmojiHelper.regenerateAvatarEmoji(Context.User.Id);
            _ = Context.Channel.SendMessageAsync(response);
        }
    }
}