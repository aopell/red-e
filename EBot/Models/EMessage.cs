using EBot.Commands;
using System;
using System.Collections.Generic;
using System.Text;
using E;

namespace EBot.Models
{
    public class EMessage
    {
        public BotCommandContext Context { get; set; }
        public Dictionary<ulong, EStatus> Statuses { get; set; }
        public DateTimeOffset CreatedTimestamp { get; }
        public DateTimeOffset? TargetTime { get; }
        public ulong Creator { get; }

        public EMessage(BotCommandContext context, EStatus senderStatus, IEnumerable<ulong> users)
        {
            Creator = context.User.Id;
            Context = context;
            TargetTime = senderStatus?.TimeAvailable;
            Statuses = new Dictionary<ulong, EStatus> { { Creator, senderStatus } };
            CreatedTimestamp = DateTimeOffset.Now;
            foreach (ulong user in users)
            {
                Statuses.Add(user, EStatus.FromState(EState.Unknown));
            }
        }
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

        public static EStatus FromState(EState state)
        {
            return FromState(state, DateTimeOffset.MaxValue);
        }
        
        public static EStatus FromState(EState state, DateTimeOffset timeAvailable)
        {
            return new EStatus
            {
                State = state,
                TimeAvailable = state == EState.AvailableLater ? timeAvailable : DateTimeOffset.Now
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
