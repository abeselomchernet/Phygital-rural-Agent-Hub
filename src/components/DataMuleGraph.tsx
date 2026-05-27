import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { toast } from 'sonner';
import { 
  Settings, Radio, Zap, Heart, Database, AlertCircle, 
  HelpCircle, Sparkles, Battery, RefreshCw, Send, CheckCircle2,
  X, Compass, Truck, Play, Pause
} from 'lucide-react';

// Definitions for typescript compliance
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'hub' | 'mule' | 'kiosk';
  status: 'ONLINE' | 'OFFLINE_PENDING' | 'SYNCING' | 'FAILED';
  battery?: number;
  txns?: number;
  bytes?: string;
  signalStrength?: number; // dBm (e.g., -40 is excellent, -90 is terrible)
  lastSync?: string;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  signal: number; // dBm strength
  type: 'mesh' | 'phy'; // wireless mesh or physical road travel
}

// Initial Nodes static seed
const INITIAL_NODES: GraphNode[] = [
  { id: 'hub-central', name: 'Modjo Command Hub', type: 'hub', status: 'ONLINE', battery: 100, txns: 1250, bytes: '124.5 MB', signalStrength: -30, lastSync: 'Continuous' },
  
  // Data Mules
  { id: 'mule-truck-a', name: 'Adama Logistics Truck (Mule-01)', type: 'mule', status: 'SYNCING', battery: 94, txns: 142, bytes: '4.5 MB', signalStrength: -45, lastSync: 'Just now' },
  { id: 'mule-moto-b', name: 'Mojo Rural Moto (Mule-02)', type: 'mule', status: 'ONLINE', battery: 85, txns: 42, bytes: '1.2 MB', signalStrength: -58, lastSync: '4m ago' },
  
  // Kiosks connected to Mule A
  { id: 'kiosk-adama-01', name: 'Zinash Corn Dealer', type: 'kiosk', status: 'ONLINE', battery: 72, txns: 32, bytes: '820 KB', signalStrength: -51, lastSync: '2m ago' },
  { id: 'kiosk-adama-02', name: 'Awash Arable Cooperatives', type: 'kiosk', status: 'SYNCING', battery: 45, txns: 18, bytes: '340 KB', signalStrength: -68, lastSync: '10s ago' },
  { id: 'kiosk-adama-03', name: 'Bekele T. Grain Storage', type: 'kiosk', status: 'OFFLINE_PENDING', battery: 14, txns: 54, bytes: '1.1 MB', signalStrength: -84, lastSync: '14h ago' },

  // Kiosks connected to Mule B
  { id: 'kiosk-mojo-01', name: 'Alemu Mill & Sift', type: 'kiosk', status: 'ONLINE', battery: 98, txns: 15, bytes: '210 KB', signalStrength: -55, lastSync: '6m ago' },
  { id: 'kiosk-mojo-02', name: 'Meki South Agri Depot', type: 'kiosk', status: 'OFFLINE_PENDING', battery: 65, txns: 8, bytes: '120 KB', signalStrength: -79, lastSync: '2d ago' },
  { id: 'kiosk-mojo-03', name: 'Chala East Wheat Kiosk', type: 'kiosk', status: 'FAILED', battery: 6, txns: 88, bytes: '2.4 MB', signalStrength: -93, lastSync: '5d ago' },
];

const INITIAL_LINKS: GraphLink[] = [
  { source: 'mule-truck-a', target: 'hub-central', signal: -45, type: 'mesh' },
  { source: 'mule-moto-b', target: 'hub-central', signal: -58, type: 'mesh' },
  
  { source: 'kiosk-adama-01', target: 'mule-truck-a', signal: -51, type: 'mesh' },
  { source: 'kiosk-adama-02', target: 'mule-truck-a', signal: -68, type: 'mesh' },
  { source: 'kiosk-adama-03', target: 'mule-truck-a', signal: -84, type: 'phy' },

  { source: 'kiosk-mojo-01', target: 'mule-moto-b', signal: -55, type: 'mesh' },
  { source: 'kiosk-mojo-02', target: 'mule-moto-b', signal: -79, type: 'phy' },
  { source: 'kiosk-mojo-03', target: 'mule-moto-b', signal: -93, type: 'phy' },
];

