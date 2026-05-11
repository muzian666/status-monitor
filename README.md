# Status Monitor

Network connectivity monitoring application with real-time WebUI, supporting multiple protocols and network topology visualization.

## Features

- **Multi-protocol monitoring**: ICMP Ping, HTTP/HTTPS, TCP Port, DNS
- **Real-time dashboard**: Live status updates via WebSocket
- **Network topology visualization**: Auto traceroute discovery + manual node-link configuration
- **Animated topology**: SVG-animated edges showing packet flow and latency
- **Bilingual UI**: Chinese/English with one-click switching
- **REST API**: Full CRUD for monitors, results, and topology
- **Docker/Podman**: Multi-stage build, production-ready
- **Kubernetes**: manifests + Helm chart with HPA, Ingress, PVC

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
| GET/POST | /topology/nodes | List/Create topology nodes |
| GET/POST | /topology/links | List/Create topology links |
| GET | /topology/graph | Full graph for visualization |
| POST | /traceroute/run | Start traceroute |
| GET | /traceroute/runs/{id}/topology | Traceroute as topology graph |
| WS | /ws | Real-time updates |

Swagger UI available at http://localhost:8000/docs

## Architecture

```
Frontend (React + TypeScript + Vite)
  -> React Flow for topology
  -> Recharts for live charts
  -> Zustand for state
  -> i18next for bilingual

Backend (Python + FastAPI)
  -> SQLAlchemy async + SQLite
  -> APScheduler for monitoring jobs
  -> WebSocket for real-time broadcast
  -> asyncio subprocess for traceroute/ping
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
