"""Hermes model-provider plugin entrypoint for QVAC."""

import importlib
import sys


if __package__ and __package__ in sys.modules:
    from .qvac_provider import PROVIDER_PROFILE, register as register_qvac_provider
else:
    from qvac_provider import PROVIDER_PROFILE, register as register_qvac_provider


def register(registry=None):
    """Register QVAC with a Hermes-style registry when one is supplied."""

    if registry is not None:
        return register_qvac_provider(registry)

    try:
        providers = importlib.import_module("providers")
    except ModuleNotFoundError as error:
        if error.name != "providers":
            raise
        return PROVIDER_PROFILE

    register_provider = getattr(providers, "register_provider", None)
    if register_provider is None:
        return PROVIDER_PROFILE

    register_provider(PROVIDER_PROFILE)
    return PROVIDER_PROFILE


register()

__all__ = ["PROVIDER_PROFILE", "register"]
