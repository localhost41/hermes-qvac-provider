"""Hermes model-provider profile for local QVAC.

The provider mirrors Tether's OpenClaw QVAC defaults while targeting Hermes
Agent's Python model-provider plugin shape. The declarative profile is paired
with the ``hermes-qvac`` CLI, which owns the official managed QVAC lifecycle.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from copy import deepcopy
import inspect
import json
import os
from typing import Any
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


def _validated_base_url(value: str) -> str:
    normalized = value.rstrip("/")
    parsed = urlparse(normalized)
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or not parsed.path.rstrip("/").endswith("/v1")
    ):
        raise ValueError(
            "QVAC_BASE_URL must be an HTTP(S) URL ending in /v1 without embedded credentials, query, or fragment"
        )
    return normalized

DEFAULT_BASE_URL = _validated_base_url(
    os.environ.get("QVAC_BASE_URL", "http://127.0.0.1:11434/v1")
)
DEFAULT_MODELS_URL = f"{DEFAULT_BASE_URL}/models"
DEFAULT_MODEL = "qwen3.5-9b"
DEFAULT_AUX_MODEL = "qwen3.5-2b"
DEFAULT_MAX_TOKENS = 8192
DEFAULT_CONTEXT_WINDOW = 32768
DEFAULT_QVAC_COMMAND = "qvac serve openai"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 11434
DEFAULT_READY_TIMEOUT_MS = 900_000
DEFAULT_IDLE_STOP_MS = 0
DEFAULT_TIMEOUT_SECONDS = 300
MANAGED_LIFECYCLE_SUPPORTED = False
LIFECYCLE_LIMITATION = (
    "Hermes model-provider plugins do not expose a provider-local service lifecycle hook; "
    "managed lifecycle is provided by the companion hermes-qvac CLI."
)

DEFAULT_LIFECYCLE_CONFIG = {
    "enabled": MANAGED_LIFECYCLE_SUPPORTED,
    "qvacCommand": DEFAULT_QVAC_COMMAND,
    "host": DEFAULT_HOST,
    "port": DEFAULT_PORT,
    "cwd": "",
    "readyTimeoutMs": DEFAULT_READY_TIMEOUT_MS,
    "idleStopMs": DEFAULT_IDLE_STOP_MS,
    "timeoutSeconds": DEFAULT_TIMEOUT_SECONDS,
    "healthCheckPath": "/v1/models",
}

FALLBACK_MODELS = [
    "qwen3.5-0.8b",
    "qwen3.5-2b",
    "qwen3.5-4b",
    "qwen3.5-9b",
    "qwen3.6-27b",
    "qwen3.6-35b-a3b",
    "gpt-oss-20b",
    "gemma4-31b",
]

FRIENDLY_MODEL_IDS = [
    "qwen3.5-0.8b",
    "qwen3.5-2b",
    "qwen3.5-4b",
    "qwen3.5-9b",
    "qwen3.6-27b",
    "qwen3.6-35b-a3b",
    "gpt-oss-20b",
    "gemma4-31b",
]


@dataclass(frozen=True)
class LocalProviderProfile:
    """Small fallback profile used when Hermes is not importable in tests."""

    name: str
    aliases: tuple[str, ...]
    display_name: str
    description: str
    api_mode: str
    auth_type: str
    supports_vision: bool
    supports_vision_tool_messages: bool
    base_url: str
    models_url: str
    env_vars: tuple[str, ...]
    fallback_models: tuple[str, ...]
    default_max_tokens: int
    default_aux_model: str
    default_model: str = DEFAULT_MODEL
    context_window: int = DEFAULT_CONTEXT_WINDOW
    cost_per_input_token: float = 0.0
    cost_per_output_token: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "aliases": list(self.aliases),
            "display_name": self.display_name,
            "description": self.description,
            "api_mode": self.api_mode,
            "auth_type": self.auth_type,
            "supports_vision": self.supports_vision,
            "base_url": self.base_url,
            "models_url": self.models_url,
            "env_vars": list(self.env_vars),
            "fallback_models": list(self.fallback_models),
            "default_max_tokens": self.default_max_tokens,
            "default_aux_model": self.default_aux_model,
            "default_model": self.default_model,
            "context_window": self.context_window,
            "cost_per_input_token": self.cost_per_input_token,
            "cost_per_output_token": self.cost_per_output_token,
            "metadata": dict(self.metadata),
        }

    def prepare_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return _prepare_messages(messages)

    def fetch_models(self, *, api_key: str | None = None, base_url: str | None = None, timeout: float = 8.0) -> list[str] | None:
        return _fetch_models(base_url or self.base_url, api_key, timeout)


def _prepare_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Match QVAC's requiresStringContent compatibility behavior.

    Hermes can represent text as OpenAI content blocks. QVAC's official
    OpenClaw catalog requests string content, so collapse text-only lists while
    preserving any list that carries an image or another non-text block.
    """

    prepared: list[dict[str, Any]] = []
    for message in messages:
        copied = deepcopy(message)
        content = copied.get("content")
        if not isinstance(content, list):
            prepared.append(copied)
            continue
        text_parts: list[str] = []
        text_only = True
        for part in content:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict) and part.get("type") in ("text", "input_text") and isinstance(part.get("text"), str):
                text_parts.append(part["text"])
            else:
                text_only = False
                break
        prepared.append({**copied, "content": "\n".join(text_parts)} if text_only else copied)
    return prepared


