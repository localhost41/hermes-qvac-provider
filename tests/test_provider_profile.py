from pathlib import Path
import unittest

from qvac_provider import (
    DEFAULT_BASE_URL,
    DEFAULT_LIFECYCLE_CONFIG,
    FALLBACK_MODELS,
    LIFECYCLE_LIMITATION,
    MANAGED_LIFECYCLE_SUPPORTED,
    PROVIDER_PROFILE,
)


ROOT = Path(__file__).resolve().parents[1]


def profile_value(name):
    if hasattr(PROVIDER_PROFILE, name):
        return getattr(PROVIDER_PROFILE, name)
    return PROVIDER_PROFILE[name]


def profile_metadata():
    return profile_value("metadata")


class ProviderProfileTest(unittest.TestCase):
    def test_plugin_metadata_exists(self):
        plugin_yaml = ROOT / "plugin.yaml"

        self.assertTrue(plugin_yaml.exists())
        text = plugin_yaml.read_text(encoding="utf-8")
        self.assertIn("id: qvac", text)
        self.assertIn("type: model-provider", text)

    def test_provider_profile_registers_qvac(self):
        self.assertEqual(profile_value("name"), "qvac")

    def test_fallback_model_list_contains_recommended_model(self):
        self.assertIn("qwen3.5-9b", FALLBACK_MODELS)
        self.assertIn("qwen3.5-9b", profile_value("fallback_models"))

    def test_base_url_defaults_to_local_openai_endpoint(self):
        self.assertEqual(DEFAULT_BASE_URL, "http://127.0.0.1:11434/v1")
        self.assertEqual(profile_value("base_url"), "http://127.0.0.1:11434/v1")

    def test_api_mode_is_chat_completions(self):
        self.assertEqual(profile_value("api_mode"), "chat_completions")

    def test_readme_contains_smoke_test_instructions(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8").lower()

        self.assertIn("smoke test", readme)
        self.assertIn("scripts/doctor.sh", readme)

    def test_lifecycle_limitation_is_documented_in_profile_metadata(self):
        metadata = profile_metadata()

        self.assertFalse(MANAGED_LIFECYCLE_SUPPORTED)
        self.assertFalse(metadata["managed_lifecycle_supported"])
        self.assertEqual(metadata["lifecycle_limitation"], LIFECYCLE_LIMITATION)
        self.assertIn("provider-local service lifecycle hook", LIFECYCLE_LIMITATION)

    def test_lifecycle_config_defaults_match_manual_qvac_server(self):
        metadata = profile_metadata()

        self.assertEqual(
            metadata["lifecycle_config"],
            {
                "enabled": False,
                "qvacCommand": "qvac serve openai",
                "host": "127.0.0.1",
                "port": 11434,
                "cwd": "",
                "readyTimeoutMs": 30000,
                "idleStopMs": 0,
                "timeoutSeconds": 120,
                "healthCheckPath": "/v1/models",
            },
        )
        self.assertEqual(metadata["lifecycle_config"], DEFAULT_LIFECYCLE_CONFIG)

    def test_readme_documents_manual_lifecycle_limitation(self):
        readme = " ".join((ROOT / "README.md").read_text(encoding="utf-8").lower().split())

        self.assertIn("managed lifecycle", readme)
        self.assertIn("no clean provider-local service lifecycle hook", readme)
        self.assertIn("qvac serve openai --host 127.0.0.1 --port 11434", readme)


if __name__ == "__main__":
    unittest.main()
