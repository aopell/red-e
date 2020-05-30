namespace EBot.Config
{
    [ConfigFile("Config/secret.json")]
    public class Secret : Config
    {
        public string Token { get; set; }
    }
}