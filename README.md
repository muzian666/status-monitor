# Status Monitor

Network connectivity monitoring with real-time visualization, traceroute path analysis, and animated topology.

## Highlights

- **Route Trace (Traceroute)** - Visualize the full network path hop-by-hop with real-time animated packet flow. Each hop shows IP, hostname, latency bar, and auto-detected node type (Gateway / LAN / Transit / ISP / Target). Failed hops are highlighted in red, and unreachable targets clearly show where the path broke.

- **Multi-Protocol Monitoring** - ICMP Ping, HTTP(S), TCP Port, and DNS checks with configurable intervals and timeouts. Latency color-coded (green <10ms, yellow <50ms, orange <100ms, red 100ms+).

- **Live Topology Editor** - Two modes: auto-discover via traceroute, or manually build a network diagram with drag-and-drop nodes and links. Each link animates to show live traffic flow.

- **Real-Time Dashboard** - WebSocket-powered updates with no page refresh. Status changes and latency results stream instantly.

- **Bilingual UI** - Full Chinese/English support with one-click language switching.

- **Cloud-Ready Deployment** - Docker/Podman multi-stage build, Kubernetes manifests with HPA and Ingress, plus a Helm chart.

## Quick Start

### Development

**Backend** (using conda):
```bash
cd backend
conda create -n status-monitor python=3.11 -y
conda activate status-monitor
pip install -r requirements.txt
python run.py
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (proxies API to backend on :8000)

### Production (Podman)

```bash
cd deploy/docker
podman compose up --build
# or
podman build -f Dockerfile -t status-monitor ../..
podman run -p 8000:8000 --cap-add=NET_RAW -v monitor-data:/app/data status-monitor
```

### Kubernetes

```bash
# Raw manifests
kubectl apply -f deploy/k8s/

# Helm
helm install status-monitor helm/status-monitor/
```

## API

All endpoints under `/api/v1/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /monitors | List/Create monitors |
| GET/PUT/DELETE | /monitors/{id} | Read/Update/Delete monitor |
| POST | /monitors/{id}/check | Trigger immediate check |
| GET | /results/monitor/{id} | Paginated check results |
| GET | /results/monitor/{id}/stats | Aggregated statistics |
| GET | /results/latest-all | Latest result for all monitors |
| GET/POST | /topology/nodes | List/Create topology nodes |
| GET/POST | /topology/links | List/Create topology links |
| GET | /topology/graph | Full graph for visualization |
| POST | /traceroute/run | Start async traceroute |
| GET | /traceroute/runs/{id} | Get run with all hops |
| GET | /traceroute/runs/{id}/topology | Hops as React Flow graph |
| WS | /ws | Real-time updates |

Swagger UI available at http://localhost:8000/docs

## Architecture

```
Frontend (React + TypeScript + Vite)
  -> React Flow for topology
  -> Recharts for live charts
  -> Zustand for state
  -> i18next for bilingual
  -> Framer Motion for animations

Backend (Python + FastAPI)
  -> SQLAlchemy async + SQLite
  -> APScheduler for monitoring jobs
  -> WebSocket for real-time broadcast
  -> asyncio subprocess for traceroute/ping
  -> Reverse DNS resolution for hop hostnames
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| SM_DEBUG | false | Enable debug mode |
| SM_HOST | 0.0.0.0 | Server bind address |
| SM_PORT | 8000 | Server port |
| SM_DATA_DIR | ./data | SQLite database directory |
| SM_DATABASE_URL | (auto) | Override database URL |

## License

MIT
