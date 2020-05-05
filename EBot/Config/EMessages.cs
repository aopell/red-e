using EBot.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace EBot.Config
{
    [ConfigFile("config/emessages.json")]
    public class EMessages : Config
    {
        public Dictionary<ulong, EMessage> Messages { get; private set; } = new Dictionary<ulong, EMessage>();
    }
}
