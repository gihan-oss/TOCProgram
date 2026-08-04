#!/bin/sh
# Runs as root (container default), fixes permissions on the persistent
# uploads volume, then hands off to supervisord (which runs node + nginx as
# the nextjs user, see supervisord.conf).
set -e

# Uploaded course files live in a named volume so they survive container
# rebuilds. Named volumes start owned by root, so fix ownership first.
mkdir -p /app/public/uploads
chown -R nextjs:nodejs /app/public/uploads

exec supervisord -c /etc/supervisord.conf
