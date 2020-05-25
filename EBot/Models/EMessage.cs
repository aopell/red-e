using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Discord;
using Discord.WebSocket;
using EBot.Helpers;
using Newtonsoft.Json;

namespace EBot.Models
{
    public class EMessageMetadata
    {
        public Guid Id { get; protected set; }
        public DateTimeOffset CreatedTimestamp { get; protected set; }
        public ulong CreatorId { get; protected set; }
        public ulong ChannelId { get; protected set; }
        public ulong GuildId { get; protected set; }

        public EMessageMetadata() { }

        public EMessageMetadata(EMessage emessage)
        {
            Id = emessage.Id;
            CreatedTimestamp = emessage.CreatedTimestamp;
            CreatorId = emessage.CreatorId;
            ChannelId = emessage.ChannelId;
            GuildId = emessage.GuildId;
        }
    }

    public class EMessage : EMessageMetadata
    {
        public List<ulong> MessageIds { get; }
        public Dictionary<ulong, EStatus> Statuses { get; }
        public bool AvailablePeopleMentioned { get; set; }

        public DateTimeOffset? ProposedTime =>
            (Statuses.GetValueOrDefault(CreatorId)?.TimeAvailable ?? DateTimeOffset.MaxValue) == DateTimeOffset.MaxValue
                ? (DateTimeOffset?)null
                : Statuses.GetValueOrDefault(CreatorId).TimeAvailable;

        [JsonIgnore] public IUser Creator => DiscordBot.MainInstance.Client.GetUser(CreatorId);

        [JsonIgnore] public ISocketMessageChannel Channel => (ISocketMessageChannel)DiscordBot.MainInstance.Client.GetChannel(ChannelId);

        [JsonIgnore] public SocketGuild Guild => DiscordBot.MainInstance.Client.GetGuild(GuildId);

        [JsonIgnore] public EMessageMetadata Metadata => new EMessageMetadata(this);

        public EMessage(ulong creatorId, ulong channelId, ulong guildId, EStatus senderStatus, IEnumerable<ulong> users)
        {
            Id = Guid.NewGuid();
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
            Guid id,
            ulong creatorId,
            ulong channelId,
            ulong guildId,
            List<ulong> messageIds,
            Dictionary<ulong, EStatus> statuses,
            DateTimeOffset createdTimestamp,
            bool availablePeopleMentioned
        )
        {
            Id = id;
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

            await EMessageHelper.UpdateEStatus(rm.Channel.Id, sr.UserId, targetState, creatorStatus?.TimeAvailable ?? DateTimeOffset.MaxValue, ChangeSource.EMessageReaction);
        }
    }
}