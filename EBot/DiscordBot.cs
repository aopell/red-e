using Discord;
using Discord.Commands;
using Discord.WebSocket;
using Ebot.Commands;
using EBot.Config;
using EBot.Helpers;
using Hime.Redist;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace EBot
{
    public class DiscordBot
    {
        public static DiscordBot MainInstance = null;
        public DiscordSocketClient Client { get; private set; }
        public Secret Secret { get; private set; }
        public Options Options { get; private set; }

        public static async Task Main()
        {
            var test = new string[]
            {
                "can anyone e?",
                "e?",
                "e like now?",
                "eeeeee?",
                "eee now?",
                "e soon?",
                "e in like an hour?",
                "e within like 20?",
                "eee before like ten?",
                "e before noon?",
                "e within an hour?",
                "eeeeeee soon?",
                "e tonight?",
                "eee tonight?",
                "e later?",
                "eeee later?",
                "eeee in 10?",
                "ee in 5?",
                "e in an hour?",
                "ee at 8?",
                "eee at six?",
                "eee at noon?",
                "e at midnight?",
                "eee at 11:30 ?",
                "ee at 8:30 ?",
                "eee eventually ?",
                "e eventualeee ?",
                "eee in 2 hours?",
                "eee in three hours?",
                "e in 20 mins?",
                "eee in ten minutes?",
                "eee in 30 minutes?",
                "ee in a few?",
                "eee in a while?",
                "eeee in a bit?",
                "eee in a minute?",
                "ee in a few mins?",
                "eee in a few minutes?",
                "eee in like 10 - 20 ?",
                "eee in 5 - 15 ?",
                "eee in 5-15?",
                "eeeeeeeeeeeeeeeee at like 9-10?",
                "eeeeeventualeeeee?",
                "e eventualleeeeee?",
                "e eeeeeventualeeee?",
                "eeen maybeeee a bit?",
                "eeen like a while?",
                "eeeeeeeee in maybeeeee a few?",
                "eeee in a couple mins?",
                "eeeen a flash?",
                "eee in like a hot second?",
                "eee sooooooooooon?",
                "y'all wanna e?",
                "can anyone e tonight?",
                "any of yall motherfuckers actually want to e?",
                "how about eeeeen like 20?",
                "y'all want to play something eeeeventualleeee?",
                "can anyone e at maybe 9-9:30???"
            };

            foreach (var s in test)
            {
                Console.WriteLine(s);
                var parse = new E.EParser(new E.ELexer(s)).Parse();
                if (parse.IsSuccess)
                {
                    Print(parse.Root, new bool[] { });
                }
                else
                {
                    foreach (var e in parse.Errors)
                    {
                        Console.WriteLine(e.ToString());
                    }
                }
                Console.WriteLine();
            }


            AppDomain.CurrentDomain.UnhandledException += CurrentDomain_UnhandledException;
            AppDomain.CurrentDomain.ProcessExit += CurrentDomain_ProcessExit;

            MainInstance = new DiscordBot();

            ConfigFileManager.LoadConfigFiles(MainInstance);
            MainInstance.Client = new DiscordSocketClient();

            MainInstance.Client.Log += MainInstance.Log;
            MainInstance.Client.Ready += MainInstance.Client_Ready;
            MainInstance.Client.ReactionAdded += MainInstance.Client_ReactionAdded;
            MainInstance.Client.UserVoiceStateUpdated += EMessageHelper.UserVoiceStateUpdated;
            MainInstance.Client.MessageReceived += EMessageHelper.MessageRecevied;


            await MainInstance.Client.LoginAsync(TokenType.Bot, MainInstance.Secret.Token);
            await MainInstance.Client.StartAsync();

            var ch = new CommandHandler(
                MainInstance.Client,
                new CommandService(
                    new CommandServiceConfig()
                    {
                        CaseSensitiveCommands = false,
                        LogLevel = LogSeverity.Info
                    }
                ),
                MainInstance
            );

            await ch.InstallCommandsAsync();

            await Task.Delay(-1);
        }

        private static void Print(ASTNode node, bool[] crossings)
        {
            for (int i = 0; i < crossings.Length - 1; i++)
                Console.Write(crossings[i] ? "|   " : "    ");
            if (crossings.Length > 0)
                Console.Write("+-> ");
            Console.WriteLine(node.ToString());
            for (int i = 0; i != node.Children.Count; i++)
            {
                bool[] childCrossings = new bool[crossings.Length + 1];
                Array.Copy(crossings, childCrossings, crossings.Length);
                childCrossings[childCrossings.Length - 1] = (i < node.Children.Count - 1);
                Print(node.Children[i], childCrossings);
            }
        }

        private Task Client_Ready()
        {
            MinuteTimer();
            return Task.CompletedTask;
        }

        public Task Log(LogMessage arg)
        {
            Console.WriteLine(arg.ToString());
            return Task.CompletedTask;
        }

        private async Task MinuteTimer()
        {
            while (true)
            {
                await EMessageHelper.UpdateEMessages();
                await Task.Delay(TimeSpan.FromMinutes(1));
            }
        }

        private async Task Client_ReactionAdded(Cacheable<IUserMessage, ulong> cachedMessage, ISocketMessageChannel channel, SocketReaction reaction)
        {
            var message = await cachedMessage.GetOrDownloadAsync();
            await ReactionMessageHelper.HandleReactionMessage(channel, Client.CurrentUser, reaction, message);
        }

        private static void CurrentDomain_ProcessExit(object sender, EventArgs e)
        {
            // Called on program close, should log this somewhere?
        }

        private static void CurrentDomain_UnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            // Called on unhandled exception, should log this somewhere
        }
    }
}
