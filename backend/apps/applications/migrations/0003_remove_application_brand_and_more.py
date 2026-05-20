import django.db.models.deletion
from django.db import migrations, models


def migrate_items_forward(apps, schema_editor):
    Application = apps.get_model("applications", "Application")
    ApplicationItem = apps.get_model("applications", "ApplicationItem")
    ApplicationPhoto = apps.get_model("applications", "ApplicationPhoto")

    for app in Application.objects.all():
        item = ApplicationItem.objects.create(
            application=app,
            brand=app.brand,
            model=app.model or "",
            size=app.size or "",
            condition=app.condition,
            defects_description=app.defects_description or "",
            desired_price=app.desired_price,
            offered_price=app.offered_price,
            order=0,
        )
        ApplicationPhoto.objects.filter(application=app).update(item=item)


def migrate_items_backward(apps, schema_editor):
    ApplicationItem = apps.get_model("applications", "ApplicationItem")
    ApplicationPhoto = apps.get_model("applications", "ApplicationPhoto")

    # Restore product fields from the first item of each application
    for item in ApplicationItem.objects.select_related("application").filter(order=0):
        app = item.application
        app.brand = item.brand
        app.model = item.model
        app.size = item.size
        app.condition = item.condition
        app.defects_description = item.defects_description
        app.desired_price = item.desired_price
        app.offered_price = item.offered_price
        app.save(update_fields=[
            "brand", "model", "size", "condition",
            "defects_description", "desired_price", "offered_price",
        ])

    ApplicationPhoto.objects.all().update(item=None)


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0002_alter_application_condition"),
    ]

    operations = [
        migrations.AlterField(
            model_name="application",
            name="status",
            field=models.CharField(
                choices=[
                    ("new", "Новая"),
                    ("offer_sent", "Предложение отправлено"),
                    ("accepted", "Принято"),
                    ("declined", "Отказано"),
                    ("contract_signed", "Договор подписан"),
                    ("item_transferred", "Товар передан"),
                    ("return_processed", "Оформлен возврат"),
                ],
                default="new",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="ApplicationItem",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("brand", models.CharField(max_length=100)),
                ("model", models.CharField(blank=True, max_length=200)),
                ("size", models.CharField(blank=True, max_length=50)),
                (
                    "condition",
                    models.CharField(
                        choices=[
                            ("excellent", "Отличное"),
                            ("good", "Хорошее"),
                            ("satisfactory", "Удовлетворительное"),
                        ],
                        max_length=20,
                    ),
                ),
                ("defects_description", models.TextField(blank=True)),
                ("desired_price", models.DecimalField(
                    decimal_places=2, max_digits=12)),
                (
                    "offered_price",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=12, null=True
                    ),
                ),
                ("order", models.PositiveSmallIntegerField(default=0)),
                (
                    "application",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="applications.application",
                    ),
                ),
            ],
            options={
                "verbose_name": "Изделие",
                "verbose_name_plural": "Изделия",
                "db_table": "application_items",
                "ordering": ["order"],
            },
        ),
        migrations.AddField(
            model_name="applicationphoto",
            name="item",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="photos",
                to="applications.applicationitem",
            ),
        ),
        # Copy product fields from each Application into a new ApplicationItem row,
        # then associate all existing photos with that item.
        migrations.RunPython(migrate_items_forward, migrate_items_backward),
        migrations.RemoveField(
            model_name="application",
            name="brand",
        ),
        migrations.RemoveField(
            model_name="application",
            name="condition",
        ),
        migrations.RemoveField(
            model_name="application",
            name="defects_description",
        ),
        migrations.RemoveField(
            model_name="application",
            name="desired_price",
        ),
        migrations.RemoveField(
            model_name="application",
            name="model",
        ),
        migrations.RemoveField(
            model_name="application",
            name="offered_price",
        ),
        migrations.RemoveField(
            model_name="application",
            name="size",
        ),
    ]
