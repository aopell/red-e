using System;
using System.Threading;

namespace EBot.Config
{
    public struct WriteLock : IDisposable
    {
        private readonly bool lockHeld;
        private readonly ReaderWriterLockSlim rwLock;

        public WriteLock(ReaderWriterLockSlim rwLock)
        {
            this.rwLock = rwLock;
            rwLock.EnterWriteLock();
            lockHeld = true;
        }

        public void Dispose()
        {
            if (lockHeld) rwLock.ExitWriteLock();
        }
    }
}