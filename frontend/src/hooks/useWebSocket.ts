import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { getApiKey } from '../auth';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number>(1000);
  const mounted = useRef(true);
  const pingTimer = useRef<ReturnType<typeof setInterval>>();
  const pingSeq = useRef(0);

  const addResult = useStore((s) => s.addResult);
  const addTracerouteHop = useStore((s) => s.addTracerouteHop);
  const completeTraceroute = useStore((s) => s.completeTraceroute);

  useEffect(() => {
    mounted.current = true;

    function connect() {
      if (!mounted.current) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const key = getApiKey();
        const query = key ? `?api_key=${encodeURIComponent(key)}` : '';
        const wsUrl = `${protocol}//${window.location.host}/api/v1/ws${query}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!mounted.current) return;
          setIsConnected(true);
          setConnectedAt(Date.now());
          reconnectTimeout.current = 1000;

          // Start latency measurement via ping/pong
          pingTimer.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              pingSeq.current++;
              ws.send(JSON.stringify({ type: 'ping', ts: Date.now(), seq: pingSeq.current }));
            }
          }, 5000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (!mounted.current) return;

            if (msg.type === 'pong') {
              const rtt = Date.now() - msg.ts;
              setLatencyMs(rtt);
              return;
            }

            switch (msg.type) {
              case 'check_result':
                addResult(msg.data);
                break;
              case 'traceroute_hop':
                addTracerouteHop(msg.data);
                break;
              case 'traceroute_complete':
                completeTraceroute(msg.data);
                break;
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onclose = () => {
          if (!mounted.current) return;
          setIsConnected(false);
          setLatencyMs(null);
          setConnectedAt(null);
          clearInterval(pingTimer.current);
          const delay = Math.min(reconnectTimeout.current * 2, 30000);
          reconnectTimeout.current = delay;
          setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };

        wsRef.current = ws;
      } catch {
        if (mounted.current) {
          setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      mounted.current = false;
      clearInterval(pingTimer.current);
      wsRef.current?.close();
    };
  }, [addResult, addTracerouteHop, completeTraceroute]);

  return { isConnected, latencyMs, connectedAt };
}
