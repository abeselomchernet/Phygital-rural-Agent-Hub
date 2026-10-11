import { useEffect, useState } from 'react';
import { getPendingEvents, retryEvent, syncEvents, type QueuedEvent } from '../lib/ghostsync';
export default function GhostSyncQueue(){
 const [events,setEvents]=useState<QueuedEvent[]>([]),[notice,setNotice]=useState('');
 const refresh=async()=>setEvents(await getPendingEvents());
 useEffect(()=>{void refresh();const timer=setInterval(refresh,2000);return()=>clearInterval(timer);},[]);
 return <section className="p-6 space-y-4"><h1>GhostSync — synthetic request outbox</h1><p>Offline transport only. Delivery success is not financial settlement. Legacy records remain in their original database and are never uploaded.</p>
 <button onClick={async()=>{await syncEvents();setNotice('Remote delivery disabled. Requests retained; no funds moved.');}}>Check sync availability</button><p role="status">{notice}</p>
 <table><thead><tr><th>Event</th><th>Customer ID</th><th>Transport</th><th>Financial state</th><th>Retry</th></tr></thead><tbody>{events.map(e=><tr key={e.row_key}><td>{e.row_key}</td><td>{e.payload.payload.customerId}</td><td>{e.transportState}</td><td>{e.financialState}</td><td><button onClick={async()=>{await retryEvent(e.row_key);await refresh();}}>Retry locally ({e.retry_count})</button></td></tr>)}</tbody></table></section>;
}
