using Discord;
using Discord.Rest;
using Discord.WebSocket;
using Hime.Redist;
using EBot.Commands;
using EBot.Models;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Linq;
using System.Reflection.Metadata;
using System.Runtime.Caching;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using E;
using EBot.Tools;

namespace EBot.Helpers
{
    public static class EMessageHelper
    {
        public static Dictionary<ulong, EMessage> EMessages => DiscordBot.MainInstance.EMessages.Messages;
        public static void SaveEMessages() => DiscordBot.MainInstance.EMessages.SaveConfig();

        public static async Task MessageRecevied(SocketMessage msg)
        {
            if (msg.Author.IsBot || !(msg is SocketUserMessage message)) return;

            var parse = new EParser(new ELexer(msg.Content)).Parse();

            if (!parse.IsSuccess) return;

            var root = parse.Root;

            string stripped = root.Children[0].Value.TrimEnd('e', 'E');
            if (!string.IsNullOrWhiteSpace(stripped) && !char.IsWhiteSpace(stripped[^1])) return; // a disgusting way to avoid false positives

            await HandleEMessagePrompt(message, root.Children[1]);
        }

        public static async Task UserVoiceStateUpdated(SocketUser user, SocketVoiceState prev, SocketVoiceState curr)
        {
            if (prev.VoiceChannel != curr.VoiceChannel)
            {
                if (curr.VoiceChannel != null && curr.VoiceChannel.Id == DiscordBot.MainInstance.Options.VoiceTargetRoomId)
                {
                    await UpdateEStatuses(user.Id, EState.Ready);
                }
                else if (prev.VoiceChannel != null && prev.VoiceChannel.Id == DiscordBot.MainInstance.Options.VoiceTargetRoomId)
                {
                    await UpdateEStatuses(user.Id, EState.Done);
                }
            }
        }

        private static async Task HandleEMessagePrompt(SocketUserMessage message, ASTNode root)
        {
            var context = new BotCommandContext(DiscordBot.MainInstance.Client, message, DiscordBot.MainInstance);

            bool existing = EMessages.GetValueOrDefault(context.Channel.Id) != null;

            var senderStatus = EMessageTimeHelper.Read(root);

            if (existing)
            {
                var confirmMessage = await context.Channel.SendMessageAsync("There is already an active e message in this channel. Replace it?");
                ReactionMessageHelper.CreateConfirmReactionMessage(context, confirmMessage,
                                                                   (rm, sr) => Task.WhenAll(CreateEMessage(context, senderStatus), confirmMessage.DeleteAsync()),
                                                                   (rm, sr) => confirmMessage.DeleteAsync());
                return;
            }

            await CreateEMessage(context, senderStatus);
        }

        public static async Task CreateEMessage(BotCommandContext context, EStatus senderStatus)
        {
            EMessage emessage = new EMessage(context.User.Id, context.Channel.Id, context.Guild.Id, senderStatus, context.Bot.Options.DefaultUsers);

            var role = emessage.Guild.Roles.FirstOrDefault(x => x.Name == DiscordBot.MainInstance.Options.AvailableRoleName);
            if (role != null)
            {
                foreach (ulong userId in emessage.Statuses.Keys)
                {
                    _ = emessage.Guild.GetUser(userId).RemoveRoleAsync(role);
                }
            }

            await CreateEMessage(context, emessage);
        }

        public static async Task CreateEMessage(BotCommandContext context, EMessage emessage)
        {
            var message = await emessage.Channel.SendMessageAsync(embed: GenerateEmbed(emessage).Build());
            ulong messageId = message.Id;
            CreateEMessage(context, emessage, message, messageId);
        }

