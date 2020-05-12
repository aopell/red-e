using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using EBot.Helpers;
using Newtonsoft.Json;

namespace EBot.Models
{
    public class EMessage
    {
        public ulong CreatorId { get; }
        public ulong ChannelId { get; }
        public ulong GuildId { get; }
        public List<ulong> MessageIds { get; }
        public Dictionary<ulong, EStatus> Statuses { get; }
        public DateTimeOffset CreatedTimestamp { get; }
        public bool AvailablePeopleMentioned { get; set; }

        public DateTimeOffset? ProposedTime =>
            (Statuses.GetValueOrDefault(CreatorId)?.TimeAvailable ?? DateTimeOffset.MaxValue) == DateTimeOffset.MaxValue
                ? (DateTimeOffset?)null
                : Statuses.GetValueOrDefault(CreatorId).TimeAvailable;

        [JsonIgnore] public IUser Creator => DiscordBot.MainInstance.Client.GetUser(CreatorId);

        [JsonIgnore] public ISocketMessageChannel Channel => (ISocketMessageChannel)DiscordBot.MainInstance.Client.GetChannel(ChannelId);

        [JsonIgnore] public SocketGuild Guild => DiscordBot.MainInstance.Client.GetGuild(GuildId);

        public EMessage(ulong creatorId, ulong channelId, ulong guildId, EStatus senderStatus, IEnumerable<ulong> users)
        {
            CreatorId = creatorId;
            ChannelId = channelId;
            GuildId = guildId;
            MessageIds = new List<ulong>();
            Statuses = new Dictionary<ulong, EStatus>();
            CreatedTimestamp = DateTimeOffset.Now;
            AvailablePeopleMentioned = false;
            foreach (ulong user in users) Statuses[user] = EStatus.FromState(EState.Unknown);
            if (senderStatus != null) Statuses[creatorId] = senderStatus;
        }

        [JsonConstructor]
        private EMessage(
            ulong creatorId,
            ulong channelId,
            ulong guildId,
            List<ulong> messageIds,
            Dictionary<ulong, EStatus> statuses,
            DateTimeOffset createdTimestamp,
            bool availablePeopleMentioned
        )
        {
            CreatorId = creatorId;
            ChannelId = channelId;
            GuildId = guildId;
            MessageIds = messageIds;
            Statuses = statuses;
            CreatedTimestamp = createdTimestamp;
            AvailablePeopleMentioned = availablePeopleMentioned;
        }

        public async Task AgreeWithCreator(ReactionMessage rm, SocketReaction sr)
        {
            EStatus creatorStatus = Statuses.GetValueOrDefault(CreatorId);
            EState targetState = creatorStatus?.State ?? EState.Unknown;
            switch (targetState)
            {
                case EState.Maybe:
                case EState.Unavailable:
                case EState.AvailableLater:
                case EState.Available:
                    break;
                case EState.Ready:
                    targetState = EState.Available;
                    break;
                case EState.Unknown:
                case EState.Done:
                default:
                    return;
            }

            await EMessageHelper.UpdateEStatus(rm.Channel.Id, sr.UserId, targetState, creatorStatus?.TimeAvailable ?? DateTimeOffset.MaxValue);
        }
    }

    public class EStatus
    {
        public EState State { get; private set; }
        public DateTimeOffset TimeAvailable { get; private set; }
        public DateTimeOffset TimeUpdated { get; }
        public LateState Lateness { get; set; }

        private EStatus() => TimeUpdated = DateTimeOffset.Now;

        [JsonConstructor]
        private EStatus(EState state, DateTimeOffset timeAvailable, DateTimeOffset timeUpdated, LateState lateness)
        {
            State = state;
            TimeAvailable = timeAvailable;
            TimeUpdated = timeUpdated;
            Lateness = lateness;
        }

        public static EStatus FromState(EState state) => FromState(state, DateTimeOffset.MaxValue);

        public static EStatus FromState(EState state, DateTimeOffset timeAvailable) =>
            new EStatus
            {
                State = state,
                TimeAvailable = state == EState.AvailableLater ? timeAvailable : DateTimeOffset.MaxValue
            };
    }

    public enum EState
    {
        Unknown,
        Unavailable,
        Maybe,
        AvailableLater,
        Available,
        Ready,
        Done
    }

    public enum LateState
    {
        NotLate,
        SlightlyLate,
        Late,
        VeryLate
    }
}