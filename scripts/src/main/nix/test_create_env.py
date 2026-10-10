import unittest
import create_env


class CreateEnvironmentTest(unittest.TestCase):
    def test_setup_builds_the_exact_locked_python_environment(self):
        project = str(create_env.ROOT / "server")
        self.assertEqual(create_env.server_commands(),
                         [["uv", "sync", "--locked", "--python", "3.12", "--project", project]])


if __name__ == "__main__":
    unittest.main()