        private static void CreateEMessage(BotCommandContext context, EMessage emessage, RestUserMessage message, ulong messageId)
        {
            var actionButtons = new List<(string, Func<ReactionMessage, SocketReaction, Task>)>
            {
                (Strings.AvailableEmoji, (rm, sr) => UpdateEStatus(rm.Context.Channel.Id, sr.UserId, EState.Available)),
                (Strings.AgreeEmoji, emessage.AgreeWithCreator),
                (Strings.MaybeEmoji, (rm, sr) => UpdateEStatus(rm.Context.Channel.Id, sr.UserId, EState.Maybe)),
                (Strings.UnavailableEmoji, (rm, sr) => UpdateEStatus(rm.Context.Channel.Id, sr.UserId, EState.Unavailable)),
                (Strings.FiveMinutesEmoji, generateTimeOffsetAction(TimeSpan.FromMinutes(5))),
                (Strings.FifteenMinutesEmoji, generateTimeOffsetAction(TimeSpan.FromMinutes(15))),
                (Strings.OneHourEmoji, generateTimeOffsetAction(TimeSpan.FromHours(1))),
                (Strings.TwoHoursEmoji, generateTimeOffsetAction(TimeSpan.FromHours(2))),
                (Strings.TenOClockEmoji, generateTimeSetAction(DateTimeOffset.Parse("10:00 PM"))),
                (Strings.ElevenOClockEmoji, generateTimeSetAction(DateTimeOffset.Parse("11:00 PM"))),
                (Strings.TwelveOClockEmoji,  generateTimeSetAction(DateTimeOffset.Parse("12:00 AM") + TimeSpan.FromDays(1)))
            };

            emessage.MessageIds.Add(messageId);
            EMessages[emessage.Channel.Id] = emessage;
            SaveEMessages();
            ReactionMessageHelper.CreateReactionMessage(
                context,
                message,
                allowMultipleReactions: true,
                anyoneCanInteract: true,
                timeout: (int)TimeSpan.FromHours(12).TotalMilliseconds,
                actions: actionButtons,
                onTimeout: () =>
                {
                    EMessages.Remove(messageId);
                }
            );

            Func<ReactionMessage, SocketReaction, Task> generateTimeOffsetAction(TimeSpan offset)
            {
                return (rm, sr) =>
                {
                    EStatus s = EMessages.GetValueOrDefault(rm.Context.Channel.Id)?.Statuses.GetValueOrDefault(sr.UserId, EStatus.FromState(EState.Unknown));
                    return UpdateEStatus(rm.Context.Channel.Id, sr.UserId, EState.AvailableLater, (s != null && s.State == EState.AvailableLater ? s.TimeAvailable : DateTimeOffset.Now) + offset);
                };
            }

            Func<ReactionMessage, SocketReaction, Task> generateTimeSetAction(DateTimeOffset time)
            {
                return (rm, sr) => UpdateEStatus(rm.Context.Channel.Id, sr.UserId, EState.AvailableLater, time);
            }
        }

        public static void UpdateEMessages()
        {
            foreach (var emessage in EMessages.Values.ToArray())
            {
                if (emessage == null) continue;
                var role = emessage.Guild.Roles.FirstOrDefault(x => x.Name == DiscordBot.MainInstance.Options.AvailableRoleName);
                foreach (ulong userId in emessage.Statuses.Keys.ToArray())
                {
                    var status = emessage.Statuses.GetValueOrDefault(userId);
                    if (status == null) continue;

                    if (status.State == EState.AvailableLater && status.TimeAvailable < DateTimeOffset.Now && !status.ShamedForLateness)
                    {
                        status.ShamedForLateness = true;
                        string shameMessage = DiscordBot.MainInstance.Options.ShameMessages.Random();
                        _ = emessage.Channel.SendMessageAsync(string.Format(shameMessage, $"<@{userId}>"));
                        _ = emessage.Guild.GetUser(userId).AddRoleAsync(role);
                    }
                }

                _ = UpdateEMessage(emessage);

                if (DateTimeOffset.Now - emessage.CreatedTimestamp > TimeSpan.FromHours(12))
                {
                    EMessages[emessage.ChannelId] = null;
                    SaveEMessages();
                }
            }
        }

        private static async Task UpdateEMessage(EMessage emessage)
        {
            foreach (ulong message in emessage.MessageIds)
            {
                try
                {
                    var msg = (IUserMessage)await emessage.Channel.GetMessageAsync(message);
                    if (msg != null)
                    {
                        await msg.ModifyAsync((props) => props.Embed = GenerateEmbed(emessage).Build());
                    }
                }
                catch { }
            }
        }

        public static async Task UpdateEStatus(ulong channelId, ulong userId, EState state)
        {
            await UpdateEStatus(channelId, userId, EStatus.FromState(state));
        }

        public static async Task UpdateEStatus(ulong channelId, ulong userId, EState state, DateTimeOffset timeAvailable)
        {
            await UpdateEStatus(channelId, userId, EStatus.FromState(state, timeAvailable));
        }

        public static async Task UpdateEStatus(ulong channelId, ulong userId, EStatus status)
        {
            EMessage emessage = EMessages.GetValueOrDefault(channelId);
            if (emessage == null) return;

            await DiscordBot.MainInstance.Log(new LogMessage(LogSeverity.Info, "UpdateEStatus", $"{userId} updated estatus to {status.State} at time {status.TimeAvailable}"));

            emessage.Statuses[userId] = status;
            SaveEMessages();

            var role = emessage.Guild.Roles.FirstOrDefault(x => x.Name == DiscordBot.MainInstance.Options.AvailableRoleName);
            if (role != null)
            {
                if (status.State == EState.Available)
                {
                    _ = emessage.Guild.GetUser(userId).AddRoleAsync(role);
                }
                else
                {
                    _ = emessage.Guild.GetUser(userId).RemoveRoleAsync(role);
                }
            }

            _ = UpdateEMessage(emessage);
        }

