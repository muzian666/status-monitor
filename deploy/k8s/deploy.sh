#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/deploy.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found. Copy deploy.env.example to deploy.env and fill in your values."
    exit 1
fi

# Load env
set -a
source "$ENV_FILE"
set +a

# Apply each manifest with env substitution
for manifest in namespace.yaml configmap.yaml service.yaml pv.yaml pvc.yaml deployment.yaml; do
    file="$SCRIPT_DIR/$manifest"
    if [ -f "$file" ]; then
        echo "Applying $manifest..."
        envsubst < "$file" | kubectl apply -f -
    fi
done

echo "Done. Checking status..."
kubectl get all -n status-monitor