export default function DataMuleGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Graph States
  const [nodes, setNodes] = useState<GraphNode[]>(JSON.parse(JSON.stringify(INITIAL_NODES)));
  const [links, setLinks] = useState<GraphLink[]>(JSON.parse(JSON.stringify(INITIAL_LINKS)));
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  
  // Forces Controllers States
  const [chargeStrength, setChargeStrength] = useState(-250);
  const [linkDistance, setLinkDistance] = useState(80);
  const [gravityStrength, setGravityStrength] = useState(0.08);
  const [colRadius, setColRadius] = useState(30);
  
  // Simulation Controls State
  const [isSimulationActive, setIsSimulationActive] = useState(true);
  const [currentSyncProgress, setCurrentSyncProgress] = useState<number | null>(null);
  const [syncPhase, setSyncPhase] = useState<'idle' | 'transmitting' | 'writing' | 'done'>('idle');
  const [pingPulseId, setPingPulseId] = useState<string | null>(null);

  // SVG dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });
  const d3SimRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Dynamic resizing
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDimensions({
          width: Math.max(rect.width, 360),
          height: Math.max(rect.height - 40, 360)
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Set up & run original D3 Force Simulation
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Define patterns & gradient shaders
    const defs = svg.append('defs');
    
    // Laser glows
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    filter.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    // Central hub radial pulse
    const radialGrad = defs.append('radialGradient')
      .attr('id', 'hubPulseGrad')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    radialGrad.append('stop').attr('offset', '0%').attr('stop-color', '#c084fc').attr('stop-opacity', '0.8');
    radialGrad.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1').attr('stop-opacity', '0');

    // Create central force-directed layout simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(colRadius))
      .force('x', d3.forceX(width / 2).strength(gravityStrength))
      .force('y', d3.forceY(height / 2).strength(gravityStrength));

    d3SimRef.current = simulation;

    // Zoom and Drag modifiers
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Main drawing group
    const g = svg.append('g').attr('class', 'main-scene');

    // Drag helpers
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // DRAW SHADOW PROPAGATING LINKS
    const link = g.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => {
        if (d.signal >= -55) return '#10b981'; // Green
        if (d.signal >= -75) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
      })
      .attr('stroke-width', (d: any) => {
        if (d.type === 'mesh') return 3;
        return 1.5;
      })
      .attr('stroke-dasharray', (d: any) => d.type === 'phy' ? '5,5' : 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', function() { d3.select(this).attr('stroke-opacity', 1); })
      .on('mouseleave', function() { d3.select(this).attr('stroke-opacity', 0.6); });

    // Floating micro-particles flowing through wireless channels
    const flows = g.append('g')
      .selectAll<SVGCircleElement, GraphLink>('circle.flow-particle')
      .data(links.filter((l: any) => l.type === 'mesh'))
      .join('circle')
      .attr('class', 'flow-particle')
      .attr('r', 2.5)
      .attr('fill', '#67e8f9')
      .style('filter', 'url(#glow)');

    // NODES GROUP CONTAINER
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g.node-element')
      .data(nodes)
      .join('g')
      .attr('class', 'node-element')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Apply specific element drawings for each node type
    node.each(function(d: any) {
      const el = d3.select(this);
      
      // Outer ping rings
      if (d.type === 'hub') {
        el.append('circle')
          .attr('class', 'radial-ambient')
          .attr('r', 28)
          .attr('fill', 'url(#hubPulseGrad)')
          .style('mix-blend-mode', 'screen')
          .style('animation', 'pulse 3s infinite');
      }

      // Base circles
      let size = 12;
      let strokeW = 2;
      let fill = '#1e293b';
      let stroke = '#64748b';

      if (d.type === 'hub') {
        size = 18;
        strokeW = 3;
        fill = '#312e81';
        stroke = '#818cf8';
      } else if (d.type === 'mule') {
        size = 14;
        strokeW = 2.5;
        fill = d.id === pingPulseId ? '#7c2d12' : '#451a03';
        stroke = '#ea580c';
      } else {
        // Kiosk node color determination
        if (d.status === 'ONLINE') { fill = '#064e3b'; stroke = '#34d399'; }
        else if (d.status === 'SYNCING') { fill = '#7c2d12'; stroke = '#fb923c'; size = 13; }
        else if (d.status === 'OFFLINE_PENDING') { fill = '#0f172a'; stroke = '#cbd5e1'; }
        else { fill = '#450a0a'; stroke = '#f87171'; }
      }

      el.append('circle')
        .attr('r', size)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('stroke-width', strokeW)
        .attr('class', 'core-circle')
        .style('filter', d.type === 'hub' || d.status === 'SYNCING' ? 'url(#glow)' : 'none');

      // Add icons or mini logos inside elements
      if (d.type === 'hub') {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '.3em')
          .attr('font-size', '10px')
          .attr('fill', '#ffffff')
          .attr('font-weight', 'black')
          .text('H');
      } else if (d.type === 'mule') {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '.3em')
          .attr('font-size', '9px')
          .attr('fill', '#fb923c')
          .attr('font-weight', 'bold')
          .text('M');
      } else {
        el.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '.3em')
          .attr('font-size', '8px')
          .attr('fill', '#f1f5f9')
          .text('K');
      }

      // Small visual status dot badges
      if (d.type !== 'hub') {
        el.append('circle')
          .attr('cx', size - 2)
          .attr('cy', -(size - 2))
          .attr('r', 3.5)
          .attr('fill', () => {
            if (d.status === 'ONLINE') return '#10b981';
            if (d.status === 'SYNCING') return '#f59e0b';
            if (d.status === 'OFFLINE_PENDING') return '#64748b';
            return '#ef4444';
          });
      }
    });

    // Node interactions - hover and click
    node.on('mouseenter', (event, d: any) => {
      setHoveredNode(d);
    });

    node.on('mouseleave', () => {
      setHoveredNode(null);
    });

    node.on('click', (event, d: any) => {
      setSelectedNode(d);
      event.stopPropagation();
    });

    // Clear detail selection when clicking empty canvas
    svg.on('click', () => {
      setSelectedNode(null);
    });

    // Dynamic animation speeds variables for flowing particles
    let tickCount = 0;

    // Simulation simulation tick frame step handler
    simulation.on('tick', () => {
      tickCount += 1;
      
      link
        .attr('x1', (d: any) => (d.source as GraphNode).x || 0)
        .attr('y1', (d: any) => (d.source as GraphNode).y || 0)
        .attr('x2', (d: any) => (d.target as GraphNode).x || 0)
        .attr('y2', (d: any) => (d.target as GraphNode).y || 0);

      // Animate flowing packets along connections
      flows
        .attr('cx', (d: any) => {
          const s = d.source as GraphNode;
          const t = d.target as GraphNode;
          const sx = s.x || 0;
          const tx = t.x || 0;
          // Interpolate position modulo tick rate
          const ratio = ((tickCount % 120) / 120 + (links.indexOf(d) * 0.15)) % 1.0;
          return sx + (tx - sx) * ratio;
        })
        .attr('cy', (d: any) => {
          const s = d.source as GraphNode;
          const t = d.target as GraphNode;
          const sy = s.y || 0;
          const ty = t.y || 0;
          const ratio = ((tickCount % 120) / 120 + (links.indexOf(d) * 0.15)) % 1.0;
          return sy + (ty - sy) * ratio;
        });

      node.attr('transform', (d: any) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    // Check simulation flag
    if (!isSimulationActive) {
      simulation.stop();
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, dimensions, chargeStrength, linkDistance, gravityStrength, colRadius, isSimulationActive, pingPulseId]);

  // Command handlers
  const handleTriggerRandomTransaction = () => {
    // Choose a random kiosk
    const kiosks = nodes.filter(n => n.type === 'kiosk');
    const randomIdx = Math.floor(Math.random() * kiosks.length);
    const targetKiosk = kiosks[randomIdx];

    const bonusTxns = Math.floor(Math.random() * 15) + 5;
    const bonusBytes = (Math.random() * 850 + 50).toFixed(0);

    setNodes(prevNodes => prevNodes.map(n => {
      if (n.id === targetKiosk.id) {
        return {
          ...n,
          status: n.status === 'FAILED' || n.status === 'OFFLINE_PENDING' ? 'OFFLINE_PENDING' : n.status,
          txns: (n.txns || 0) + bonusTxns,
          bytes: `${parseFloat(n.bytes || '0') + parseFloat(bonusBytes)} KB`,
        };
      }
      return n;
    }));

    toast.warning(`📈 Rural TX Event: ${targetKiosk.name} cached +${bonusTxns} offline transactions pending upload!`, {
      icon: <Database className="w-4 h-4 text-amber-400" />
    });
  };

  const handleInstantSync = (kioskId: string) => {
    const targetNode = nodes.find(n => n.id === kioskId);
    if (!targetNode) return;

    setSelectedNode(null);
    setCurrentSyncProgress(0);
    setSyncPhase('transmitting');

    const progressInterval = setInterval(() => {
      setCurrentSyncProgress(prev => {
        if (prev === null) return 0;
        const next = prev + Math.floor(Math.random() * 15) + 10;
        
        if (next >= 100) {
          clearInterval(progressInterval);
          setSyncPhase('writing');
          
          setTimeout(() => {
            // Apply sync updates to states
            setNodes(prev => prev.map(n => {
              if (n.id === kioskId) {
                return {
                  ...n,
                  status: 'ONLINE',
                  bytes: '0 KB',
                  txns: 0,
                  lastSync: 'Just now',
                  signalStrength: -40 - Math.floor(Math.random() * 15)
                };
              }
              // If connected mule, accumulate or aggregate transaction stats representing harvesting
              if (n.id === 'mule-truck-a' && targetNode.id.includes('adama')) {
                return {
                  ...n,
                  txns: (n.txns || 0) + (targetNode.txns || 0),
                  bytes: `${(parseFloat(n.bytes || '0') + parseFloat(targetNode.bytes || '0') / 1024).toFixed(1)} MB`
                };
              }
              if (n.id === 'mule-moto-b' && targetNode.id.includes('mojo')) {
                return {
                  ...n,
                  txns: (n.txns || 0) + (targetNode.txns || 0),
                  bytes: `${(parseFloat(n.bytes || '0') + parseFloat(targetNode.bytes || '0') / 1024).toFixed(1)} MB`
                };
              }
              return n;
            }));

            // Sync link recovery
            setLinks(prev => prev.map(l => {
              if ((l.source as any).id === kioskId || l.source === kioskId) {
                return { ...l, signal: -45 - Math.floor(Math.random() * 10), type: 'mesh' };
              }
              return l;
            }));

            setSyncPhase('done');
            toast.success(`🔐 Safely Harvested Ledger Hash: 0x${Math.random().toString(16).substring(2, 10).toUpperCase()} from ${targetNode.name}! Ledger synced successfully with Zero-Knowledge verification.`);
            
            setTimeout(() => {
              setCurrentSyncProgress(null);
              setSyncPhase('idle');
            }, 1000);

          }, 800);
          return 100;
        }
        return next;
      });
    }, 150);
  };

  const handlePingNode = (nodeId: string) => {
    setPingPulseId(nodeId);
    toast.info(`📡 Beacon emitted to ${nodeId}... Listening for Bluetooth/LoRa telemetry echo...`);
    
    setTimeout(() => {
      setPingPulseId(null);
      const target = nodes.find(n => n.id === nodeId);
      if (target) {
        toast.success(`⚡ Telemetry ACK echo! ${target.name} verified active. Range RTT 12ms. Signal: ${target.signalStrength}dBm.`, { id: 'ack' });
      }
    }, 1500);
  };

  const handleToggleSignalRange = (kioskId: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === kioskId) {
        const isOffline = n.status === 'OFFLINE_PENDING' || n.status === 'FAILED';
        return {
          ...n,
          status: isOffline ? 'ONLINE' : 'OFFLINE_PENDING',
          signalStrength: isOffline ? -45 - Math.floor(Math.random() * 15) : -88 - Math.floor(Math.random() * 8)
        };
      }
      return n;
    }));

    setLinks(prev => prev.map(l => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
      if (sourceId === kioskId) {
        const isCurrentlyPhy = l.type === 'phy';
        return {
          ...l,
          type: isCurrentlyPhy ? 'mesh' : 'phy',
          signal: isCurrentlyPhy ? -52 : -88
        };
      }
      return l;
    }));

    const isNowOffline = nodes.find(n => n.id === kioskId)?.status === 'ONLINE';
    toast.info(`📡 Cellular/BLE Antenna modified on ${nodes.find(n => n.id === kioskId)?.name}! State changed to ${isNowOffline ? 'offline pending physical sync' : 'active wireless mesh coverage area'}.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full h-[520px] bg-slate-950 p-1">
      {/* LEFT: Live Interactive SVG Force Directed Graph Canvas */}
      <div className="lg:col-span-8 flex flex-col bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden relative">
        {/* Graph Header Tools */}
        <div className="px-5 py-4 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Local Proximity Signal Mesh</h3>
              <p className="text-[10px] text-slate-400 font-mono">D3.js Force Directed Layout • Real-Time Nodes Position Repulsion</p>
            </div>
          </div>

          {/* Quick HUD State Controls */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsSimulationActive(!isSimulationActive)}
              title={isSimulationActive ? 'Freeze physics calculations' : 'Resume calculations'}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all active:scale-95 flex items-center justify-center"
            >
              {isSimulationActive ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-slate-400" />}
            </button>
            <button 
              onClick={handleTriggerRandomTransaction}
              className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>Simulate TX</span>
            </button>
          </div>
        </div>

        {/* The D3 Canvas Section */}
        <div ref={containerRef} className="flex-1 w-full bg-slate-950/20 relative">
          <svg 
            ref={svgRef} 
            className="w-full h-full select-none"
            style={{ minHeight: '340px' }}
          />

          {/* Hover Floating Tooltip HUD */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 pointer-events-none bg-slate-950/95 border border-slate-800/80 p-4 rounded-2xl max-w-xs text-xs font-mono text-slate-200 shadow-2xl space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                <span className="font-bold text-slate-100 uppercase tracking-widest text-[9px]">
                  {hoveredNode.type === 'hub' ? 'Command Root' : hoveredNode.type === 'mule' ? 'Data Courier Mule' : 'Offline Merchant Kiosk'}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  hoveredNode.status === 'ONLINE' || hoveredNode.type === 'hub' ? 'bg-emerald-500 animate-pulse' :
                  hoveredNode.status === 'SYNCING' ? 'bg-amber-500 animate-pulse' :
                  hoveredNode.status === 'OFFLINE_PENDING' ? 'bg-slate-400' : 'bg-red-500'
                }`} />
              </div>
              <p className="text-white font-black font-sans leading-tight">{hoveredNode.name}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] pt-1">
                <span className="text-slate-500">ID:</span> <span className="text-slate-300">{hoveredNode.id}</span>
                <span className="text-slate-500">Node Signal:</span> <span className={hoveredNode.signalStrength && hoveredNode.signalStrength >= -60 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{hoveredNode.signalStrength} dBm</span>
                <span className="text-slate-500">Pending TX:</span> <span className="text-indigo-400 font-bold">{hoveredNode.txns || 0} Txns</span>
                <span className="text-slate-500">Cached Data:</span> <span className="text-cyan-400">{hoveredNode.bytes || '0 KB'}</span>
                <span className="text-slate-500">Battery Charge:</span> <span className="text-slate-300 flex items-center"><Battery className="w-3 h-3 mr-1 text-emerald-500" />{hoveredNode.battery}%</span>
              </div>
            </div>
          )}

          {/* Canvas Drag Help Prompt Info */}
          <div className="absolute bottom-4 left-4 bg-slate-900/60 border border-slate-800/50 px-3 py-1.5 rounded-full text-[9px] font-mono text-slate-400 flex items-center space-x-1.5 backdrop-blur-sm pointer-events-none">
            <Compass className="w-3.5 h-3.5" />
            <span>Click & Drag nodes to test spring elasticity. Scroll to scale viewpoint.</span>
          </div>
        </div>

        {/* Force-directed parameters configuration drawer */}
        <div className="px-5 py-4 bg-slate-900/40 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>CHARGE POOL</span>
              <span className="font-bold text-slate-200">{chargeStrength}</span>
            </div>
            <input 
              type="range" 
              min="-600" 
              max="-50" 
              value={chargeStrength} 
              onChange={e => setChargeStrength(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>MESH SPAN</span>
              <span className="font-bold text-slate-200">{linkDistance}px</span>
            </div>
            <input 
              type="range" 
              min="40" 
              max="220" 
              value={linkDistance} 
              onChange={e => setLinkDistance(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>GRAVITY</span>
              <span className="font-bold text-slate-200">{gravityStrength.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.01" 
              max="0.40" 
              step="0.01"
              value={gravityStrength} 
              onChange={e => setGravityStrength(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>COLLISION COEF</span>
              <span className="font-bold text-slate-200">{colRadius}px</span>
            </div>
            <input 
              type="range" 
              min="15" 
              max="60" 
              value={colRadius} 
              onChange={e => setColRadius(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* RIGHT: Live Controller Pane & Inspector Telemetry details */}
      <div className="lg:col-span-4 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 relative">
        {syncPhase !== 'idle' && currentSyncProgress !== null && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-spin" style={{ animationDuration: '3s' }}>
              <RefreshCw className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest text-white">GhostSync Harvesting Operations</h4>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {syncPhase === 'transmitting' ? 'Downloading secure ledger bits...' : 'Registering cryptography blocks...'}
            </p>
            
            <div className="w-full max-w-xs mt-6 space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-slate-500">BURST MULTIPORT:</span>
                <span className="text-indigo-400">{currentSyncProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-150" style={{ width: `${currentSyncProgress}%` }} />
              </div>
              <p className="text-[9px] text-slate-500 font-mono leading-relaxed mt-2 text-center">
                Establishing direct P2P socket • Zero-knowledge proofs validation with National Fayda Identity Server.
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-between overflow-y-auto min-h-0 space-y-6">
          <div>
            <h3 className="text-xs font-bold tracking-widest text-[#6366f1] uppercase mb-4">Command Mesh Telecom</h3>
            
            {!selectedNode ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 p-4">
                <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select a mesh node</h4>
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed mt-2">
                  Click any node in the left force graph representing local merchants, courier mules, or regional hubs to run diagnostics commands and remote sync overrides.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300 zoom-in-95">
                {/* Node Details Inspection Header Card */}
                <div className="bg-slate-950/80 p-4 border border-slate-800 rounded-2xl text-xs font-mono relative overflow-hidden">
                  <div className="absolute right-2 top-2">
                    <button 
                      onClick={() => setSelectedNode(null)}
                      className="p-1 hover:bg-slate-800/80 text-slate-400 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest leading-none ${
                    selectedNode.type === 'hub' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-400/20' :
                    selectedNode.type === 'mule' ? 'bg-orange-500/20 text-orange-400 border border-orange-400/20' :
                    'bg-cyan-500/20 text-cyan-400 border border-cyan-400/20'
                  }`}>
                    {selectedNode.type === 'hub' ? 'Core Substation' : selectedNode.type === 'mule' ? 'Mule Node' : 'Rural Kiosk'}
                  </span>

                  <h3 className="font-sans text-sm font-black text-white mt-2 mb-1 leading-tight">{selectedNode.name}</h3>
                  <p className="text-slate-500 font-mono text-[9px] mb-3">TELEMETRY ID: {selectedNode.id}</p>

                  <div className="space-y-2 border-t border-slate-800/80 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Parity Power:</span>
                      <span className="text-emerald-400 font-bold">{selectedNode.battery}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Unsynced Cache:</span>
                      <span className="text-indigo-300 font-bold">{selectedNode.txns || 0} Txns ({selectedNode.bytes || '0 KB'})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">RF Distance Link:</span>
                      <span className="text-cyan-400 font-bold">{selectedNode.signalStrength} dBm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">State:</span>
                      <span className={`font-bold ${
                        selectedNode.status === 'ONLINE' ? 'text-emerald-400' :
                        selectedNode.status === 'SYNCING' ? 'text-amber-400' :
                        selectedNode.status === 'OFFLINE_PENDING' ? 'text-slate-400' : 'text-red-400'
                      }`}>{selectedNode.status}</span>
                    </div>
                  </div>
                </div>

                {/* Operations Commands Options Panel */}
                <div className="space-y-2">
                  <h4 className="text-[9px] text-slate-500 uppercase tracking-widest font-black font-mono">Telemetry Instructions</h4>

                  {selectedNode.type === 'kiosk' && (
                    <>
                      <button
                        onClick={() => handleInstantSync(selectedNode.id)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-98 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/10"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin-slow" />
                        <span>Force Command Sync Override</span>
                      </button>

                      <button
                        onClick={() => handleToggleSignalRange(selectedNode.id)}
                        className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-98 flex items-center justify-center space-x-2"
                      >
                        <Zap className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                        <span>Toggle Wireless range State</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handlePingNode(selectedNode.id)}
                    className="w-full py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-98 flex items-center justify-center space-x-2"
                  >
                    <Send className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                    <span>Ping Node Beacon Check</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Info help guide bottom card */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl flex items-start space-x-3 text-[10px] font-mono leading-relaxed text-slate-400">
            <Radio className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-bold text-slate-300 uppercase tracking-wider">MULE HARVESTING ROUTE</p>
              <p className="mt-1">
                Data Mules carry offline ledger transactions over high-frequency local networks (Bluetooth Core, Wi-Fi Direct) and offload data points to the Modjo Hub via ZK state channels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