        public static async Task UpdateEStatuses(ulong userId, EState state)
        {
            foreach (ulong id in EMessages.Keys.ToArray())
            {
                await UpdateEStatus(id, userId, state);
            }
        }

        private static EmbedBuilder GenerateEmbed(EMessage message)
        {
            EmbedBuilder builder = new EmbedBuilder();
            builder.Title = "eeee?";
            builder.Description = $"{message.Creator.NicknameOrUsername()} proposes that we eeee{(message.ProposedTime == null ? "" : $" at {message.ProposedTime:h:mm tt}")}";

            foreach (ulong user in message.Statuses.Keys.ToArray())
            {
                string name = message.Guild.GetUser(user).NicknameOrUsername();
                if (name == null) continue;

                builder.AddField(name, getStatusMessage(message.Statuses[user]));
            }

            builder.Color = getEmbedColor();
            builder.WithFooter("Last Updated");
            builder.WithCurrentTimestamp();

            return builder;

            string getStatusMessage(EStatus status)
            {
                return status.State switch
                {
                    EState.Unavailable => $"{Strings.UnavailableEmoji} Unavailable",
                    EState.Maybe => $"{Strings.MaybeEmoji} Maybe Later",
                    EState.AvailableLater => getAvailableLaterStatus(status.TimeAvailable),
                    EState.Available => $"{Strings.AvailableEmoji} Available Now",
                    EState.Ready => $"{Strings.ReadyEmoji} Ready (In Voice)",
                    EState.Done => $"{Strings.SleepEmoji} {(status.TimeUpdated.Hour >= 20 || status.TimeUpdated.Hour <= 5 ? "Sleeeep" : "eeeed")}",
                    _ => $"{Strings.UnknownEmoji} Unknown",
                };
            }

            string getAvailableLaterStatus(DateTimeOffset time)
            {
                TimeSpan span = time - DateTimeOffset.Now;
                bool late = span.Ticks < 0;
                if (late)
                {
                    span = span.Negate();
                }

                return $"{(late ? Strings.LateEmoji : Strings.WaitingEmoji)} {(span.TotalHours >= 1 ? $"{(int)span.TotalHours} hour{(span.TotalHours >= 2 ? "s" : "")} " : "")}{span.Minutes} min{(span.Minutes != 1 ? "s" : "")}{(late ? " late" : "")}";
            }

            Color getEmbedColor()
            {
                var colorMap = new Dictionary<EState, Color>
                {
                    [EState.Unknown] = new Color(0x7a7a7a),
                    [EState.Unavailable] = new Color(0xef5a73),
                    [EState.Maybe] = new Color(0xffac33),
                    [EState.Available] = new Color(0x226699),
                    [EState.Ready] = new Color(0x2cd261),
                    [EState.Done] = new Color(0x9241d4)
                };

                List<Color> colors = new List<Color>();
                foreach (var status in message.Statuses.Values)
                {
                    if (status.State == EState.AvailableLater)
                    {
                        double weight = (double)(DateTimeOffset.Now - status.TimeUpdated).Ticks / (status.TimeAvailable - status.TimeUpdated).Ticks;
                        colors.Add(getWeightedAverageColor(colorMap[EState.Maybe], colorMap[EState.Available], weight));
                    }
                    else
                    {
                        colors.Add(colorMap[status.State]);
                    }
                }

                return getAverageColor(colors);
            }

            static Color getWeightedAverageColor(Color c1, Color c2, double w)
            {
                w = Math.Clamp(w, 0d, 1d);
                return new Color((byte)Math.Sqrt(c1.R * c1.R * (1 - w) + c2.R * c2.R * w), (byte)Math.Sqrt(c1.G * c1.G * (1 - w) + c2.G * c2.G * w), (byte)Math.Sqrt(c1.B * c1.B * (1 - w) + c2.B * c2.B * w));
            }

            static Color getAverageColor(IEnumerable<Color> colors)
            {
                double r = 0;
                double g = 0;
                double b = 0;
                int count = 0;
                foreach (Color color in colors)
                {
                    count++;
                    r += Math.Pow(color.R, 2);
                    g += Math.Pow(color.G, 2);
                    b += Math.Pow(color.B, 2);
                }
                r /= count;
                g /= count;
                b /= count;
                return new Color((byte)Math.Sqrt(r), (byte)Math.Sqrt(g), (byte)Math.Sqrt(b));
            }
        }
    }
}