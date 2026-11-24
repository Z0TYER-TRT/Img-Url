#!/bin/sh
# Points your DuckDNS name at this machine's public IPv4 address.
#
#   DUCKDNS_TOKEN=xxxxxxxx sh scripts/duckdns.sh
#
# Run it once after creating the name, or from cron if your IP moves.
# The token comes from the environment or an untracked .env — never from this file.
set -eu

read_env() {
  [ -f .env ] || return 0
  sed -n "s/^$1=//p" .env | head -n1 | tr -d '\r'
}

DOMAIN=${DOMAIN:-$(read_env PUBLIC_HOST)}
SUBDOMAIN=${DOMAIN%%.*}

if [ -z "$SUBDOMAIN" ]; then
  echo "Set PUBLIC_HOST in .env, or pass DOMAIN=name.duckdns.org" >&2
  exit 1
fi

if [ -z "${DUCKDNS_TOKEN:-}" ]; then
  DUCKDNS_TOKEN=$(read_env DUCKDNS_TOKEN)
fi

if [ -z "${DUCKDNS_TOKEN:-}" ]; then
  echo "DUCKDNS_TOKEN is required (env var, or DUCKDNS_TOKEN= in .env)" >&2
  exit 1
fi

# An empty ip= tells DuckDNS to use the address this request came from.
reply=$(curl -fsS "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=")

if [ "$reply" != "OK" ]; then
  echo "DuckDNS refused the update: $reply" >&2
  exit 1
fi

echo "OK — ${SUBDOMAIN}.duckdns.org now points here"
