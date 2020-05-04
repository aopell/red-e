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

namespace EBot.Helpers
{
    public static class EMessageHelper
    {
        public static Dictionary<ulong, EMessage> EMessages = new Dictionary<ulong, EMessage>();

        public static async Task MessageRecevied(SocketMessage msg)
        {
            if (msg.Author.IsBot || !(msg is SocketUserMessage message)) return;

            var parse = new EParser(new ELexer(msg.Content)).Parse();

            if (!parse.IsSuccess) return;

            await HandleEMessage(message, parse.Root);
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

        private static async Task HandleEMessage(SocketUserMessage message, ASTNode root)
        {
            var context = new BotCommandContext(DiscordBot.MainInstance.Client, message, DiscordBot.MainInstance);

            await CreateEMessage(context, EWalker.Read(root));
        }

        public static async Task CreateEMessage(EMessage emessage, EStatus senderStatus)
        {
            var message = await emessage.Context.Channel.SendMessageAsync(embed: GenerateEmbed(emessage).Build());
            ulong messageId = message.Id;
            CreateEMessage(emessage.Context, emessage, message, messageId, senderStatus);
        }

        public static async Task CreateEMessage(BotCommandContext context, EStatus senderStatus)
        {
            EMessage emessage = new EMessage(context, context.Bot.Options.DefaultUsers);
            await CreateEMessage(emessage, senderStatus);
        }

        private static void CreateEMessage(BotCommandContext context, EMessage emessage, RestUserMessage message, ulong messageId, EStatus senderStatus)
        {
            EMessages.Add(messageId, emessage);
            UpdateEStatus(message.Id, message.Author.Id, senderStatus == null ? EStatus.FromState(EState.Unknown) : senderStatus);
            ReactionMessageHelper.CreateReactionMessage(
                context,
                message,
                allowMultipleReactions: true,
                anyoneCanInteract: true,
                timeout: (int)TimeSpan.FromHours(12).TotalMilliseconds,
                actions: new List<(string, Func<ReactionMessage, SocketReaction, Task>)>
                {
                    ("☑", (rm, sr) => UpdateEStatus(rm.Message.Id, sr.UserId, EState.Available)),
                    ("<:unavailable:706006786842296480>", (rm, sr) => UpdateEStatus(rm.Message.Id, sr.UserId, EState.Unavailable)),
                    ("<:five:706000163738484756>", generateTimeOffsetAction(TimeSpan.FromMinutes(5))),
                    ("<:fifteen:706000163562323979>", generateTimeOffsetAction(TimeSpan.FromMinutes(15))),
                    ("<:hour:706000163688153088>", generateTimeOffsetAction(TimeSpan.FromHours(1))),
                    ("<:twohours:706000163596009514>", generateTimeOffsetAction(TimeSpan.FromHours(2))),
                    ("<:ten:706000163801399346>", generateTimeSetAction(DateTimeOffset.Parse("10:00 PM"))),
                    ("<:eleven:706000163142893639>", generateTimeSetAction(DateTimeOffset.Parse("11:00 PM"))),
                    ("<:twelve:706000163826565200>",  generateTimeSetAction(DateTimeOffset.Parse("12:00 AM") + TimeSpan.FromDays(1)))
                },
                onTimeout: () =>
                {
                    EMessages.Remove(messageId);
                }
            );

            Func<ReactionMessage, SocketReaction, Task> generateTimeOffsetAction(TimeSpan offset)
            {
                return (rm, sr) =>
                {
                    EStatus s = EMessages[rm.Message.Id].Statuses.GetValueOrDefault(sr.UserId, EStatus.FromState(EState.Unknown));
                    return UpdateEStatus(rm.Message.Id, sr.UserId, EState.AvailableLater, (s.State == EState.AvailableLater ? s.TimeAvailable : DateTimeOffset.Now) + offset);
                };
            }

            Func<ReactionMessage, SocketReaction, Task> generateTimeSetAction(DateTimeOffset time)
            {
                return (rm, sr) => UpdateEStatus(rm.Message.Id, sr.UserId, EState.AvailableLater, time);
            }
        }

        public static async Task UpdateEMessages()
        {
            foreach (ulong id in EMessages.Keys.ToArray())
            {
                var emessage = EMessages.GetValueOrDefault(id);
                if (emessage == null) continue;

                foreach (ulong userId in emessage.Statuses.Keys.ToArray())
                {
                    var status = emessage.Statuses.GetValueOrDefault(userId);
                    if (status == null) continue;

                    if (status.State == EState.AvailableLater && status.TimeAvailable < DateTimeOffset.Now && !status.ShamedForLateness)
                    {
                        status.ShamedForLateness = true;
                        await emessage.Context.Channel.SendMessageAsync($"<@{userId}>, liar.");
                    }
                }

                await UpdateEMessage(id, emessage);

                if (DateTimeOffset.Now - EMessages[id].CreatedTimestamp > TimeSpan.FromHours(12))
                {
                    EMessages.Remove(id);
                }
            }
        }

        private static async Task UpdateEMessage(ulong message, EMessage emessage)
        {
            try
            {
                var msg = (IUserMessage)await emessage.Context.Channel.GetMessageAsync(message);
                if (msg != null)
                {
                    await msg.ModifyAsync((props) => props.Embed = GenerateEmbed(emessage).Build());
                }
            }
            catch { }
        }

        public static async Task UpdateEStatus(ulong messageId, ulong userId, EState state, DateTimeOffset? timeAvailable = null)
        {
            await UpdateEStatus(messageId, userId, EStatus.FromState(state, timeAvailable));
        }
        
        public static async Task UpdateEStatus(ulong messageId, ulong userId, EStatus status)
        {
            EMessage emessage = EMessages.GetValueOrDefault(messageId);
            if (emessage == null) return;

            await DiscordBot.MainInstance.Log(new LogMessage(LogSeverity.Info, "EMessageHelper", $"{userId} updated estatus to {status}"));

            emessage.Statuses[userId] = status;
            await UpdateEMessages();
        }

        public static async Task UpdateEStatuses(ulong userId, EState state)
        {
            foreach (ulong id in EMessages.Keys.ToArray())
            { 
                UpdateEStatus(id, userId, state);
            }
        }

        private static EmbedBuilder GenerateEmbed(EMessage message)
        {
            EmbedBuilder builder = new EmbedBuilder();
            builder.Title = "eeee?";

            foreach (ulong user in message.Statuses.Keys.ToArray())
            {
                string name = message.Context.NicknameOrUsername(user);
                if (name == null) continue;

                builder.AddField(name, getStatusMessage(message.Statuses[user]));
            }

            builder.WithFooter("Last Updated");
            builder.WithCurrentTimestamp();

            return builder;

            string getStatusMessage(EStatus status)
            {
                return status.State switch
                {
                    EState.Unavailable => "<:unavailable:706006786842296480> Unavailable",
                    EState.AvailableLater => getAvailableLaterStatus(status.TimeAvailable),
                    EState.Available => "☑ Available Now",
                    EState.Ready => "✅ Ready (In-Voice)",
                    EState.Done => "🔵 Done",
                    _ => "❔ Unknown",
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

                return $"{(late ? "⏰" : "⌛")} {(span.TotalHours >= 1 ? $"{(int)span.TotalHours} hour{(span.TotalHours >= 2 ? "s" : "")} " : "")}{span.Minutes} min{(span.Minutes != 1 ? "s" : "")}{(late ? " late" : "")}";
            }
        }
    }

    public static class EWalker
    {
        public static EStatus Read(ASTNode node)
        {
            switch (node.Symbol.ID)
            {
                case EParser.ID.VariableTime: return ReadTime(node);
                case EParser.ID.VariableIn: return ReadTime(node);
            }

            return EStatus.FromState(EState.Unknown);
        }

        public static EStatus ReadIn(ASTNode node)
        {
            var child = node.Children.First();

            switch (child.Symbol.ID)
            {
                case EParser.ID.VariableN: return Read(child);
            }
            
            return EStatus.FromState(EState.Unknown);

        }

        public static EStatus ReadN(ASTNode node)
        {
            ASTNode number = node.Children[0];

            int time = int.Parse(number.Value);

            ASTNode timeInterval = node.Children[1];
            
            return EStatus.FromState(EState.AvailableLater, DateTimeOffset.Now + (timeInterval.Symbol.ID == EParser.ID.VariableNhours ? TimeSpan.FromHours(time) : TimeSpan.FromMinutes(time)));
        }
        
        public  static EStatus ReadTime(ASTNode node)
        {
            var children = node.Children;

            var time = children.First();

            TimeSpan ampm = DateTime.Now.Hour < 12 ? new TimeSpan(0, 0, 0) : new TimeSpan(12, 0, 0);

            if (time.Symbol.ID == ELexer.ID.TerminalTexttime)
            {
                return EStatus.FromState(EState.AvailableLater, DateTime.Today + ampm + TexttimeOffset(time.Value));
            }
            
            int minute = 0;

            if (children.Count == 2) minute = int.Parse(children.ElementAt(1).Value);

            int hour = int.Parse(time.Value);

            return EStatus.FromState(EState.AvailableLater, DateTime.Today + ampm + new TimeSpan(hour, minute, 0));
        }

        public static TimeSpan TexttimeOffset(string texttime)
        {
            switch (texttime)
            {
                case "one": return TimeSpan.FromHours(1);
                case "two": return TimeSpan.FromHours(2);
                case "three": return TimeSpan.FromHours(3);
                case "four": return TimeSpan.FromHours(4);
                case "five": return TimeSpan.FromHours(5);
                case "six": return TimeSpan.FromHours(6);
                case "seven": return TimeSpan.FromHours(7);
                case "eight": return TimeSpan.FromHours(8);
                case "nine": return TimeSpan.FromHours(9);
                case "ten": return TimeSpan.FromHours(10);
                case "eleven": return TimeSpan.FromHours(11);
                case "twelve":
                case "noon":
                case "midnight": return TimeSpan.FromHours(12);
                default: return TimeSpan.FromHours(-1);
            }
        }
    }
}
