using System;
using System.Collections.Generic;
using System.Text;
using EBot.Models;
using LiteDB;

namespace EBot.Data
{
    public class LiteDbDataStore : IDataStore
    {
        private const string FilePath = "edata.db";
        private const string EMessageCollectionName = "emessages";
        private const string StatusChangeCollectionName = "statuses";

        public void SaveEMessage(EMessageMetadata emessage)
        {
            using var db = new LiteDatabase(FilePath);
            var emessages = db.GetCollection<EMessageMetadata>(EMessageCollectionName);
            emessages.Insert(emessage is EMessage e ? e.Metadata : emessage);
        }

        public void SaveStatusChange(EStatusChange statusChange)
        {
            using var db = new LiteDatabase(FilePath);
            var statuses = db.GetCollection<EStatusChange>(StatusChangeCollectionName);
            statuses.Insert(statusChange);
        }

        public IEnumerable<EStatusChange> GetStatusChanges(Guid emessageId)
        {
            using var db = new LiteDatabase(FilePath);
            var statuses = db.GetCollection<EStatusChange>(StatusChangeCollectionName);
            statuses.EnsureIndex(x => x.EMessage);
            return statuses.Find(x => x.EMessage == emessageId);
        }

        public IEnumerable<EMessageMetadata> GetEMessages(DateTimeOffset date, TimeSpan searchRadius)
        {
            using var db = new LiteDatabase(FilePath);
            var emessages = db.GetCollection<EMessageMetadata>(EMessageCollectionName);
            emessages.EnsureIndex(x => x.CreatedTimestamp);
            return emessages.Find(x => x.CreatedTimestamp >= date - searchRadius && x.CreatedTimestamp <= date + searchRadius);
        }

        public EMessageMetadata GetEMessage(Guid emessageId)
        {
            using var db = new LiteDatabase(FilePath);
            var emessages = db.GetCollection<EMessageMetadata>(EMessageCollectionName);
            emessages.EnsureIndex(x => x.Id);
            return emessages.FindOne(x => x.Id == emessageId);
        }
    }
}
