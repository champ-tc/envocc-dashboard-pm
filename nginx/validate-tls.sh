#!/bin/sh
set -eu

certificate=/etc/nginx/ssl/live/star_ddc_moph_go_th_ca.crt
private_key=/etc/nginx/ssl/live/star_ddc_moph_go_th.key

if [ ! -r "$certificate" ] || [ ! -r "$private_key" ]; then
  echo "TLS certificate or private key is missing/unreadable" >&2
  exit 1
fi

certificate_count=$(grep -c 'BEGIN CERTIFICATE' "$certificate" || true)
if [ "$certificate_count" -lt 2 ]; then
  echo "TLS full chain must contain the leaf and at least one intermediate certificate" >&2
  exit 1
fi

# Refuse a deployment that would expire within 30 days. This leaves enough time
# to replace the certificate instead of discovering expiry from a browser error.
if ! openssl x509 -in "$certificate" -noout -checkend 2592000; then
  echo "TLS certificate expires in less than 30 days" >&2
  exit 1
fi

certificate_public_key=$(openssl x509 -in "$certificate" -pubkey -noout | openssl sha256)
private_public_key=$(openssl pkey -in "$private_key" -pubout | openssl sha256)
if [ "$certificate_public_key" != "$private_public_key" ]; then
  echo "TLS certificate and private key do not match" >&2
  exit 1
fi

echo "TLS validation passed: certificate chain contains $certificate_count certificates"
