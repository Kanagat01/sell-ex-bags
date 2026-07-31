#!/bin/sh
set -e

mkdir -p /root/.ssh
cp /run/secrets/proxy_key /root/.ssh/id_ed25519
chmod 600 /root/.ssh/id_ed25519

exec autossh -M 0 -N \
  -D 0.0.0.0:1080 \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o StrictHostKeyChecking=no \
  -p "${PROXY_SSH_PORT:-22}" \
  "${PROXY_SSH_USER}@${PROXY_SSH_HOST}"
