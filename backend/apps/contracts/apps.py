from django.apps import AppConfig


class ContractsConfig(AppConfig):
    name = "apps.contracts"

    def ready(self):
        from . import signals  # noqa: F401
