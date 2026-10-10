import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, Mock
import run_all


class LifecycleTest(unittest.TestCase):
    def test_environment_accepts_only_the_explicit_local_profile(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            env = root / '.env'
            env.write_text('APP_PROFILE=sample-app-02\nSERVER_PORT=8300\nAPP_ORIGIN=http://localhost:5300\n')
            with patch.object(run_all, 'ROOT', root):
                self.assertEqual(run_all.read_env()['SERVER_PORT'], '8300')
                env.write_text('APP_PROFILE=sample-app-02\nSERVER_PORT=8300\nAPP_ORIGIN=http://10.1.1.242:5300\n')
                self.assertEqual(run_all.read_env()['APP_ORIGIN'], 'http://10.1.1.242:5300')
                env.write_text('APP_PROFILE=sample-app-02\nSERVER_PORT=8300\nAPP_ORIGIN=http://10.1.1.242:5181\n')
                with self.assertRaisesRegex(RuntimeError, 'requires the sample-app-02 profile'):
                    run_all.read_env()
                env.write_text('APP_PROFILE=sample-app-02\nSERVER_PORT=8300\nAPP_ACCESS_MODE=external\nAPP_ORIGIN=https://demo.ts.net:8443\n')
                self.assertEqual(run_all.read_env()['APP_ORIGIN'], 'https://demo.ts.net:8443')
                env.write_text('APP_PROFILE=sample-app-02\nSERVER_PORT=8300\nAPP_ACCESS_MODE=external\nAPP_ORIGIN=https://demo.example.com:8443\n')
                with self.assertRaisesRegex(RuntimeError, 'requires the sample-app-02 profile'):
                    run_all.read_env()
                env.write_text('APP_PROFILE=other-app\nSERVER_PORT=8300\nAPP_ORIGIN=http://localhost:5300\n')
                with self.assertRaisesRegex(RuntimeError, 'requires the sample-app-02 profile'):
                    run_all.read_env()

    def test_build_and_ui_processes_do_not_receive_server_credentials(self):
        env = {"AZURE_OPENAI_API_KEY": "private", "OIDC_CLIENT_SECRET": "oidc-secret", "DATABASE_PASSWORD": "db-secret", "PATH": "/bin"}
        self.assertEqual(run_all.public_process_env(env), {"PATH": "/bin"})

    def test_missing_environment_requires_setup(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(run_all, 'ROOT', Path(directory)):
            with self.assertRaisesRegex(RuntimeError, 'create-env.sh'):
                run_all.read_env()

    def test_stop_rejects_a_reused_process_identifier(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = Path(directory)
            (runtime / 'server.pid').write_text('12345')
            with patch.object(run_all, 'RUNTIME', runtime), \
                    patch('run_all.subprocess.run', return_value=Mock(stdout='uv run uvicorn other.main:app')), \
                    patch('run_all.os.killpg') as kill:
                with self.assertRaisesRegex(RuntimeError, 'does not match'):
                    run_all.stop('server')
                kill.assert_not_called()

    def test_server_keeps_the_repository_root_as_working_directory(self):
        command = run_all.server_command()
        self.assertIn('--project', command)
        self.assertNotIn('--directory', command)
        self.assertEqual(command[:4], ['uv', 'run', '--locked', '--no-sync'])
        self.assertIn(run_all.SERVER_MARKER, command)
        self.assertEqual(command[-2:], ['--port', '8300'])

    def test_server_database_defaults_to_the_repository_runtime_directory(self):
        self.assertEqual(run_all.server_env({})['DATABASE_URL'], f"sqlite:///{run_all.RUNTIME / 'ieee.db'}")
        self.assertEqual(run_all.server_env({'DATABASE_URL': 'sqlite:///x.db'})['DATABASE_URL'], 'sqlite:///x.db')

    def test_stop_rejects_the_server_command_in_another_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = Path(directory)
            (runtime / 'server.pid').write_text('99999999')
            command = 'uv run --project /another/server uvicorn ieee.main:create_app --factory'
            with patch.object(run_all, 'RUNTIME', runtime), \
                    patch('run_all.subprocess.run', side_effect=[Mock(stdout=command), Mock(stdout='p99999999\nn/another\n')]), \
                    patch('run_all.os.killpg') as kill:
                with self.assertRaisesRegex(RuntimeError, 'directory does not match'):
                    run_all.stop('server')
                kill.assert_not_called()

    def test_stop_rejects_the_same_command_in_another_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = Path(directory)
            (runtime / 'ui.pid').write_text('99999999')
            with patch.object(run_all, 'RUNTIME', runtime), \
                    patch('run_all.subprocess.run', side_effect=[Mock(stdout='npm run dev'), Mock(stdout='p99999999\nn/another/project/ui\n')]), \
                    patch('run_all.os.killpg') as kill:
                with self.assertRaisesRegex(RuntimeError, 'directory does not match'):
                    run_all.stop('ui')
                kill.assert_not_called()


if __name__ == '__main__':
    unittest.main()
