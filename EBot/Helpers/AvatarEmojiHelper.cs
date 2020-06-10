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
        public static async Task<string> getAvatarEmoji(ulong userId)
        {
            SocketGuild avatarEmojiServer = DiscordBot.MainInstance.Client.GetGuild(DiscordBot.MainInstance.Options.AvatarEmojiServer);
            ImmutableDictionary<string, GuildEmote> emotes = avatarEmojiServer.Emotes.ToImmutableDictionary(emote => emote.Name);
            if (emotes.TryGetValue(userId.ToString(), out GuildEmote res))
            {
                return res.ToString();
            }
            return await uploadAvatarEmoji(userId, avatarEmojiServer);
        }

        public static async Task<string> regenerateAvatarEmoji(ulong userId)
        {
            SocketGuild avatarEmojiServer = DiscordBot.MainInstance.Client.GetGuild(DiscordBot.MainInstance.Options.AvatarEmojiServer);
            ImmutableDictionary<string, GuildEmote> emotes = avatarEmojiServer.Emotes.ToImmutableDictionary(emote => emote.Name);
            if (emotes.TryGetValue(userId.ToString(), out GuildEmote res))
            {
                await avatarEmojiServer.DeleteEmoteAsync(res);
            }
            return await uploadAvatarEmoji(userId, avatarEmojiServer);
        }

        private static async Task<string> uploadAvatarEmoji(ulong userId, SocketGuild guild)
        {
            string url = DiscordBot.MainInstance.Client.GetUser(userId).GetAvatarUrl();
            WebClient webClient = new WebClient();
            byte[] imageBytes = webClient.DownloadData(url);
            MemoryStream imageStream = new MemoryStream(imageBytes);
            System.Drawing.Image imageSquare = System.Drawing.Image.FromStream(imageStream);
            System.Drawing.Image imageCircle = cropAvatarCircle(imageSquare);
            MemoryStream imageCircleStream = new MemoryStream();
            imageCircle.Save(imageCircleStream, System.Drawing.Imaging.ImageFormat.Png);
            imageCircleStream.Position = 0;
            Discord.Image image = new Discord.Image(imageCircleStream);

            GuildEmote createdEmote = await guild.CreateEmoteAsync(userId.ToString(), image);

            return createdEmote.ToString();
        }

        private static System.Drawing.Image cropAvatarCircle(System.Drawing.Image srcImage)
        {
            System.Drawing.Image res = new Bitmap(srcImage.Width, srcImage.Height, srcImage.PixelFormat);

            using (Graphics g = Graphics.FromImage(res))
            {
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
}