using System.Collections.Generic;

namespace EBot.Config
{
    [ConfigFile("Config/options.json")]
    public class Options : Config
    {
        public List<ulong> DefaultUsers { get; set; }
        public ulong VoiceWaitingRoomId { get; set; }
        public ulong[] VoiceTargetRoomIds { get; set; }
        public string[] ShameMessages { get; set; }
        public string AvailableRoleName { get; set; }
        public string[] SuperShameMessages { get; set; }
        public ulong AvatarEmojiServer { get; set; }
        public string Timezone { get; set; }
    }
}