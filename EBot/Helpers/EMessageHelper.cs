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
        private static Dictionary<ulong, EMessage> EMessages = new Dictionary<ulong, EMessage>();

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

            await CreateEMessage(context);

            // TODO: Update time of sender based on receieved message
        }

        private static async Task CreateEMessage(BotCommandContext context)
        {
            EMessage emessage = new EMessage(context, context.Bot.Options.DefaultUsers);
            var message = await context.Channel.SendMessageAsync(embed: GenerateEmbed(emessage).Build());
            ulong messageId = message.Id;
            EMessages.Add(messageId, emessage);
            ReactionMessageHelper.CreateReactionMessage(
                context,
                message,
                allowMultipleReactions: true,
                anyoneCanInteract: true,
                timeout: (int)TimeSpan.FromHours(12).TotalMilliseconds,
                actions: new List<(string, Func<ReactionMessage, SocketReaction, Task>)>
                {
                    ("☑", (rm, sr) => UpdateEStatus(rm.Message.Id, sr.UserId, EState.Available)),
                    ("❌", (rm, sr) => UpdateEStatus(rm.Message.Id, sr.UserId, EState.Unavailable)),
                    ("5️⃣", generateTimeOffsetAction(TimeSpan.FromMinutes(5))),
                    ("🔟", generateTimeOffsetAction(TimeSpan.FromMinutes(10))),
                    ("1️⃣", generateTimeOffsetAction(TimeSpan.FromHours(1))),
                    ("2️⃣", generateTimeOffsetAction(TimeSpan.FromHours(2))),
                    ("🕙", generateTimeSetAction(DateTimeOffset.Parse("10:00 PM"))),
                    ("🕚", generateTimeSetAction(DateTimeOffset.Parse("11:00 PM"))),
                    ("🕛",  generateTimeSetAction(DateTimeOffset.Parse("12:00 AM") + TimeSpan.FromDays(1)))
                },
                onTimeout: () =>
                {
                    EMessages.Remove(messageId);
                }
            );

            Func<ReactionMessage, SocketReaction, Task> generateTimeOffsetAction(TimeSpan offset)
            {
                return (rm, sr) => UpdateEStatus(rm.Message.Id, sr.UserId, EState.AvailableLater, EMessages[rm.Message.Id].Statuses.GetValueOrDefault(sr.UserId, EStatus.FromState(EState.Unknown)).TimeAvailable + offset);
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
                var msg = (RestUserMessage)await emessage.Context.Channel.GetMessageAsync(message);
                if (msg != null)
                {
                    await msg.ModifyAsync((props) => props.Embed = GenerateEmbed(emessage).Build());
                }
            }
            catch { }
        }

        public static async Task UpdateEStatus(ulong messageId, ulong userId, EState state, DateTimeOffset? timeAvailable = null)
        {
            EMessage emessage = EMessages.GetValueOrDefault(messageId);
            if (emessage == null) return;

            await DiscordBot.MainInstance.Log(new LogMessage(LogSeverity.Info, "EMessageHelper", $"{userId} updated estatus to {state} at time {timeAvailable}"));

            emessage.Statuses[userId] = EStatus.FromState(state, timeAvailable);
            await UpdateEMessage(messageId, emessage);
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

            foreach (ulong user in message.Statuses.Keys.ToArray())
            {
                builder.AddField(message.Context.NicknameOrUsername(user), getStatusMessage(message.Statuses[user]));
            }

            builder.WithFooter("Last Updated");
            builder.WithCurrentTimestamp();

            return builder;

            string getStatusMessage(EStatus status)
            {
                return status.State switch
                {
                    EState.Unavailable => "❌ Unavailable",
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

    public class EWalker
    {
        public DateTime Read(ASTNode node)
        {
            switch (node.Symbol.ID)
            {
                case EParser.ID.VariableTime: return ReadTime(node);
            }

            return DateTime.MinValue;
        }

        public DateTime ReadTime(ASTNode node)
        {
            var children = node.Children;

            var time = children.First();

            TimeSpan ampm;
            if (DateTime.Now.Hour < 12) ampm = new TimeSpan(0, 0, 0);
            else ampm = new TimeSpan(12, 0, 0);

            if (time.Symbol.ID == ELexer.ID.TerminalTexttime)
            {
                return DateTime.Today + ampm + TexttimeOffset(time.Value);
            }
            else
            {
                var minute = 0;

                if (children.Count == 2) Int32.Parse(children.ElementAt(1).Value);

                var hour = Int32.Parse(time.Value);

                return DateTime.Today + ampm + new TimeSpan(hour, minute, 0);
            }
        }

        public TimeSpan TexttimeOffset(string texttime)
        {
            switch (texttime)
            {
                case "one": return new TimeSpan(1, 0, 0);
                case "two": return new TimeSpan(2, 0, 0);
                case "three": return new TimeSpan(3, 0, 0);
                case "four": return new TimeSpan(4, 0, 0);
                case "five": return new TimeSpan(5, 0, 0);
                case "six": return new TimeSpan(6, 0, 0);
                case "seven": return new TimeSpan(7, 0, 0);
                case "eight": return new TimeSpan(8, 0, 0);
                case "nine": return new TimeSpan(9, 0, 0);
                case "ten": return new TimeSpan(10, 0, 0);
                case "eleven": return new TimeSpan(11, 0, 0);
                case "twelve":
                case "noon":
                case "midnight": return new TimeSpan(12, 0, 0);
                default: return new TimeSpan(-1, 0, 0);
            }
        }
    }
}
