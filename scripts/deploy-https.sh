#!/bin/sh
# Run on the deployment server from this checkout.
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

docker compose config --quiet
# Include the current entrypoint validator, not just the mounted nginx.conf.
docker build --platform linux/amd64 \
  -t ghcr.io/champ-tc/envocc-dashboard-pm-nginx:latest nginx
# Validate the new image with the server's mounted certificates before replacing
# the running proxy. Upstream services must already be running.
docker compose run --rm --no-deps nginx sh -c \
  '/docker-entrypoint.d/05-validate-tls.sh'
docker compose up -d --no-deps --force-recreate nginx

# Check the restarted proxy first. Then resolve and test every IPv4 destination
# so round-robin or split DNS cannot hide a stale TLS endpoint.
resolved_ips=$(docker compose exec -T nginx getent ahostsv4 pm25-patients.ddc.moph.go.th \
  | awk '{ print $1 }' | sort -u)
if [ -z "$resolved_ips" ]; then
  echo "DNS returned no IPv4 address for pm25-patients.ddc.moph.go.th" >&2
  exit 1
fi

# Override this list when DNS is intentionally changed. The allowlist catches
# a record that accidentally points to another web server.
expected_ips=${EXPECTED_TLS_IPS:-"192.168.110.5 203.156.15.88"}
for address in $resolved_ips; do
  case " $expected_ips " in
    *" $address "*) ;;
    *) echo "DNS resolved to unexpected TLS endpoint: $address" >&2; exit 1 ;;
  esac
done

for endpoint in 127.0.0.1 $resolved_ips; do
  docker compose exec -T nginx sh -c '
    set -eu
    endpoint=$1
    output=$(mktemp)
    trap '\''rm -f "$output"'\'' EXIT HUP INT TERM
    if ! timeout 20 openssl s_client \
      -connect "$endpoint:443" -servername pm25-patients.ddc.moph.go.th \
      -verify_hostname pm25-patients.ddc.moph.go.th \
      -verify_return_error -showcerts \
      -CAfile /etc/ssl/certs/ca-certificates.crt -no-CApath -no-CAstore \
      </dev/null >"$output" 2>&1; then
      cat "$output" >&2
      exit 1
    fi
    count=$(grep -c "BEGIN CERTIFICATE" "$output" || true)
    if [ "$count" -lt 2 ]; then
      echo "$endpoint: incomplete certificate chain ($count certificates)" >&2
      exit 1
    fi
    live_fingerprint=$(openssl x509 -in "$output" -noout -fingerprint -sha256)
    configured_fingerprint=$(openssl x509 \
      -in /etc/nginx/ssl/live/star_ddc_moph_go_th_ca.crt \
      -noout -fingerprint -sha256)
    if [ "$live_fingerprint" != "$configured_fingerprint" ]; then
      echo "$endpoint: certificate was replaced by another proxy/server" >&2
      exit 1
    fi
    echo "$endpoint: HTTPS verification passed ($count certificates)"
  ' sh "$endpoint"
done
