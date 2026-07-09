"""Hermes model-provider profile for local QVAC.

The provider mirrors Tether's OpenClaw QVAC defaults while targeting Hermes
Agent's Python model-provider plugin shape. The module intentionally keeps the
runtime surface small: v0.1 registers a static provider profile and expects the
user to run `qvac serve openai` separately.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

DEFAULT_BASE_URL = "http://127.0.0.1:11434/v1"
DEFAULT_MODELS_URL = "http://127.0.0.1:11434/v1/models"
DEFAULT_MODEL = "qwen3.5-9b"
DEFAULT_AUX_MODEL = "qwen3.5-2b"
DEFAULT_MAX_TOKENS = 8192
DEFAULT_CONTEXT_WINDOW = 32768
DEFAULT_QVAC_COMMAND = "qvac serve openai"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 11434
DEFAULT_READY_TIMEOUT_MS = 30_000
DEFAULT_IDLE_STOP_MS = 0
DEFAULT_TIMEOUT_SECONDS = 120
MANAGED_LIFECYCLE_SUPPORTED = False
LIFECYCLE_LIMITATION = (
    "Hermes model-provider plugins currently expose declarative ProviderProfile "
    "request/catalog hooks, but not a clean provider-local service lifecycle hook. "
    "QVAC must be started manually."
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
    "qwen3.5-9b",
    "qwen3.5-4b",
    "qwen3.5-2b",
    "qwen3.5-0.8b",
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


def _hermes_provider_profile_class() -> type[Any]:
    try:
        from hermes.model_providers import ProviderProfile  # type: ignore

        return ProviderProfile
    except Exception:
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
        "base_url": DEFAULT_BASE_URL,
        "models_url": DEFAULT_MODELS_URL,
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
                "reasoningBudget": None,
                "tools": True,
                "readyTimeoutMs": DEFAULT_READY_TIMEOUT_MS,
                "idleStopMs": DEFAULT_IDLE_STOP_MS,
                "timeoutSeconds": DEFAULT_TIMEOUT_SECONDS,
            },
        },
    }
    try:
        return profile_class(**kwargs)
    except TypeError:
        supported = getattr(profile_class, "__annotations__", {})
        filtered = {key: value for key, value in kwargs.items() if key in supported}
        return profile_class(**filtered)


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
