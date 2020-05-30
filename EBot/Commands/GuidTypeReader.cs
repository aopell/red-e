using Discord.Commands;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace EBot.Commands
{
    public class GuidTypeReader : TypeReader
    {
        public override Task<TypeReaderResult> ReadAsync(ICommandContext context, string input, IServiceProvider services)
        {
            if (Guid.TryParse(input, out Guid result))
            {
                return Task.FromResult(TypeReaderResult.FromSuccess(result));
            }

            return Task.FromResult(TypeReaderResult.FromError(CommandError.ParseFailed, "Input could not be parsed as a Guid"));
        }
    }
}
