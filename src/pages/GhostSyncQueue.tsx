import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getPendingEvents, syncEvents, clearEvent } from '@/lib/ghostsync';
import { Button } from '@/components/ui/button';
import { HardDriveDownload, AlertCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GhostSyncQueue() {
  const [events, setEvents] = useState<any[]>([]);

  const loadEvents = async () => {
    const evts = await getPendingEvents();
    setEvents(evts);
  };

  useEffect(() => {
    loadEvents();
    const int = setInterval(loadEvents, 2000); // UI poll
    return () => clearInterval(int);
  }, []);

  const handleForceSync = async () => {
    if (!navigator.onLine) {
      toast.error('You are currently offline.');
      return;
    }
    toast.info('Forcing GhostSync sync...');
    await syncEvents();
    loadEvents();
  };

  const handleClear = async (key: string) => {
    await clearEvent(key);
    loadEvents();
    toast.success('Event cleared from queue');
  };

  const handleClearFailed = async () => {
    const failedEvents = events.filter((e) => e.status === 'failed');
    if (failedEvents.length === 0) {
      toast.info('No failed events to clear.');
      return;
    }
    for (const e of failedEvents) {
      await clearEvent(e.row_key);
    }
    loadEvents();
    toast.success(`Cleared ${failedEvents.length} failed events`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900">GhostSync Queue</h1>
          <p className="text-slate-500 mt-2">Offline-first local buffering powered by IndexedDB</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleClearFailed} variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" /> Clear Failed
          </Button>
          <Button onClick={handleForceSync} variant="outline">
            <RefreshCcw className="w-4 h-4 mr-2" /> Force Sync
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <HardDriveDownload className="w-5 h-5 text-slate-500" />
            <CardTitle>Local Outbox</CardTitle>
          </div>
          <CardDescription>Transactions persist here during network outages</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center">
              <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
              <p>Queue is empty. All systems synchronized.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Queued At</TableHead>
                  <TableHead>Retry Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.row_key}>
                    <TableCell className="font-medium text-slate-900">{e.type}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">
                      {new Date(e.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>{e.retry_count}</TableCell>
                    <TableCell>
                      {e.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                      {e.status === 'syncing' && <Badge className="bg-blue-100 text-blue-700">Syncing</Badge>}
                      {e.status === 'failed' && (
                        <Badge variant="destructive" className="flex w-fit items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleClear(e.row_key)}>
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Just a local icon for empty state
function ShieldCheck(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}