def _fetch_models(base_url: str, api_key: str | None, timeout: float) -> list[str] | None:
    """Fetch a bounded OpenAI-compatible catalog from the effective endpoint."""

    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> None:
            return None

    endpoint = f"{base_url.rstrip('/')}/models"
    parsed = urlparse(endpoint)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        return None

    request = Request(
        endpoint,
        headers={
            "Accept": "application/json",
            "User-Agent": "hermes-qvac-provider",
            **({"Authorization": f"Bearer {api_key}"} if api_key else {}),
        },
    )
    try:
        with build_opener(NoRedirect).open(request, timeout=max(0.1, float(timeout))) as response:
            raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            return None
        body = json.loads(raw)
        data = body.get("data") if isinstance(body, dict) else None
        if not isinstance(data, list) or len(data) > 10000:
            return None
        models = [item.get("id") for item in data if isinstance(item, dict)]
        if len(models) != len(data) or any(not isinstance(model, str) or not model or len(model) > 200 for model in models):
            return None
        return models
    except Exception:
        return None


def _hermes_provider_profile_class() -> type[Any]:
    try:
        from providers.base import ProviderProfile  # type: ignore

        class QvacProviderProfile(ProviderProfile):
            def prepare_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
                return _prepare_messages(messages)

            def fetch_models(self, *, api_key: str | None = None, base_url: str | None = None, timeout: float = 8.0) -> list[str] | None:
                return _fetch_models(base_url or self.base_url, api_key, timeout)

        return QvacProviderProfile
    except ModuleNotFoundError as error:
        if error.name not in ("providers", "providers.base"):
            raise
        return LocalProviderProfile


