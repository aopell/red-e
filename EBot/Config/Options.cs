using System;
using System.Collections.Generic;
using System.Text;

namespace EBot.Config
{
    [ConfigFile("Config/options.json")]
    public class Options : Config
    {
        public List<ulong> DefaultUsers { get; set; }
        public ulong VoiceWaitingRoomId { get; set; }
        public ulong VoiceTargetRoomId { get; set; }
        public string[] ShameMessages { get; set; }
        public string AvailableRoleName { get; set; }
    }
}
