using System;
using System.Collections.Generic;
using EBot.Models;

namespace EBot.Tools
{
    public static class Strings
    {
        public const string UnknownEmoji = "<:unknown:706271972983701524>";
        public const string ReadyEmoji = "<:ready:706270984973451295>";
        public const string AvailableEmoji = "<:available:706270615312662568>";
        public const string MaybeEmoji = "<:maybe:706702223446376517>";
        public const string UnavailableEmoji = "<:unavailable:706702240467124345>";
        public const string SleepEmoji = "<:sleep:706705461486944348>";

        public const string AgreeEmoji = "<:agree:707079412343898192>";
        public const string FiveMinutesEmoji = "<:fiveminutes:706000163738484756>";
        public const string FifteenMinutesEmoji = "<:fifteenminutes:706000163562323979>";
        public const string OneHourEmoji = "<:onehour:706000163688153088>";
        public const string TwoHoursEmoji = "<:twohours:706000163596009514>";

        public const string TenOClockEmoji = "<:tenoclock:706000163801399346>";
        public const string ElevenOClockEmoji = "<:elevenoclock:706000163142893639>";
        public const string TwelveOClockEmoji = "<:twelveoclock:706000163826565200>";

        public const string WaitingEmoji = "⌛";
        public const string LateEmoji = "⏰";

        public static readonly Dictionary<string, string> EmojiStatusMessages = new Dictionary<string, string>
        {
            [UnknownEmoji] = "{0}'s status is unknown",
            [ReadyEmoji] = "{0} is ready",
            [AvailableEmoji] = "{0} is available now",
            [MaybeEmoji] = "{0} is not sure yet",
            [UnavailableEmoji] = "{0} is not available",
            [SleepEmoji] = "{0} is done for now",
            [AgreeEmoji] = "{0} has agreed with the original proposition",
            [FiveMinutesEmoji] = "{0} needs five more minutes",
            [FifteenMinutesEmoji] = "{0} needs fifteen more minutes",
            [OneHourEmoji] = "{0} needs an hour",
            [TwoHoursEmoji] = "{0} needs two hours",
            [TenOClockEmoji] = "{0} will be available at 10 PM",
            [ElevenOClockEmoji] = "{0} will be available at 11 PM",
            [TwelveOClockEmoji] = "{0} will be available at 12 AM"
        };

        public static string GetStatusMessage(EStatus status)
        {
            return status.State switch
            {
                EState.Unavailable => $"{UnavailableEmoji} Unavailable",
                EState.Maybe => $"{MaybeEmoji} Maybe Later",
                EState.AvailableLater => getAvailableLaterStatus(status.TimeAvailable),
                EState.Available => $"{AvailableEmoji} Available Now",
                EState.Ready => $"{ReadyEmoji} Ready (In Voice)",
                EState.Done => $"{SleepEmoji} {(status.TimeUpdated.Hour >= 20 || status.TimeUpdated.Hour <= 5 ? "Sleeeep" : "eeeed")}",
                _ => $"{UnknownEmoji} Unknown",
            };

            static string getAvailableLaterStatus(DateTimeOffset time)
            {
                TimeSpan span = time - DateTimeOffset.Now;
                bool late = span.Ticks < 0;
                if (late) span = span.Negate();

                return
                    $"{(late ? LateEmoji : WaitingEmoji)} {(span.TotalHours >= 1 ? $"{(int)span.TotalHours} hour{(span.TotalHours >= 2 ? "s" : "")} " : "")}{span.Minutes} min{(span.Minutes != 1 ? "s" : "")}{(late ? " late" : "")}";
            }
        }
    }
}