using System.Collections.Generic;
using EBot.Models;

namespace EBot.Config
{
    [ConfigFile("config/emessages.json")]
    public class EMessages : Config
    {
        public Dictionary<ulong, EMessage> Messages { get; set; } = new Dictionary<ulong, EMessage>();
    }
}