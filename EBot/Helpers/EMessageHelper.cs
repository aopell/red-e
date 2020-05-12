using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Discord;
using Discord.Rest;
using Discord.WebSocket;
using E;
using EBot.Models;
using EBot.Tools;
using Hime.Redist;

namespace EBot.Helpers
{
    public static class EMessageHelper
    {
        public static Dictionary<ulong, EMessage> EMessages => DiscordBot.MainInstance.EMessages.Messages;
        public static void SaveEMessages() => DiscordBot.MainInstance.EMessages.SaveConfig();

        public static async Task MessageRecevied(SocketMessage msg)
        {
            if (msg.Author.IsBot || !(msg is SocketUserMessage message)) return;

            ParseResult parse = new EParser(new ELexer(msg.Content)).Parse();

            if (!parse.IsSuccess) return;

            ASTNode root = parse.Root;

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

        private static async Task HandleEMessagePrompt(SocketMessage message, ASTNode root)
        {
            bool existing = EMessages.GetValueOrDefault(message.Channel.Id) != null;

            EStatus senderStatus = EMessageTimeHelper.Read(root);

            if (existing)
            {
                RestUserMessage confirmMessage =
                    await message.Channel.SendMessageAsync("There is already an active e message in this channel. Replace it?");
                ReactionMessageHelper.CreateConfirmReactionMessage(
                    message.Author.Id,
                    confirmMessage,
                    ReactionMessageHelper.DeleteMessageAndCall(
                        (rm, sr) => CreateEMessage(message.Author.Id, message.Channel.Id, ((IGuildChannel)message.Channel).Guild.Id, senderStatus)
                    ),
                    (rm, sr) => confirmMessage.DeleteAsync()
                );
                return;
            }

            await CreateEMessage(message.Author.Id, message.Channel.Id, ((IGuildChannel)message.Channel).Guild.Id, senderStatus);
        }

        public static async Task CreateEMessage(ulong userId, ulong channelId, ulong guildId, EStatus senderStatus)
        {
            var emessage = new EMessage(userId, channelId, guildId, senderStatus, DiscordBot.MainInstance.Options.DefaultUsers);

            SocketRole role = emessage.Guild.Roles.FirstOrDefault(x => x.Name == DiscordBot.MainInstance.Options.AvailableRoleName);
            if (role != null)
            {
                foreach (ulong uid in emessage.Statuses.Keys)
                {
                    _ = emessage.Guild.GetUser(uid).RemoveRoleAsync(role);
                }
            }

            await CreateEMessage(emessage);
        }

        public static async Task CreateEMessage(EMessage emessage)
        {
            RestUserMessage message = await emessage.Channel.SendMessageAsync(embed: GenerateEmbed(emessage).Build());
            CreateEMessage(emessage, message);
        }

        private static void CreateEMessage(EMessage emessage, IUserMessage message)
        {
            emessage.MessageIds.Add(message.Id);
            EMessages[emessage.Channel.Id] = emessage;
            SaveEMessages();
            CreateReactionMessage(emessage, message);
        }

        public static void CreateReactionMessage(EMessage emessage, IUserMessage message)
        {
            var actionButtons = new List<(string, Func<ReactionMessage, SocketReaction, Task>)>
            {
                (Strings.AvailableEmoji, (rm, sr) => UpdateEStatus(rm.Channel.Id, sr.UserId, EState.Available)),
                (Strings.AgreeEmoji, emessage.AgreeWithCreator),
                (Strings.MaybeEmoji, (rm, sr) => UpdateEStatus(rm.Channel.Id, sr.UserId, EState.Maybe)),
                (Strings.UnavailableEmoji, (rm, sr) => UpdateEStatus(rm.Channel.Id, sr.UserId, EState.Unavailable)),
                (Strings.FiveMinutesEmoji, GenerateTimeOffsetAction(TimeSpan.FromMinutes(5))),
                (Strings.FifteenMinutesEmoji, GenerateTimeOffsetAction(TimeSpan.FromMinutes(15))),
                (Strings.OneHourEmoji, GenerateTimeOffsetAction(TimeSpan.FromHours(1))),
                (Strings.TwoHoursEmoji, GenerateTimeOffsetAction(TimeSpan.FromHours(2))),
                (Strings.TenOClockEmoji, GenerateTimeSetAction(DateTimeOffset.Parse("10:00 PM"))),
                (Strings.ElevenOClockEmoji, GenerateTimeSetAction(DateTimeOffset.Parse("11:00 PM"))),
                (Strings.TwelveOClockEmoji, GenerateTimeSetAction(DateTimeOffset.Parse("12:00 AM") + TimeSpan.FromDays(1)))
            };

            ReactionMessageHelper.CreateReactionMessage(
                emessage.CreatorId,
                message,
                allowMultipleReactions: true,
                anyoneCanInteract: true,
                timeout: (int)(message.CreatedAt + TimeSpan.FromHours(4) - DateTimeOffset.Now).TotalMilliseconds,
                actions: actionButtons,
                onTimeout: () =>
                {
                    EMessages.Remove(message.Id);
                    message.RemoveAllReactionsAsync();
                }
            );
        }

        private static Func<ReactionMessage, SocketReaction, Task> GenerateTimeSetAction(DateTimeOffset time)
        {
            return (rm, sr) => UpdateEStatus(rm.Channel.Id, sr.UserId, EState.AvailableLater, time);
        }

        private static Func<ReactionMessage, SocketReaction, Task> GenerateTimeOffsetAction(TimeSpan offset)
        {
            return (rm, sr) =>
            {
                EStatus s = EMessages.GetValueOrDefault(rm.Channel.Id)?.Statuses.GetValueOrDefault(sr.UserId, EStatus.FromState(EState.Unknown));
                return UpdateEStatus(
                    rm.Channel.Id,
                    sr.UserId,
                    EState.AvailableLater,
                    (s != null && s.State == EState.AvailableLater ? s.TimeAvailable : DateTimeOffset.Now) + offset
                );
            };
        }

        public static void UpdateEMessages()
        {
            foreach (EMessage emessage in EMessages.Values.ToArray())
            {
                if (emessage == null) continue;
                SocketRole role = emessage.Guild.Roles.FirstOrDefault(x => x.Name == DiscordBot.MainInstance.Options.AvailableRoleName);

                foreach (ulong userId in emessage.Statuses.Keys.ToArray())
                {
                    EStatus status = emessage.Statuses.GetValueOrDefault(userId);
                    if (status == null) continue;

                    if (status.State == EState.AvailableLater && status.TimeAvailable < DateTimeOffset.Now)
                    {
                        TimeSpan offset = DateTimeOffset.Now - status.TimeAvailable;

                        switch (status.Lateness)
                        {
                            case LateState.NotLate:
                                _ = createConfirmAvailabilityReactionMessage(emessage, userId);
                                _ = emessage.Guild.GetUser(userId).AddRoleAsync(role);
                                status.Lateness = LateState.SlightlyLate;
                                break;
                            case LateState.SlightlyLate when offset >= TimeSpan.FromMinutes(5):
                                string shameMessage = DiscordBot.MainInstance.Options.ShameMessages.Random();
                                _ = emessage.Channel.SendMessageAsync(string.Format(shameMessage, $"<@{userId}>"));
                                status.Lateness = LateState.Late;
                                break;
                            case LateState.Late when offset >= TimeSpan.FromMinutes(15):
                                shameMessage = DiscordBot.MainInstance.Options.SuperShameMessages.Random();
                                _ = emessage.Channel.SendMessageAsync(string.Format(shameMessage, $"<@{userId}>"));
                                status.Lateness = LateState.VeryLate;
                                break;
                            case LateState.VeryLate:
                            default:
                                break;
                        }
                    }
                }

                _ = UpdateEMessage(emessage);

                if (DateTimeOffset.Now - emessage.CreatedTimestamp > TimeSpan.FromHours(12))
                {
                    EMessages[emessage.ChannelId] = null;
                    SaveEMessages();
                }
            }

            static async Task createConfirmAvailabilityReactionMessage(EMessage emessage, ulong userId)
            {
                RestUserMessage message = await emessage.Channel.SendMessageAsync($"<@{userId}>, are you ready?");
                ReactionMessageHelper.CreateReactionMessage(
                    userId,
                    message,
                    new List<(string e, Func<ReactionMessage, SocketReaction, Task> a)>
                    {
                        (Strings.AvailableEmoji,
                         ReactionMessageHelper.EditMessageAndCall(
                             getStatus(),
                             (rm, sr) => UpdateEStatus(rm.Channel.Id, sr.UserId, EState.Available)
                         )),
                        (Strings.MaybeEmoji,
                         ReactionMessageHelper.EditMessageAndCall(getStatus(), (rm, sr) => UpdateEStatus(rm.Channel.Id, sr.UserId, EState.Maybe))),
                        (Strings.UnavailableEmoji,
                         ReactionMessageHelper.EditMessageAndCall(
                             getStatus(),
                             (rm, sr) => UpdateEStatus(rm.Channel.Id, sr.UserId, EState.Unavailable)
                         )),
                        (Strings.FiveMinutesEmoji,
                         ReactionMessageHelper.EditMessageAndCall(getStatus(), GenerateTimeOffsetAction(TimeSpan.FromMinutes(5)))),
                        (Strings.FifteenMinutesEmoji,
                         ReactionMessageHelper.EditMessageAndCall(getStatus(), GenerateTimeOffsetAction(TimeSpan.FromMinutes(15)))),
                    },
                    timeout: (int)TimeSpan.FromMinutes(10).TotalMilliseconds,
                    onTimeout: () => { message.RemoveAllReactionsAsync(); }
                );
            }

            static Func<ReactionMessage, SocketReaction, Action<MessageProperties>> getStatus()
            {
                return (rm, sr) => mp =>
                    mp.Content =
                        $"{sr.Emote} {string.Format(Strings.EmojiStatusMessages.GetValueOrDefault(sr.Emote.ToString()) ?? string.Empty, sr.User.Value?.NicknameOrUsername() ?? "<unknown user>")}";
            }
        }

        private static async Task UpdateEMessage(EMessage emessage)
        {
            foreach (ulong message in emessage.MessageIds)
            {
                IMessage msg = await emessage.Channel.GetMessageAsync(message);
                if (msg is IUserMessage ium) _ = ium.ModifyAsync(props => props.Embed = GenerateEmbed(emessage).Build());
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
            if ((emessage.Statuses.GetValueOrDefault(userId)?.State ?? EState.Unknown) == EState.Ready && status.State != EState.Done) return;

            await DiscordBot.MainInstance.Log(
                new LogMessage(
                    LogSeverity.Info,
                    "UpdateEStatus",
                    $"{userId} updated estatus to {status.State} at time {status.TimeAvailable}"
                )
            );

            emessage.Statuses[userId] = status;
            SaveEMessages();

            SocketRole role = emessage.Guild.Roles.FirstOrDefault(x => x.Name == DiscordBot.MainInstance.Options.AvailableRoleName);
            if (role != null)
            {
                _ = status.State == EState.Available
                    ? emessage.Guild.GetUser(userId).AddRoleAsync(role)
                    : emessage.Guild.GetUser(userId).RemoveRoleAsync(role);
            }

            _ = UpdateEMessage(emessage);
        }

        public static async Task UpdateEStatuses(ulong userId, EState state)
        {
            foreach (ulong id in EMessages.Keys.ToArray()) await UpdateEStatus(id, userId, state);
        }

        private static EmbedBuilder GenerateEmbed(EMessage message)
        {
            var builder = new EmbedBuilder();
            builder.Title = "eeee?";
            builder.Description =
                $"{message.Creator.NicknameOrUsername()} proposes that we eeee{(message.ProposedTime is null ? "" : $" at {message.ProposedTime:h:mm tt}")}";

            foreach (ulong user in message.Statuses.Keys.ToArray())
            {
                string name = message.Guild.GetUser(user).NicknameOrUsername();
                if (name is null) continue;

                builder.AddField(name, Strings.GetStatusMessage(message.Statuses[user]));
            }

            builder.Color = getEmbedColor();
            builder.WithFooter("Last Updated");
            builder.WithCurrentTimestamp();

            return builder;

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

                var colors = new List<Color>();
                foreach (EStatus status in message.Statuses.Values)
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
                return new Color(
                    (byte)Math.Sqrt(c1.R * c1.R * (1 - w) + c2.R * c2.R * w),
                    (byte)Math.Sqrt(c1.G * c1.G * (1 - w) + c2.G * c2.G * w),
                    (byte)Math.Sqrt(c1.B * c1.B * (1 - w) + c2.B * c2.B * w)
                );
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

        public static async Task InitializeEMessages()
        {
            foreach (EMessage emessage in EMessages.Values)
            {
                if (emessage is null) continue;

                foreach (ulong id in emessage.MessageIds)
                {
                    if (ReactionMessageHelper.IsReactionMessage(id)) continue;
                    IMessage message = await emessage.Channel.GetMessageAsync(id);
                    if (message is IUserMessage ium && DateTimeOffset.Now - message.CreatedAt < TimeSpan.FromHours(4))
                    {
                        CreateReactionMessage(emessage, ium);
                    }
                }
            }
        }
    }
}