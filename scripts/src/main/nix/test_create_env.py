import unittest
import create_env


class CreateEnvironmentTest(unittest.TestCase):
    def test_setup_builds_the_exact_locked_python_environment(self):
        sync, browser = create_env.server_commands()
        project = str(create_env.ROOT / "server")
        self.assertEqual(sync, ["uv", "sync", "--locked", "--python", "3.12", "--project", project])
        self.assertEqual(browser[:5], ["uv", "run", "--locked", "--project", project])
        self.assertEqual(browser[5:], ["playwright", "install", "chromium"])
        self.assertNotIn("pip", " ".join(sync + browser))


if __name__ == "__main__":
    unittest.main()
