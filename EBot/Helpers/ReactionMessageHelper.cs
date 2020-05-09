using Discord;
using EBot.Commands;
using System;
using System.Collections.Generic;
using System.Text;
using ReactionAction = System.Func<EBot.Helpers.ReactionMessage, Discord.WebSocket.SocketReaction, System.Threading.Tasks.Task>;
using CustomReactionAction = System.Func<EBot.Helpers.ReactionMessage, Discord.WebSocket.SocketReaction, System.Threading.Tasks.Task>;
using PageAction = System.Func<EBot.Helpers.PaginatedMessage, System.Threading.Tasks.Task<(string, Discord.Embed)>>;
using Discord.WebSocket;
using System.Threading.Tasks;
using System.Runtime.Caching;
using System.Linq;
using EBot.Tools;

namespace EBot.Helpers
{
    public static class ReactionMessageHelper
    {
        private static ObjectCache ReactionMessageCache = new MemoryCache("reactionMessages");

        public static void CreatePaginatedMessage(BotCommandContext context, IUserMessage message, int pageCount, int initialPage, PageAction action, int timeout = 300000, Action onTimeout = null)
        {
            if (pageCount == 1) return;
            message.AddReactionsAsync(new[] { new Emoji(PaginatedMessage.FirstPage), new Emoji(PaginatedMessage.PreviousPage), new Emoji(PaginatedMessage.NextPage), new Emoji(PaginatedMessage.LastPage) });

            var paginatedMessage = new PaginatedMessage(context, message, pageCount, initialPage, action);
            ReactionMessageCache.Add(message.Id.ToString(), paginatedMessage, new CacheItemPolicy { SlidingExpiration = TimeSpan.FromMilliseconds(timeout), RemovedCallback = onTimeout == null ? null : (CacheEntryRemovedCallback)(_ => onTimeout()) });
        }

        public static void CreateCustomReactionMessage(BotCommandContext context, IUserMessage message, CustomReactionAction defaultAction, bool allowMultipleReactions = false, bool anyoneCanInteract = false, int timeout = 300000, Action onTimeout = null)
        {
            var reactionMessage = new ReactionMessage(context, message, defaultAction, allowMultipleReactions, anyoneCanInteract);
            ReactionMessageCache.Add(message.Id.ToString(), reactionMessage, new CacheItemPolicy { SlidingExpiration = TimeSpan.FromMilliseconds(timeout), RemovedCallback = onTimeout == null ? null : (CacheEntryRemovedCallback)(_ => onTimeout()) });
        }

        public static void CreateConfirmReactionMessage(BotCommandContext context, IUserMessage message, ReactionAction onPositiveResponse, ReactionAction onNegativeResponse, bool allowMultipleReactions = false, int timeout = 300000, Action onTimeout = null)
        {
            CreateReactionMessage(context, message, new List<(string, ReactionAction)>
            {
                (Strings.ReadyEmoji, onPositiveResponse),
                (Strings.UnavailableEmoji,  onNegativeResponse)
            }, allowMultipleReactions, false, timeout, onTimeout);
        }

        public static void CreateReactionMessage(BotCommandContext context, IUserMessage message, List<(string e, ReactionAction a)> actions, bool allowMultipleReactions = false, bool anyoneCanInteract = false, int timeout = 300000, Action onTimeout = null)
        {
            message.AddReactionsAsync(actions.Select(x => Emote.TryParse(x.e, out Emote emote) ? emote : (IEmote)new Emoji(x.e)).ToArray());
            var reactionMessage = new ReactionMessage(context, message, actions, allowMultipleReactions, anyoneCanInteract);
            ReactionMessageCache.Add(message.Id.ToString(), reactionMessage, new CacheItemPolicy { SlidingExpiration = TimeSpan.FromMilliseconds(timeout), RemovedCallback = onTimeout == null ? null : (CacheEntryRemovedCallback)(_ => onTimeout()) });
        }

        private static ReactionMessage GetReactionMessageById(ulong id)
        {
            if (!ReactionMessageCache.Contains(id.ToString())) return null;

            return ReactionMessageCache.Get(id.ToString()) as ReactionMessage;
        }

        private static void DeleteReactionMessage(ReactionMessage reactionMessage)
        {
            ReactionMessageCache.Remove(reactionMessage.Message.ToString());
        }

