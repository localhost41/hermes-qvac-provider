import os
import stat
import subprocess
import tempfile
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


def make_executable(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


class CompatibilityScriptTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (ROOT / "dist" / "cli.js").is_file():
            raise RuntimeError("compatibility script tests require 'pnpm build' first")

    def test_install_wrapper_uses_safe_cli_setup_and_enables_plugin(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            bin_dir = tmp_path / "bin"
            bin_dir.mkdir()
            log = tmp_path / "hermes.log"
            make_executable(
                bin_dir / "hermes",
                "#!/usr/bin/env bash\nprintf '%s\\n' \"$*\" >>\"$HERMES_TEST_LOG\"\nif [[ \"${1:-}\" == \"--version\" ]]; then echo 'Hermes Agent test'; fi\n",
            )
            hermes_home = tmp_path / "hermes-home"
            result = subprocess.run(
                [str(ROOT / "scripts" / "install.sh"), "--copy"],
                env={
                    **os.environ,
                    "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
                    "HERMES_HOME": str(hermes_home),
                    "HERMES_TEST_LOG": str(log),
                },
                text=True,
                capture_output=True,
                check=False,
            )
            target = hermes_home / "plugins" / "model-providers" / "qvac"
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(target.is_dir())
            self.assertFalse(target.is_symlink())
            self.assertTrue((target / ".hermes-qvac-provider.json").is_file())
            self.assertIn("plugins enable qvac --no-allow-tool-override", log.read_text(encoding="utf-8"))
            self.assertIn("retained for compatibility", result.stderr)

    def test_doctor_and_start_wrappers_delegate_to_cli_help(self):
        for script in ("doctor.sh", "start-qvac.sh"):
            result = subprocess.run(
                [str(ROOT / "scripts" / script), "--help"],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Usage: hermes-qvac", result.stdout)


if __name__ == "__main__":
    unittest.main()
