export interface WsLocationEvent {
  type: 'location_update';
  user_id: number;
  user_name: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

type LocationCallback = (data: WsLocationEvent) => void;

class AdminWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: LocationCallback[] = [];
  private reconnectTimeout: number | null = null;
  private shouldReconnect = true;

  connect() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.shouldReconnect = true;
    let wsUrl: string;
    const configuredWs = import.meta.env.VITE_WS_BASE_URL;

    if (configuredWs) {
      const cleanBase = configuredWs.replace(/\/$/, '');
      wsUrl = `${cleanBase}/ws/admin/locations?token=${token}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws/admin/locations?token=${token}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to admin locations feed');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.listeners.forEach((cb) => cb(payload));
        } catch (err) {
          console.error('[WebSocket] Failed to parse message', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        if (this.shouldReconnect) {
          this.reconnectTimeout = window.setTimeout(() => this.connect(), 3000);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WebSocket] Error occurred', err);
        this.ws?.close();
      };
    } catch (e) {
      console.error('[WebSocket] Initialization error', e);
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onLocationUpdate(callback: LocationCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}

export const adminWs = new AdminWebSocketService();
