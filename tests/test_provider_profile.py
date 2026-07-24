import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import types
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

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
        plugin_entrypoint = ROOT / "__init__.py"

        self.assertTrue(plugin_yaml.exists())
        self.assertTrue(plugin_entrypoint.exists())
        text = plugin_yaml.read_text(encoding="utf-8")
        self.assertIn("id: qvac", text)
        self.assertIn("kind: model-provider", text)
        self.assertIn("register_provider(PROVIDER_PROFILE)", plugin_entrypoint.read_text(encoding="utf-8"))

    def test_root_plugin_entrypoint_imports_without_hermes_runtime(self):
        plugin_entrypoint = ROOT / "__init__.py"
        spec = importlib.util.spec_from_file_location(
            "hermes_qvac_provider_plugin",
            plugin_entrypoint,
            submodule_search_locations=[str(ROOT)],
        )
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        module = importlib.util.module_from_spec(spec)

        spec.loader.exec_module(module)

        self.assertEqual(module.PROVIDER_PROFILE.name, "qvac")

    def test_provider_profile_uses_hermes_runtime_profile_when_available(self):
        original_providers = sys.modules.get("providers")
        original_base = sys.modules.get("providers.base")
        original_qvac_provider = sys.modules.pop("qvac_provider", None)
        try:
            providers_module = types.ModuleType("providers")
            base_module = types.ModuleType("providers.base")

            class FakeProviderProfile:
                def __init__(self, **kwargs):
                    self.__dict__.update(kwargs)

                def prepare_messages(self, messages):
                    return messages

                def build_extra_body(self, **context):
                    return {}

                def build_api_kwargs_extras(self, **context):
                    return {}, {}

            base_module.ProviderProfile = FakeProviderProfile
            providers_module.base = base_module
            sys.modules["providers"] = providers_module
            sys.modules["providers.base"] = base_module

            spec = importlib.util.spec_from_file_location(
                "qvac_provider",
                ROOT / "qvac_provider" / "__init__.py",
                submodule_search_locations=[str(ROOT / "qvac_provider")],
            )
            self.assertIsNotNone(spec)
            self.assertIsNotNone(spec.loader)
            module = importlib.util.module_from_spec(spec)
            sys.modules["qvac_provider"] = module

            spec.loader.exec_module(module)

            self.assertIsInstance(module.PROVIDER_PROFILE, FakeProviderProfile)
            self.assertTrue(hasattr(module.PROVIDER_PROFILE, "prepare_messages"))
        finally:
            sys.modules.pop("qvac_provider", None)
            if original_qvac_provider is not None:
                sys.modules["qvac_provider"] = original_qvac_provider
            if original_providers is not None:
                sys.modules["providers"] = original_providers
            else:
                sys.modules.pop("providers", None)
            if original_base is not None:
                sys.modules["providers.base"] = original_base
            else:
                sys.modules.pop("providers.base", None)

    def test_provider_profile_filters_fields_for_current_hermes_constructor(self):
        original_providers = sys.modules.get("providers")
        original_base = sys.modules.get("providers.base")
        original_qvac_provider = sys.modules.pop("qvac_provider", None)
        try:
            providers_module = types.ModuleType("providers")
            base_module = types.ModuleType("providers.base")

            class CurrentHermesProviderProfile:
                def __init__(self, name, api_mode="chat_completions", aliases=(), supports_vision=False):
                    self.name = name
                    self.api_mode = api_mode
                    self.aliases = aliases
                    self.supports_vision = supports_vision

            base_module.ProviderProfile = CurrentHermesProviderProfile
            providers_module.base = base_module
            sys.modules["providers"] = providers_module
            sys.modules["providers.base"] = base_module
            spec = importlib.util.spec_from_file_location(
                "qvac_provider",
                ROOT / "qvac_provider" / "__init__.py",
                submodule_search_locations=[str(ROOT / "qvac_provider")],
            )
            module = importlib.util.module_from_spec(spec)
            sys.modules["qvac_provider"] = module
            spec.loader.exec_module(module)

            self.assertEqual(module.PROVIDER_PROFILE.name, "qvac")
            self.assertTrue(module.PROVIDER_PROFILE.supports_vision)
            self.assertEqual(module.PROVIDER_PROFILE.metadata["provider_id"], "qvac")
        finally:
            sys.modules.pop("qvac_provider", None)
            if original_qvac_provider is not None:
                sys.modules["qvac_provider"] = original_qvac_provider
            if original_providers is not None:
                sys.modules["providers"] = original_providers
            else:
                sys.modules.pop("providers", None)
            if original_base is not None:
                sys.modules["providers.base"] = original_base
            else:
                sys.modules.pop("providers.base", None)

    def test_provider_profile_registers_qvac(self):
        self.assertEqual(profile_value("name"), "qvac")

    def test_fallback_model_list_contains_recommended_model(self):
        self.assertIn("qwen3.5-9b", FALLBACK_MODELS)
        self.assertIn("qwen3.5-9b", profile_value("fallback_models"))

    def test_python_fallback_catalog_matches_official_node_catalog(self):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", "import {qvacCatalog} from '@qvac/ai-sdk-provider/models'; console.log(JSON.stringify(qvacCatalog.map(x=>x.id)))"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertEqual(FALLBACK_MODELS, json.loads(result.stdout))

    def test_base_url_defaults_to_local_openai_endpoint(self):
        self.assertEqual(DEFAULT_BASE_URL, "http://127.0.0.1:11434/v1")
        self.assertEqual(profile_value("base_url"), "http://127.0.0.1:11434/v1")

    def test_import_rejects_an_unsafe_environment_base_url(self):
        result = subprocess.run(
            ["python3", "-c", "import qvac_provider"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            env={**os.environ, "QVAC_BASE_URL": "file:///tmp/not-http/v1"},
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("QVAC_BASE_URL must be", result.stderr)

    def test_api_mode_is_chat_completions(self):
        self.assertEqual(profile_value("api_mode"), "chat_completions")

    def test_profile_advertises_multimodal_qvac_support(self):
        self.assertTrue(profile_value("supports_vision"))
        self.assertTrue(profile_value("supports_vision_tool_messages"))

    def test_model_fetch_is_bounded_authenticated_and_uses_effective_base_url(self):
        seen = {}

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                seen["path"] = self.path
                seen["authorization"] = self.headers.get("Authorization")
                payload = json.dumps({"data": [{"id": "qwen3.5-9b"}]}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, *_args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base_url = f"http://127.0.0.1:{server.server_address[1]}/v1"
            self.assertEqual(PROVIDER_PROFILE.fetch_models(api_key="marker", base_url=base_url), ["qwen3.5-9b"])
            self.assertEqual(seen, {"path": "/v1/models", "authorization": "Bearer marker"})
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_model_fetch_refuses_redirects_before_forwarding_credentials(self):
        seen = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                seen.append((self.path, self.headers.get("Authorization")))
                if self.path == "/v1/models":
                    self.send_response(302)
                    self.send_header("Location", "/redirected")
                    self.end_headers()
                    return
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"data":[]}')

            def log_message(self, *_args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base_url = f"http://127.0.0.1:{server.server_address[1]}/v1"
            self.assertIsNone(PROVIDER_PROFILE.fetch_models(api_key="private", base_url=base_url))
            self.assertEqual(seen, [("/v1/models", "Bearer private")])
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_model_fetch_rejects_non_http_and_embedded_credential_urls(self):
        self.assertIsNone(PROVIDER_PROFILE.fetch_models(base_url="file:///tmp/private"))
        self.assertIsNone(
            PROVIDER_PROFILE.fetch_models(
                api_key="private",
                base_url="http://user:password@127.0.0.1:9/v1",
            )
        )

    def test_text_content_blocks_are_normalized_to_qvac_string_content(self):
        messages = [
            {"role": "user", "content": [{"type": "text", "text": "hello"}, {"type": "input_text", "text": "world"}]},
            {"role": "assistant", "content": "unchanged"},
        ]
        prepared = PROVIDER_PROFILE.prepare_messages(messages)
        self.assertEqual(prepared[0]["content"], "hello\nworld")
        self.assertEqual(prepared[1]["content"], "unchanged")
        self.assertEqual(messages[0]["content"][0]["text"], "hello")

    def test_multimodal_content_blocks_remain_structured(self):
        content = [{"type": "text", "text": "look"}, {"type": "image_url", "image_url": {"url": "data:image/png;base64,AA=="}}]
        prepared = PROVIDER_PROFILE.prepare_messages([{"role": "user", "content": content}])
        self.assertEqual(prepared[0]["content"], content)
        self.assertIsNot(prepared[0]["content"], content)

    def test_message_normalization_copies_system_and_tool_messages(self):
        messages = [
            {"role": "system", "content": [{"type": "text", "text": "rules"}]},
            {"role": "tool", "tool_call_id": "call-1", "content": [{"type": "text", "text": "result"}]},
        ]
        prepared = PROVIDER_PROFILE.prepare_messages(messages)
        self.assertEqual(prepared, [
            {"role": "system", "content": "rules"},
            {"role": "tool", "tool_call_id": "call-1", "content": "result"},
        ])
        self.assertEqual(messages[0]["content"], [{"type": "text", "text": "rules"}])
        self.assertIsNot(prepared[0], messages[0])

    def test_base_url_environment_override_is_applied_at_hermes_import(self):
        result = subprocess.run(
            [sys.executable, "-c", "import json, qvac_provider; p=qvac_provider.PROVIDER_PROFILE; print(json.dumps([p.base_url, p.models_url]))"],
            cwd=ROOT,
            env={**os.environ, "QVAC_BASE_URL": "http://127.0.0.1:19000/v1"},
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertEqual(json.loads(result.stdout), ["http://127.0.0.1:19000/v1", ""])

    def test_readme_contains_smoke_test_instructions(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8").lower()

        self.assertIn("smoke test", readme)
        self.assertIn("hermes-qvac smoke --transport-only", readme)

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
                "readyTimeoutMs": 900000,
                "idleStopMs": 0,
                "timeoutSeconds": 300,
                "healthCheckPath": "/v1/models",
            },
        )
        self.assertEqual(metadata["lifecycle_config"], DEFAULT_LIFECYCLE_CONFIG)

    def test_readme_documents_companion_cli_lifecycle(self):
        readme = " ".join((ROOT / "README.md").read_text(encoding="utf-8").lower().split())

        self.assertIn("official qvac managed provider", readme)
        self.assertIn("official qvac managed provider", readme)
        self.assertIn("hermes-qvac run", readme)


if __name__ == "__main__":
    unittest.main()
