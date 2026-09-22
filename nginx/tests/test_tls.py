"""Run with OpenSSL 3 on PATH: python3 -m unittest discover -s nginx/tests."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'validate-tls.sh'


class TLSValidation(unittest.TestCase):
    def test_certificate_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)

            def openssl(*args):
                subprocess.run(['openssl', *args], cwd=root, check=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

            def issue(name, issuer=None, hostname=None, days='90'):
                openssl('req', '-new', '-newkey', 'rsa:2048', '-nodes',
                        '-keyout', name + '.key', '-out', name + '.csr',
                        '-subj', '/CN=' + name)
                extensions = ('basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n'
                              if hostname is None else
                              'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:' + hostname + '\n')
                (root / 'extensions').write_text(extensions)
                signer = (['-signkey', name + '.key'] if issuer is None else
                          ['-CA', issuer + '.crt', '-CAkey', issuer + '.key', '-CAcreateserial'])
                openssl('x509', '-req', '-in', name + '.csr', '-out', name + '.crt',
                        '-days', days, '-extfile', 'extensions', *signer)

            issue('root')
            issue('intermediate', 'root')
            issue('leaf', 'intermediate', 'pm25-patients.ddc.moph.go.th')
            issue('wrong-host', 'intermediate', 'example.com')
            issue('expiring', 'intermediate', 'pm25-patients.ddc.moph.go.th', '10')
            issue('expired', 'intermediate', 'pm25-patients.ddc.moph.go.th', '0')
            issue('unrelated', 'root')
            issue('untrusted')

            (root / 'malformed.key').write_text('invalid private key\n')
            openssl('pkey', '-in', 'leaf.key', '-aes256', '-passout', 'pass:test-only', '-out', 'encrypted.key')

            cases = [
                ('valid', ['leaf', 'intermediate'], 'leaf', 'root', True),
                ('missing intermediate', ['leaf'], 'leaf', 'root', False),
                ('unrelated intermediate', ['leaf', 'unrelated'], 'leaf', 'root', False),
                ('wrong hostname', ['wrong-host', 'intermediate'], 'wrong-host', 'root', False),
                ('malformed key', ['leaf', 'intermediate'], 'malformed', 'root', False),
                ('encrypted key', ['leaf', 'intermediate'], 'encrypted', 'root', False),
                ('missing key', ['leaf', 'intermediate'], 'missing', 'root', False),
                ('wrong key', ['leaf', 'intermediate'], 'wrong-host', 'root', False),
                ('expires soon', ['expiring', 'intermediate'], 'expiring', 'root', True),
                ('expired', ['expired', 'intermediate'], 'expired', 'root', False),
                ('untrusted root in bundle', ['leaf', 'intermediate', 'root'], 'leaf', 'untrusted', False),
                ('wrong order', ['intermediate', 'leaf'], 'leaf', 'root', False),
            ]
            # Stub only nginx -T: actual cryptographic checks use OpenSSL.
            nginx = root / 'nginx'
            nginx.write_text('#!/bin/sh\n[ "$1" = -T ] || exit 1\ncat "' + str(root / 'nginx.conf') + '"\n')
            nginx.chmod(0o755)
            for name, chain, key, ca, expected in cases:
                with self.subTest(name=name):
                    bundle = root / 'bundle.pem'
                    bundle.write_text(''.join((root / (part + '.crt')).read_text() for part in chain))
                    (root / 'nginx.conf').write_text(f'ssl_certificate {bundle};\nssl_certificate_key {root / (key + ".key")};\n')
                    result = subprocess.run(['sh', str(SCRIPT)], env={**os.environ,
                        'PATH': str(root) + os.pathsep + os.environ['PATH'],
                        # Stale overrides must never affect which files are checked.
                        'TLS_CERTIFICATE': '/missing/ignored.crt', 'TLS_PRIVATE_KEY': '/missing/ignored.key',
                        'TLS_CA_FILE': str(root / (ca + '.crt'))}, capture_output=True, text=True, timeout=10)
                    self.assertEqual(result.returncode == 0, expected, result.stdout + result.stderr)
                    if name == 'expires soon':
                        self.assertNotIn('WARNING:', result.stderr)
                    print(name + ': PASS')

            for name, configuration in [
                ('missing directive', f'ssl_certificate {bundle};\n'),
                ('multiple certificates', f'ssl_certificate {bundle};\nssl_certificate {bundle};\nssl_certificate_key /missing;\n'),
                ('relative path', 'ssl_certificate relative.crt;\nssl_certificate_key relative.key;\n'),
            ]:
                with self.subTest(name=name):
                    (root / 'nginx.conf').write_text(configuration)
                    result = subprocess.run(['sh', str(SCRIPT)], env={**os.environ,
                        'PATH': str(root) + os.pathsep + os.environ['PATH']},
                        capture_output=True, text=True, timeout=10)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('Expected one absolute', result.stderr)
                    print(name + ': PASS')
