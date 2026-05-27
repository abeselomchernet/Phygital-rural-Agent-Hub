import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface GhostSyncDB extends DBSchema {
  outbox: {
    key: string;
    value: {
      row_key: string;
      type: string;
      payload: any;
      created_at: string;
      status: 'pending' | 'syncing' | 'failed';
      retry_count: number;
    };
    indexes: { 'by-status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<GhostSyncDB>> | null = null;

function getDb(): Promise<IDBPDatabase<GhostSyncDB>> {
  if (!dbPromise && typeof window !== 'undefined') {
    dbPromise = openDB<GhostSyncDB>('GhostSyncDB', 1, {
      upgrade(db) {
        const store = db.createObjectStore('outbox', {
          keyPath: 'row_key',
        });
        store.createIndex('by-status', 'status');
      },
    });
  }
  if (!dbPromise) throw new Error("DB not initialized");
  return dbPromise;
}

export function initGhostSync() {
  getDb();
}

export async function addEventToQueue(type: string, payload: any) {
  const db = await getDb();
  const row_key = crypto.randomUUID();
  await db.put('outbox', {
    row_key,
    type,
    payload,
    created_at: new Date().toISOString(),
    status: 'pending',
    retry_count: 0
  });

  // Try to sync immediately
  syncEvents();
  return row_key;
}

export async function getPendingEvents() {
  const db = await getDb();
  return db.getAll('outbox'); // showing all events including failed for demo
}

export async function clearEvent(row_key: string) {
  const db = await getDb();
  await db.delete('outbox', row_key);
}

export async function retryEvent(row_key: string) {
  const db = await getDb();
  const event = await db.get('outbox', row_key);
  if (event) {
    event.status = 'pending';
    event.retry_count = 0;
    await db.put('outbox', event);
    // Trigger sync immediately in background
    syncEvents();
  }
}

export async function syncEvents() {
  if (!navigator.onLine) return;

  const db = await getDb();
  const events = await db.getAllFromIndex('outbox', 'by-status', 'pending');
  // also grab failed if we want to retry
  const failed = await db.getAllFromIndex('outbox', 'by-status', 'failed');
  
  const toSync = [...events, ...failed.filter(e => e.retry_count < 5)];

  if (toSync.length === 0) return;

  // mark as syncing
  for (const event of toSync) {
    event.status = 'syncing';
    await db.put('outbox', event);
  }

  try {
    // Chaos Engineering: Network Partition Simulation
    if (localStorage.getItem('CHAOS_NETWORK_PARTITION') === 'true') {
      throw new Error('CHAOS_NETWORK_PARTITION: Synthetic offline mode triggered.');
    }

    const res = await fetch('/api/ghostsync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: toSync })
    });
    
    if (res.ok) {
      const { processed } = await res.json();
      // Remove successfully processed
      for (const p of processed) {
        if (p.status === 'success') {
          await db.delete('outbox', p.row_key);
        }
      }
      
      const timestamp = new Date().toISOString();
      localStorage.setItem('ghostsync_last_success', timestamp);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ghostsync:success', { detail: { timestamp } }));
      }
    } else {
      throw new Error('Sync failed');
    }
  } catch (err) {
    console.error('GhostSync error:', err);
    // Mark back as pending/failed
    for (const event of toSync) {
      event.status = 'failed';
      event.retry_count += 1;
      await db.put('outbox', event);
    }
  }
}

// In a real app, bind this to window.addEventListener('online', syncEvents);
