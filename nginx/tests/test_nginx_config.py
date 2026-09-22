from pathlib import Path
import unittest


CONFIG = (Path(__file__).resolve().parents[1] / "nginx.conf").read_text()
DOMAIN = "pm25-patients.ddc.moph.go.th"


class NginxHTTPSConfiguration(unittest.TestCase):
    def test_http_always_redirects_to_canonical_https_domain(self):
        self.assertIn(f"return 301 https://{DOMAIN}$request_uri;", CONFIG)
        self.assertNotIn("return 301 https://$host$request_uri;", CONFIG)

    def test_https_uses_full_chain_and_canonical_domain(self):
        self.assertIn("ssl_certificate /etc/nginx/ssl/live/star_ddc_moph_go_th_ca.crt;", CONFIG)
        self.assertIn(f"if ($host != {DOMAIN})", CONFIG)
        self.assertIn('Strict-Transport-Security "max-age=31536000" always;', CONFIG)