def create_provider_profile() -> Any:
    profile_class = _hermes_provider_profile_class()
    kwargs = {
        "name": "qvac",
        "aliases": ("local-qvac", "qvac-local"),
        "display_name": "QVAC",
        "description": "Local-first QVAC models via qvac serve openai",
        "api_mode": "chat_completions",
        "auth_type": "api_key",
        "supports_vision": True,
        "supports_vision_tool_messages": True,
        "base_url": DEFAULT_BASE_URL,
        # Leave this empty so Hermes derives /models from an effective caller or
        # environment base-URL override instead of pinning the import-time URL.
        "models_url": "",
        "env_vars": ("QVAC_API_KEY", "QVAC_BASE_URL"),
        "fallback_models": tuple(FALLBACK_MODELS),
        "default_max_tokens": DEFAULT_MAX_TOKENS,
        "default_aux_model": DEFAULT_AUX_MODEL,
        "default_model": DEFAULT_MODEL,
        "context_window": DEFAULT_CONTEXT_WINDOW,
        "cost_per_input_token": 0.0,
        "cost_per_output_token": 0.0,
        "metadata": {
            "provider_id": "qvac",
            "friendly_model_ids": FRIENDLY_MODEL_IDS,
            "server_command": "qvac serve openai --host 127.0.0.1 --port 11434",
            "zero_cost_local_models": True,
            "managed_lifecycle_supported": MANAGED_LIFECYCLE_SUPPORTED,
            "lifecycle_limitation": LIFECYCLE_LIMITATION,
            "lifecycle_config": dict(DEFAULT_LIFECYCLE_CONFIG),
            "config_options": {
                "model": DEFAULT_MODEL,
                "host": DEFAULT_HOST,
                "port": DEFAULT_PORT,
                "baseUrl": DEFAULT_BASE_URL,
                "apiKey": "custom-local",
                "qvacCommand": DEFAULT_QVAC_COMMAND,
                "cwd": "",
                "ctxSize": DEFAULT_CONTEXT_WINDOW,
                "reasoningBudget": -1,
                "tools": True,
                "readyTimeoutMs": DEFAULT_READY_TIMEOUT_MS,
                "idleStopMs": DEFAULT_IDLE_STOP_MS,
                "timeoutSeconds": DEFAULT_TIMEOUT_SECONDS,
            },
        },
    }
    signature = inspect.signature(profile_class)
    accepts_arbitrary_keywords = any(
        parameter.kind is inspect.Parameter.VAR_KEYWORD
        for parameter in signature.parameters.values()
    )
    constructor_kwargs = kwargs if accepts_arbitrary_keywords else {
        key: value for key, value in kwargs.items() if key in signature.parameters
    }
    profile = profile_class(**constructor_kwargs)
    # Hermes' current ProviderProfile deliberately has a smaller declarative
    # surface than our portable fallback. Keep companion-CLI metadata available
    # for introspection without passing unknown fields into Hermes' constructor.
    for key, value in kwargs.items():
        if key not in constructor_kwargs:
            setattr(profile, key, value)
    return profile


PROVIDER_PROFILE = create_provider_profile()


def register(registry: Any | None = None) -> Any:
    """Register the QVAC provider with a Hermes-style registry when supplied."""

    if registry is None:
        return PROVIDER_PROFILE

    if hasattr(registry, "register_provider"):
        registry.register_provider(PROVIDER_PROFILE)
        return PROVIDER_PROFILE

    if hasattr(registry, "register"):
        registry.register(PROVIDER_PROFILE)
        return PROVIDER_PROFILE

    raise TypeError("Hermes registry must expose register_provider() or register().")


__all__ = [
    "DEFAULT_AUX_MODEL",
    "DEFAULT_BASE_URL",
    "DEFAULT_CONTEXT_WINDOW",
    "DEFAULT_HOST",
    "DEFAULT_IDLE_STOP_MS",
    "DEFAULT_LIFECYCLE_CONFIG",
    "DEFAULT_MAX_TOKENS",
    "DEFAULT_MODEL",
    "DEFAULT_MODELS_URL",
    "DEFAULT_PORT",
    "DEFAULT_QVAC_COMMAND",
    "DEFAULT_READY_TIMEOUT_MS",
    "DEFAULT_TIMEOUT_SECONDS",
    "FALLBACK_MODELS",
    "FRIENDLY_MODEL_IDS",
    "LIFECYCLE_LIMITATION",
    "LocalProviderProfile",
    "MANAGED_LIFECYCLE_SUPPORTED",
    "PROVIDER_PROFILE",
    "create_provider_profile",
    "register",
]
