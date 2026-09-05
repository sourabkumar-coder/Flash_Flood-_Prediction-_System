import type {
  VillageGeoJSON,
  IoTSensor,
  EvacuationPlanResponse,
  ModelBenchmarkResponse,
  AlertItem,
  LiveFeedPayload
} from '../types';

const API_BASE = '/api/v1';

export async function fetchVillagesGeoJSON(): Promise<VillageGeoJSON> {
  const res = await fetch(`${API_BASE}/villages`);
  if (!res.ok) throw new Error('Failed to fetch villages');
  return res.json();
}

export async function fetchSensors(): Promise<{ count: number; sensors: IoTSensor[]; health_summary: any }> {
  const res = await fetch(`${API_BASE}/sensors`);
  if (!res.ok) throw new Error('Failed to fetch sensors');
  return res.json();
}

export async function setSensorStatus(sensorId: string, status: string): Promise<any> {
  const res = await fetch(`${API_BASE}/sensors/${sensorId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
}

export async function fetchVillageExplain(villageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/risk/explain/${villageId}`);
  if (!res.ok) throw new Error('Failed to fetch explainability');
  return res.json();
}

export async function fetchVillageHistory(villageId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/villages/${villageId}/history`);
  if (!res.ok) throw new Error('Failed to fetch village history');
  return res.json();
}

export async function fetchEvacuationPlan(): Promise<EvacuationPlanResponse> {
  const res = await fetch(`${API_BASE}/evacuation/plan`);
  if (!res.ok) throw new Error('Failed to fetch evacuation plan');
  return res.json();
}

export async function fetchModelBenchmark(): Promise<ModelBenchmarkResponse> {
  const res = await fetch(`${API_BASE}/models/benchmark`);
  if (!res.ok) throw new Error('Failed to fetch model benchmark');
  return res.json();
}

export async function fetchAlerts(): Promise<{ count: number; alerts: AlertItem[] }> {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function startDisasterDemo(): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/start-demo`, { method: 'POST' });
  return res.json();
}

export async function stepDisasterDemo(): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/step`, { method: 'POST' });
  return res.json();
}

export async function runWhatIf(params: any): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return res.json();
}

export async function resetSimulation(): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
  return res.json();
}

export async function syncLiveWeather(): Promise<any> {
  const res = await fetch(`${API_BASE}/weather/live-sync`, { method: 'POST' });
  return res.json();
}

export async function fetchHistoricalEvents(): Promise<any> {
  const res = await fetch(`${API_BASE}/historical/events`);
  return res.json();
}

export function createLiveFeedWebSocket(onMessage: (data: LiveFeedPayload) => void): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/live-feed`;
  let ws: WebSocket | null = null;
  let isClosed = false;

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          onMessage(payload);
        } catch (e) {
          console.error('[WS Parse error]', e);
        }
      };
      ws.onclose = () => {
        if (!isClosed) {
          setTimeout(connect, 2000);
        }
      };
    } catch {
      if (!isClosed) {
        setTimeout(connect, 2000);
      }
    }
  };

  connect();

  return () => {
    isClosed = true;
    if (ws) ws.close();
  };
}
