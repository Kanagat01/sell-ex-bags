from django.contrib import admin

from .models import RelayHealth, TelegramOutbox


@admin.register(TelegramOutbox)
class TelegramOutboxAdmin(admin.ModelAdmin):
    list_display = ["created_at", "text"]


@admin.register(RelayHealth)
class RelayHealthAdmin(admin.ModelAdmin):
    list_display = ["failing_since", "alert_sent"]
