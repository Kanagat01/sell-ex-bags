from django.apps import AppConfig


class ApplicationsConfig(AppConfig):
    name = "apps.applications"

    def ready(self):
        from . import signals  # noqa: F401
