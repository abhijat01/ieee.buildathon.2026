import json
import unittest
from unittest.mock import patch
import tempfile
from pathlib import Path
import access


class AccessTest(unittest.TestCase):
    def test_route_ownership_protects_other_services(self):
        demo = access.DemoAccess()
        demo.check_route({}, "demo.ts.net")
        demo.check_route({"TCP": {"8443": {"HTTPS": True}}, "Web": {
            "demo.ts.net:8443": {"Handlers": {"/": {"Proxy": access.TARGET}}}}}, "demo.ts.net")
        with self.assertRaisesRegex(RuntimeError, "another service"):
            demo.check_route({"TCP": {"8443": {"HTTPS": True}}, "Web": {
                "demo.ts.net:8443": {"Handlers": {"/": {"Proxy": "http://localhost:9999"}}}}}, "demo.ts.net")

    def test_internal_mode_keeps_another_service_on_the_funnel_port(self):
        other = {"TCP": {"8443": {"HTTPS": True}}, "Web": {
            "demo.ts.net:8443": {"Handlers": {"/": {"Proxy": "http://127.0.0.1:9000"}}}}}
        ours = {"TCP": {"8443": {"HTTPS": True}}, "Web": {
            "demo.ts.net:8443": {"Handlers": {"/": {"Proxy": access.TARGET}}}}}
        demo = access.DemoAccess()
        self.assertFalse(demo.owns_route(other, "demo.ts.net"))
        self.assertTrue(demo.owns_route(ours, "demo.ts.net"))
        with tempfile.TemporaryDirectory() as directory, patch.object(access, "ROOT", Path(directory)), \
                patch.object(access, "provision"):
            (Path(directory) / ".env").write_text("APP_PROFILE=sample-app-02\nAPP_ORIGIN=http://localhost:5300\n")
            calls = []

            def command(*args, capture=False):
                calls.append(args)
                if args[:2] == ("tailscale", "status"):
                    return '{"Self": {"DNSName": "demo.ts.net."}}'
                return json.dumps(other) if args[:3] == ("tailscale", "serve", "status") else ""
            with patch.object(demo, "command", side_effect=command):
                demo.switch("internal", "http://10.0.0.5:5300")
            self.assertFalse(any("funnel" in call for call in calls))

    def test_environment_preserves_credentials_and_unrelated_settings(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(access, "ROOT", Path(directory)):
            env = Path(directory) / ".env"
            env.write_text("# Demo\nOIDC_CLIENT_SECRET=private\nAPP_ORIGIN=http://localhost:5300\nOTHER=value\n")
            access.DemoAccess().write_env({"APP_ORIGIN": "https://demo.ts.net:8443", "COOKIE_SECURE": "true"})
            self.assertIn("OIDC_CLIENT_SECRET=private\n", env.read_text())
            self.assertIn("OTHER=value\n", env.read_text())
            self.assertIn("APP_ORIGIN=https://demo.ts.net:8443\n", env.read_text())
            self.assertEqual(env.stat().st_mode & 0o777, 0o600)
