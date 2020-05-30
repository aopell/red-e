using System;
using System.Collections.Generic;
using System.Linq;
using EBot.Models;
using LiteDB;

namespace EBot.Data
{
    public class LiteDbDataStore : IDataStore
    {
        private string FilePath { get; }
        private const string EMessageCollectionName = "emessages";
        private const string StatusChangeCollectionName = "statuses";

        public LiteDbDataStore(string filePath)
        {
            FilePath = filePath;
        }

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
            return statuses.Find(x => x.EMessage == emessageId).ToList();
        }

        public IEnumerable<EMessageMetadata> GetEMessages(DateTimeOffset date)
        {
            using var db = new LiteDatabase(FilePath);
            var emessages = db.GetCollection<EMessageMetadata>(EMessageCollectionName);
            emessages.EnsureIndex(x => x.CreatedTimestamp);
            var all = emessages.FindAll();
            return all.Where(x => x.CreatedTimestamp.LocalDateTime.Date == date.LocalDateTime.Date).ToList();
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