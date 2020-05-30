using System;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;

namespace EBot.Config
{
    public static class ConfigFileManager
    {
        public static void LoadConfigFiles(object target)
        {
            var configs = Assembly.GetExecutingAssembly().GetTypes().Where(x => x.IsClass && x.IsSubclassOf(typeof(Config)));
            foreach (PropertyInfo property in target.GetType().GetProperties().Where(x => x.PropertyType.IsSubclassOf(typeof(Config))))
            {
                string filePath = property.PropertyType.GetCustomAttribute<ConfigFileAttribute>().FileName;

                if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath)) continue;
                object c = JsonConvert.DeserializeObject(File.ReadAllText(filePath), property.PropertyType) ??
                           Activator.CreateInstance(property.PropertyType);
                property.SetValue(target, c);
            }
        }
    }
}