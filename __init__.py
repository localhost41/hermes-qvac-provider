"""Hermes model-provider plugin entrypoint for QVAC."""

try:
    from .qvac_provider import PROVIDER_PROFILE, register as register_qvac_provider
except ImportError:
    from qvac_provider import PROVIDER_PROFILE, register as register_qvac_provider


def register(registry=None):
    """Register QVAC with a Hermes-style registry when one is supplied."""

    if registry is not None:
        return register_qvac_provider(registry)

    try:
        from providers import register_provider
    except Exception:
        return PROVIDER_PROFILE

    register_provider(PROVIDER_PROFILE)
    return PROVIDER_PROFILE


register()

__all__ = ["PROVIDER_PROFILE", "register"]
