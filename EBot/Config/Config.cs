using System.IO;
using System.Reflection;
using System.Threading;
using Newtonsoft.Json;

namespace EBot.Config
{
    public abstract class Config
    {
        private ReaderWriterLockSlim rwLock { get; }
        private string fileName => GetType().GetCustomAttribute<ConfigFileAttribute>().FileName;

        protected Config() => rwLock = new ReaderWriterLockSlim();

        public void SaveConfig()
        {
            using (new WriteLock(rwLock))
            {
                File.WriteAllText(fileName, JsonConvert.SerializeObject(this, Formatting.Indented));
            }
        }
    }
}