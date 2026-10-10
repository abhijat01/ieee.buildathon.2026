import tempfile
import unittest
from pathlib import Path
from azure_config import load_azure_config


class AzureConfigurationTest(unittest.TestCase):
    def test_loads_only_azure_fields_and_removes_ini_quotes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'deployment.ini'
            path.write_text('[default]\ndefault_profile=unrelated\n[_secrets]\n'
                            'azure_openai_endpoint="https://example.azure.com/openai/v1/"\n'
                            'azure_openai_api_key="private-key"\n'
                            'default_openai_model="my-deployment"\n'
                            'azure_api_version="legacy-version"\nother_secret=not-imported\n')
            env = {'AGENT_DEPLOYMENT_FILE': str(path), 'AZURE_OPENAI_API_KEY': ''}
            load_azure_config(env)
            self.assertEqual(env['AZURE_OPENAI_ENDPOINT'], 'https://example.azure.com/openai/v1/')
            self.assertEqual(env['AZURE_OPENAI_DEPLOYMENT'], 'my-deployment')
            self.assertEqual(env['AZURE_OPENAI_API_KEY'], 'private-key')
            self.assertNotIn('other_secret', env)
            self.assertNotIn('azure_api_version', env)

    def test_explicit_environment_values_take_precedence(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'deployment.ini'
            path.write_text('[_secrets]\ndefault_openai_model=ini-model\nazure_openai_api_key=ini-key\n')
            env = {'AGENT_DEPLOYMENT_FILE': str(path), 'AZURE_OPENAI_DEPLOYMENT': 'explicit-model', 'AZURE_OPENAI_API_KEY': 'explicit-key'}
            load_azure_config(env)
            self.assertEqual(env['AZURE_OPENAI_DEPLOYMENT'], 'explicit-model')
            self.assertEqual(env['AZURE_OPENAI_API_KEY'], 'explicit-key')

    def test_missing_config_keeps_explicit_settings(self):
        env = {'AGENT_DEPLOYMENT_FILE': '/missing/deployment.ini', 'AZURE_OPENAI_DEPLOYMENT': 'model'}
        load_azure_config(env)
        self.assertEqual(env['AZURE_OPENAI_DEPLOYMENT'], 'model')

    def test_parse_errors_do_not_expose_config_contents(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'deployment.ini'
            path.write_text('private-key-without-section')
            with self.assertRaisesRegex(RuntimeError, '^Cannot parse the agent deployment configuration.$'):
                load_azure_config({'AGENT_DEPLOYMENT_FILE': str(path)})


if __name__ == '__main__':
    unittest.main()
