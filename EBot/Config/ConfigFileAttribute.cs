using System;

namespace EBot.Config
{
    public class ConfigFileAttribute : Attribute
    {
        public string FileName { get; }

        public ConfigFileAttribute(string fileName) => FileName = fileName;
    }
}