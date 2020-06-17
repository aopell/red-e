using System.Collections.Immutable;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;

namespace EBot.Helpers
{
    public static class AvatarEmojiHelper
    {
        public static async Task<string> GetAvatarEmoji(ulong userId)
        {
            SocketGuild avatarEmojiServer = DiscordBot.MainInstance.Client.GetGuild(DiscordBot.MainInstance.Options.AvatarEmojiServer);
            ImmutableDictionary<string, GuildEmote> emotes = avatarEmojiServer.Emotes.ToImmutableDictionary(emote => emote.Name);
            if (emotes.TryGetValue(userId.ToString(), out GuildEmote res))
            {
                return res.ToString();
            }
            return await UploadAvatarEmoji(userId, avatarEmojiServer);
        }

        public static async Task<bool> DeleteAvatarEmoji(ulong userId)
        {
            SocketGuild avatarEmojiServer = DiscordBot.MainInstance.Client.GetGuild(DiscordBot.MainInstance.Options.AvatarEmojiServer);
            ImmutableDictionary<string, GuildEmote> emotes = avatarEmojiServer.Emotes.ToImmutableDictionary(emote => emote.Name);
            if (emotes.TryGetValue(userId.ToString(), out GuildEmote res))
            {
                await avatarEmojiServer.DeleteEmoteAsync(res);
                return true;
            }
            return false;
        }

        private static async Task<string> UploadAvatarEmoji(ulong userId, SocketGuild guild)
        {
            string url = DiscordBot.MainInstance.Client.GetUser(userId).GetAvatarUrl();
            WebClient webClient = new WebClient();
            byte[] imageBytes = webClient.DownloadData(url);
            MemoryStream imageStream = new MemoryStream(imageBytes);
            System.Drawing.Image imageSquare = System.Drawing.Image.FromStream(imageStream);
            System.Drawing.Image imageCircle = CropAvatarCircle(imageSquare);

            MemoryStream imageCircleStream = new MemoryStream();
            imageCircle.Save(imageCircleStream, System.Drawing.Imaging.ImageFormat.Png);
            imageCircleStream.Position = 0;
            Discord.Image image = new Discord.Image(imageCircleStream);

            GuildEmote createdEmote = await guild.CreateEmoteAsync(userId.ToString(), image);
            return createdEmote.ToString();
        }

        private static System.Drawing.Image CropAvatarCircle(System.Drawing.Image srcImage)
        {
            System.Drawing.Image res = new Bitmap(srcImage.Width, srcImage.Height, System.Drawing.Imaging.PixelFormat.Format32bppArgb);

            using Graphics g = Graphics.FromImage(res);
            RectangleF r = new RectangleF(0, 0, res.Width, res.Height);
            GraphicsPath path = new GraphicsPath();
            path.AddEllipse(r);

            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.SetClip(path);
            g.DrawImage(srcImage, 0, 0);

            return res;
        }
    }
}