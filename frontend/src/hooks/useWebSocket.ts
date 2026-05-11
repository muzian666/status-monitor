import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number>(1000);
  const addResult = useStore((s) => s.addResult);
  const addTracerouteHop = useStore((s) => s.addTracerouteHop);
  const completeTraceroute = useStore((s) => s.completeTraceroute);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectTimeout.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
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
      setIsConnected(false);
      const delay = Math.min(reconnectTimeout.current * 2, 30000);
      reconnectTimeout.current = delay;
      setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [addResult, addTracerouteHop, completeTraceroute]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected };
}
