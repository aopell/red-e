using System;
using System.Collections.Generic;
using EBot.Models;

namespace EBot.Data
{
    public interface IDataStore
    {
        void SaveEMessage(EMessageMetadata emessage);
        void SaveStatusChange(EStatusChange statusChange);
        IEnumerable<EStatusChange> GetStatusChanges(Guid emessageId);
        IEnumerable<EMessageMetadata> GetEMessages(DateTimeOffset date);
        EMessageMetadata GetEMessage(Guid emessageId);
    }
}