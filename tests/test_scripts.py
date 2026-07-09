import os
import stat
import subprocess
import tempfile
import textwrap
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


def make_executable(path: Path, text: str) -> None:
    path.write_text(textwrap.dedent(text).lstrip(), encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


class InstallScriptTest(unittest.TestCase):
    def test_default_install_symlinks_provider_into_hermes_home(self):
        with tempfile.TemporaryDirectory() as tmp:
            hermes_home = Path(tmp) / "hermes"
            result = subprocess.run(
                [str(ROOT / "scripts" / "install.sh")],
                env={**os.environ, "HERMES_HOME": str(hermes_home)},
                text=True,
                capture_output=True,
                check=False,
            )

            target = hermes_home / "plugins" / "model-providers" / "qvac"
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(target.is_symlink())
            self.assertEqual(target.resolve(), ROOT)
            self.assertIn(str(target), result.stdout)

    def test_copy_install_copies_runtime_plugin_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            hermes_home = Path(tmp) / "hermes"
            result = subprocess.run(
                [str(ROOT / "scripts" / "install.sh"), "--copy"],
                env={**os.environ, "HERMES_HOME": str(hermes_home)},
                text=True,
                capture_output=True,
                check=False,
            )

            target = hermes_home / "plugins" / "model-providers" / "qvac"
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(target.is_dir())
            self.assertFalse(target.is_symlink())
            self.assertTrue((target / "plugin.yaml").is_file())
            self.assertTrue((target / "__init__.py").is_file())
            self.assertTrue((target / "qvac_provider" / "__init__.py").is_file())
            self.assertTrue((target / "scripts" / "doctor.sh").is_file())

    def test_invalid_install_mode_prints_usage(self):
        with tempfile.TemporaryDirectory() as tmp:
            hermes_home = Path(tmp) / "hermes"
            result = subprocess.run(
                [str(ROOT / "scripts" / "install.sh"), "--invalid"],
                env={**os.environ, "HERMES_HOME": str(hermes_home)},
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(result.returncode, 2)
            self.assertIn("Usage:", result.stderr)


class DoctorScriptTest(unittest.TestCase):
    def run_doctor_with_fake_commands(self, hermes_body: str) -> subprocess.CompletedProcess:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            bin_dir = tmp_path / "bin"
            bin_dir.mkdir()
            hermes_log = tmp_path / "hermes.log"

            make_executable(
                bin_dir / "hermes",
                f"""
                #!/usr/bin/env bash
                printf '%s\\n' "$*" >> "$HERMES_LOG"
                {hermes_body}
                """,
            )
            make_executable(
                bin_dir / "qvac",
                """
                #!/usr/bin/env bash
                if [[ "$1" == "--version" ]]; then
                  echo "qvac test"
                  exit 0
                fi
                exit 2
                """,
            )
            make_executable(
                bin_dir / "curl",
                """
                #!/usr/bin/env bash
                echo '{"data":[]}'
                """,
            )

            return subprocess.run(
                [str(ROOT / "scripts" / "doctor.sh")],
                env={
                    **os.environ,
                    "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
                    "HERMES_LOG": str(hermes_log),
                },
                text=True,
                capture_output=True,
                check=False,
            )

    def test_doctor_uses_current_hermes_plugins_list_surface(self):
        result = self.run_doctor_with_fake_commands(
            """
            case "$1 $2" in
              "plugins list")
                echo "qvac 0.1.0-alpha.1 model-provider"
                exit 0
                ;;
              "providers list"|"model-providers list")
                echo "deprecated provider list command used" >&2
                exit 99
                ;;
              *)
                exit 2
                ;;
            esac
            """
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ok - Hermes plugins list includes qvac", result.stdout)
        self.assertIn("interactive 'hermes model'", result.stdout)
        self.assertNotIn("deprecated provider list command used", result.stderr)

    def test_doctor_fails_when_hermes_plugins_list_omits_qvac(self):
        result = self.run_doctor_with_fake_commands(
            """
            if [[ "$1 $2" == "plugins list" ]]; then
              echo "other-plugin"
              exit 0
            fi
            exit 2
            """
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("fail - Hermes plugins list includes qvac", result.stdout)


if __name__ == "__main__":
    unittest.main()
