from pathlib import Path
import unittest

from qvac_provider import DEFAULT_BASE_URL, FALLBACK_MODELS, PROVIDER_PROFILE


ROOT = Path(__file__).resolve().parents[1]


def profile_value(name):
    if hasattr(PROVIDER_PROFILE, name):
        return getattr(PROVIDER_PROFILE, name)
    return PROVIDER_PROFILE[name]


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


if __name__ == "__main__":
    unittest.main()
