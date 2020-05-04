using Discord;
using Discord.WebSocket;
using EBot.Commands;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace EBot.Models
{
    public class EMessage
    {
        public ulong CreatorId { get; private set; }
        public ulong ChannelId { get; private set; }
        public ulong GuildId { get; private set; }
        public List<ulong> MessageIds { get; private set; }
        public Dictionary<ulong, EStatus> Statuses { get; private set; }
        public DateTimeOffset CreatedTimestamp { get; private set; }
        public DateTimeOffset? ProposedTime { get; private set; }

        [JsonIgnore]
        public IUser Creator => DiscordBot.MainInstance.Client.GetUser(CreatorId);
        [JsonIgnore]
        public ISocketMessageChannel Channel => (ISocketMessageChannel)DiscordBot.MainInstance.Client.GetChannel(ChannelId);
        [JsonIgnore]
        public SocketGuild Guild => DiscordBot.MainInstance.Client.GetGuild(GuildId);

        public EMessage(ulong creatorId, ulong channelId, ulong guildId, DateTimeOffset? proposedTime, IEnumerable<ulong> users)
        {
            CreatorId = creatorId;
            ChannelId = channelId;
            GuildId = guildId;
            MessageIds = new List<ulong>();
            ProposedTime = proposedTime;
            Statuses = new Dictionary<ulong, EStatus>();
            CreatedTimestamp = DateTimeOffset.Now;
            foreach (ulong user in users)
            {
                Statuses.Add(user, EStatus.FromState(EState.Unknown));
            }
        }

        private EMessage() { /* For JSON Serialization */ }
    }

    public class EStatus
    {
        public EState State { get; private set; }
        public DateTimeOffset TimeAvailable { get; private set; }
        public DateTimeOffset TimeUpdated { get; private set; }
        public bool ShamedForLateness { get; set; } = false;

        private EStatus()
        {
            TimeUpdated = DateTimeOffset.Now;
        }

        public static EStatus FromState(EState state, DateTimeOffset? timeAvailable = null)
        {
            DateTimeOffset time = timeAvailable ?? DateTimeOffset.MaxValue;
            return new EStatus
            {
                State = state,
                TimeAvailable = state == EState.AvailableLater ? time : DateTimeOffset.Now
            };
        }
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
}