        public static async Task HandleReactionMessage(ISocketMessageChannel channel, SocketSelfUser botUser, SocketReaction reaction, IUserMessage message)
        {
            if (message != null && message.Author.Id == botUser.Id && reaction.UserId != botUser.Id)
            {
                var reactionMessage = GetReactionMessageById(message.Id);
                if (reactionMessage != null && (reactionMessage.AnyoneCanInteract || reaction.UserId == reactionMessage.Context.User.Id) && (reactionMessage.AcceptsAllReactions || reactionMessage.AcceptedReactions.Contains(reaction.Emote.ToString())))
                {
                    try
                    {
                        await reactionMessage.RunAction(reaction);
                    }
                    catch (Exception ex)
                    {
                        await ExceptionMessageHelper.HandleException(ex, channel);
                    }

                    if (reactionMessage.AllowMultipleReactions)
                    {
                        await message.RemoveReactionAsync(reaction.Emote, reaction.UserId);
                    }
                    else
                    {
                        DeleteReactionMessage(reactionMessage);
                        try
                        {
                            await message.RemoveAllReactionsAsync();
                        }
                        catch { }
                    }
                }
                else if (reactionMessage != null && reaction.User.IsSpecified)
                {
                    await message.RemoveReactionAsync(reaction.Emote, reaction.User.Value);
                }
            }
        }
    }

    public class ReactionMessage
    {
        public BotCommandContext Context { get; }
        public IUserMessage Message { get; }
        public bool AllowMultipleReactions { get; }
        public bool AcceptsAllReactions { get; }
        public bool AnyoneCanInteract { get; }
        public virtual IEnumerable<string> AcceptedReactions => Actions.Select(x => x.emoji);
        protected CustomReactionAction DefaultAction { get; }
        protected List<(string emoji, ReactionAction action)> Actions { get; }

        public ReactionMessage(BotCommandContext context, IUserMessage message, CustomReactionAction defaultAction, bool allowMultipleReactions = false, bool anyoneCanInteract = false)
        {
            Context = context;
            Message = message;
            DefaultAction = defaultAction;
            AllowMultipleReactions = allowMultipleReactions;
            AcceptsAllReactions = true;
            AnyoneCanInteract = anyoneCanInteract;
        }

        public ReactionMessage(BotCommandContext context, IUserMessage message, List<(string, ReactionAction)> actions, bool allowMultipleReactions = false, bool anyoneCanInteract = false)
        {
            Context = context;
            Message = message;
            Actions = actions;
            AllowMultipleReactions = allowMultipleReactions;
            AcceptsAllReactions = false;
            AnyoneCanInteract = anyoneCanInteract;
        }

        public virtual async Task RunAction(SocketReaction reaction)
        {
            string text = reaction.Emote.ToString();
            if (AcceptsAllReactions)
            {
                await DefaultAction(this, reaction);
            }
            else
            {
                var emojiAction = Actions.FirstOrDefault(x => x.emoji == text);
                if (emojiAction != default)
                {
                    await emojiAction.action(this, reaction);
                }
            }
        }
    }

    public class PaginatedMessage : ReactionMessage
    {
        public const string FirstPage = "⏪";
        public const string LastPage = "⏩";
        public const string PreviousPage = "◀";
        public const string NextPage = "▶";

        public int PageCount { get; }
        public int CurrentPage { get; private set; }
        public PageAction OnChage { get; }
        public override IEnumerable<string> AcceptedReactions => new[] { FirstPage, LastPage, PreviousPage, NextPage };

        public PaginatedMessage(BotCommandContext context, IUserMessage message, int count, int initial, PageAction action) : base(context, message, new List<(string, ReactionAction)>(), true)
        {
            if (count < 1) throw new ArgumentOutOfRangeException(nameof(count));
            if (initial < 1 || initial > count) throw new ArgumentOutOfRangeException(nameof(initial));

            PageCount = count;
            CurrentPage = initial;
            OnChage = action;
        }

        public override async Task RunAction(SocketReaction reaction)
        {
            switch (reaction.ToString())
            {
                case FirstPage:
                    if (CurrentPage == 1) return;
                    CurrentPage = 1;
                    break;
                case LastPage:
                    if (CurrentPage == PageCount) return;
                    CurrentPage = PageCount;
                    break;
                case PreviousPage:
                    if (CurrentPage == 1) return;
                    CurrentPage--;
                    break;
                case NextPage:
                    if (CurrentPage == PageCount) return;
                    CurrentPage++;
                    break;
            }

            (string text, Embed embed) = await OnChage(this);

            await Message.ModifyAsync(m =>
            {
                m.Content = text;
                m.Embed = embed;
            });
        }
    }
}
