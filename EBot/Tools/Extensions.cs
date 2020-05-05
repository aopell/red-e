using Discord;
using Discord.WebSocket;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace EBot.Tools
{
    public static class Extensions
    {
        public static string NicknameOrUsername(this SocketGuild guild, ulong userId) => NicknameOrUsername(guild.GetUser(userId));

        public static string NicknameOrUsername(this IUser user)
        {
            if (user == null) return null;
            return user is IGuildUser gu && !string.IsNullOrEmpty(gu.Nickname) ? gu.Nickname : user.Username;
        }

        public static T Random<T>(this IEnumerable<T> enumerable)
        {
            return enumerable.OrderBy(x => Guid.NewGuid()).First();
        }

        public static T RandomOrDefault<T>(this IEnumerable<T> enumerable)
        {
            return enumerable.OrderBy(x => Guid.NewGuid()).FirstOrDefault();
        }
    }
}
