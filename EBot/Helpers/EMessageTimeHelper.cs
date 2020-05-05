using System;
using System.Linq;
using E;
using EBot.Models;
using Hime.Redist;

namespace EBot.Helpers
{
    public static class EMessageTimeHelper
    {
        public static EStatus Read(ASTNode node)
        {
            return node.Symbol.ID switch
            {
                EParser.ID.VariableTime => ReadTime(node),
                EParser.ID.VariableIn => ReadIn(node),
                EParser.ID.VariableNow => EStatus.FromState(EState.Available),
                _ => EStatus.FromState(EState.Unknown)
            };
        }

        public static EStatus ReadIn(ASTNode node)
        {
            ASTNode child = node.Children.First();

            return child.Symbol.ID switch
            {
                EParser.ID.VariableN => ReadN(child),
                _ => EStatus.FromState(EState.Unknown)
            };
        }

        public static EStatus ReadN(ASTNode node)
        {
            ASTNode number = node.Children[0];

            int time = int.Parse(number.Value);

            ASTNode timeInterval = node.Children[1];
            
            return EStatus.FromState(EState.AvailableLater, DateTimeOffset.Now + (timeInterval.Symbol.ID == EParser.ID.VariableNhours ? TimeSpan.FromHours(time) : TimeSpan.FromMinutes(time)));
        }
        
        public  static EStatus ReadTime(ASTNode node)
        {
            ASTFamily children = node.Children;

            ASTNode time = children.First();

            TimeSpan ampm = DateTime.Now.Hour < 12 ? new TimeSpan(0, 0, 0) : new TimeSpan(12, 0, 0);

            if (time.Symbol.ID == ELexer.ID.TerminalTexttime)
            {
                return EStatus.FromState(EState.AvailableLater, DateTime.Today + ampm + TexttimeOffset(time.Value));
            }
            
            int minute = 0;

            if (children.Count == 2) minute = int.Parse(children.ElementAt(1).Value);

            int hour = int.Parse(time.Value);

            return EStatus.FromState(EState.AvailableLater, DateTime.Today + ampm + new TimeSpan(hour, minute, 0));
        }

        public static TimeSpan TexttimeOffset(string texttime)
        {
            return texttime switch
            {
                "one" => TimeSpan.FromHours(1),
                "two" => TimeSpan.FromHours(2),
                "three" => TimeSpan.FromHours(3),
                "four" => TimeSpan.FromHours(4),
                "five" => TimeSpan.FromHours(5),
                "six" => TimeSpan.FromHours(6),
                "seven" => TimeSpan.FromHours(7),
                "eight" => TimeSpan.FromHours(8),
                "nine" => TimeSpan.FromHours(9),
                "ten" => TimeSpan.FromHours(10),
                "eleven" => TimeSpan.FromHours(11),
                "twelve" => TimeSpan.FromHours(12),
                "noon" => TimeSpan.FromHours(12),
                "midnight" => TimeSpan.FromHours(12),
                _ => TimeSpan.FromHours(-1)
            };
        }
    }
}