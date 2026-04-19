import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { getWsDomain } from "@/utils/domain";
import type { PantryUpdateMessage } from "@/types/websocket";

interface UsePantryWebSocketOptions {
  householdId: number | null;
  token: string;
  onMessage: (msg: PantryUpdateMessage) => void;
}

interface UsePantryWebSocketResult {
  connected: boolean;
}

export function usePantryWebSocket({
  householdId,
  token,
  onMessage,
}: UsePantryWebSocketOptions): UsePantryWebSocketResult {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!householdId || !token) {
      return;
    }

    const brokerURL = `${getWsDomain()}/ws?token=${encodeURIComponent(token)}`;

    const client = new Client({
      brokerURL,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(
          `/topic/household/${householdId}/pantry`,
          (frame) => {
            try {
              const msg = JSON.parse(frame.body) as PantryUpdateMessage;
              onMessageRef.current(msg);
            } catch {
              // Ignore malformed messages.
            }
          },
        );
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: () => {
        setConnected(false);
      },
      onWebSocketError: () => {
        setConnected(false);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      void client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [householdId, token]);

  return { connected };
}
