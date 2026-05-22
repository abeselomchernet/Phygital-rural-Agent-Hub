import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addEventToQueue } from '@/lib/ghostsync';
import { toast } from 'sonner';

export default function SwapsLiquidity() {
  const [swaps, setSwaps] = useState<any[]>([]);

  useEffect(() => {
    // Poll for swaps from mock API
    const fetchSwaps = async () => {
      try {
        const res = await fetch('/api/swaps');
        if (res.ok) setSwaps(await res.json());
      } catch (e) {
        console.log('Offline/cannot fetch swaps');
      }
    };
    fetchSwaps();
    const int = setInterval(fetchSwaps, 3000);
    return () => clearInterval(int);
  }, []);

  const triggerManualSwap = async () => {
    try {
      await addEventToQueue('SWAP_EXECUTION', {
        agentId: 'AGT-' + Math.floor(Math.random() * 1000),
        amount: Math.floor(Math.random() * 50000) + 10000,
        currency: 'ETB',
        rail: ['EthSwitch', 'M-Pesa', 'Telebirr'][Math.floor(Math.random() * 3)],
      });
      toast.success('Manual Swap queued for execution');
    } catch(e) {
      toast.error('Failed to queue swap');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900">Swaps & Liquidity</h1>
          <p className="text-slate-500 mt-2">Manage LCR thresholds and execute cross-rail swaps</p>
        </div>
        <Button onClick={triggerManualSwap}>Trigger Manual Swap</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Swaps (Idempotency Enforced)</CardTitle>
          <CardDescription>All transactions routed via NBE RTGS or EthSwitch ISO 20022</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent ID</TableHead>
                <TableHead>Amount (ETB)</TableHead>
                <TableHead>Rail</TableHead>
                <TableHead>Received At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {swaps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-4">No recent swaps found.</TableCell>
                </TableRow>
              )}
              {swaps.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono">{s.agentId}</TableCell>
                  <TableCell>{s.amount.toLocaleString()}</TableCell>
                  <TableCell>{s.rail}</TableCell>
                  <TableCell className="text-slate-500">{new Date(s.received_at).toLocaleTimeString()}</TableCell>
                  <TableCell><Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Completed</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
