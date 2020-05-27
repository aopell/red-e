using System;

namespace EBot.Models
{
    public class EStatusChange
    {
        public int Id { get; set; }
        public DateTimeOffset Timestamp { get; set; }
        public ulong UserId { get; set; }
        public Guid EMessage { get; set; }

        public EState NewState { get; set; }
        public DateTimeOffset NewTimeAvailable { get; set; }
        public EState? PrevState { get; set; }
        public DateTimeOffset? PrevTimeAvailable { get; set; }

        public ChangeSource ChangeSource { get; set; }

        public EStatusChange(EStatus current, EStatus prev, ulong userId, EMessage emessage, ChangeSource changeSource)
        {
            Timestamp = DateTimeOffset.Now;
            UserId = userId;
            EMessage = emessage.Id;
            NewState = current.State;
            NewTimeAvailable = current.TimeAvailable;
            PrevState = prev?.State;
            PrevTimeAvailable = prev?.TimeAvailable;
            ChangeSource = changeSource;
        }
    }

    public enum ChangeSource
    {
        EMessageCreate,
        EMessageReaction,
        ConfirmMessageReaction,
        VoiceStatusChange
    }
}