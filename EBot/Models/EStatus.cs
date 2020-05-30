using System;
using Newtonsoft.Json;

namespace EBot.Models
{
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