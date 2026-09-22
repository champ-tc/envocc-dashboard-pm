#!/bin/sh
set -eu

# Read the effective configuration, including mounted files and includes.
# Do not allow environment overrides to validate different files than Nginx uses.
configuration=$(nginx -T) || exit 1
read_tls_path() {
  printf '%s\n' "$configuration" | awk -v directive="$1" '
    $1 == directive {
      count++
      if (NF != 2 || $2 !~ /^\/.*;$/) invalid = 1
      path = $2
      sub(/;$/, "", path)
    }
    END {
      if (count != 1 || invalid) exit 1
      print path
    }
  '
}
certificate=$(read_tls_path ssl_certificate) || {
  echo "Expected one absolute ssl_certificate path in Nginx configuration" >&2
  exit 1
}
private_key=$(read_tls_path ssl_certificate_key) || {
  echo "Expected one absolute ssl_certificate_key path in Nginx configuration" >&2
  exit 1
}
ca_file=${TLS_CA_FILE:-/etc/ssl/certs/ca-certificates.crt}
hostname=pm25-patients.ddc.moph.go.th

if [ ! -r "$certificate" ] || [ ! -r "$private_key" ]; then
  echo "TLS certificate or private key is missing/unreadable" >&2
  exit 1
fi

certificate_count=$(grep -c 'BEGIN CERTIFICATE' "$certificate" || true)
if [ "$certificate_count" -lt 2 ]; then
  echo "TLS full chain must contain the leaf and at least one intermediate certificate" >&2
  exit 1
fi

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT HUP INT TERM
# Keep extraction separate from hashing: POSIX pipelines can hide read errors.
if ! openssl x509 -in "$certificate" -pubkey -noout > "$work_dir/cert-public.pem"; then
  echo "Unable to read TLS certificate public key" >&2
  exit 1
fi
if ! openssl pkey -in "$private_key" -pubout -passin pass: > "$work_dir/key-public.pem"; then
  echo "Unable to read TLS private key without an interactive password" >&2
  exit 1
fi
if ! cmp -s "$work_dir/cert-public.pem" "$work_dir/key-public.pem"; then
  echo "TLS certificate and private key do not match" >&2
  exit 1
fi

# Trust only the configured CA store, never roots supplied in the server bundle.
awk -v leaf="$work_dir/leaf.pem" -v chain="$work_dir/chain.pem" '
  /-----BEGIN CERTIFICATE-----/ { count++ }
  count == 1 { print > leaf }
  count > 1 { print > chain }
' "$certificate"
if ! openssl verify -CAfile "$ca_file" -no-CApath -no-CAstore \
    -untrusted "$work_dir/chain.pem" -purpose sslserver \
    -verify_hostname "$hostname" "$work_dir/leaf.pem"; then
  echo "TLS chain, validity, server purpose or hostname verification failed" >&2
  exit 1
fi

echo "TLS validation passed: certificate chain contains $certificate_count certificates"
