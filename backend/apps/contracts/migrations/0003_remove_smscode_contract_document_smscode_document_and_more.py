import apps.contracts.models
import django.db.models.deletion
import uuid
from django.db import migrations, models


def migrate_contracts_to_documents(apps, schema_editor):
    Contract = apps.get_model("contracts", "Contract")
    Document = apps.get_model("contracts", "Document")
    SmsCode = apps.get_model("contracts", "SmsCode")

    for contract in Contract.objects.select_related("application").all():
        document = Document.objects.create(
            application=contract.application,
            document_type="contract",
            sign_token=contract.sign_token,
            document_number=contract.contract_number,
            pdf_file=contract.pdf_file.name or "",
            is_signed=contract.is_signed,
            signed_at=contract.signed_at,
            signed_by_phone=contract.signed_by_phone,
        )
        # Preserve original timestamp — bypass auto_now_add via queryset update
        Document.objects.filter(pk=document.pk).update(created_at=contract.created_at)
        SmsCode.objects.filter(contract=contract).update(document=document)


def migrate_documents_to_contracts_backward(apps, schema_editor):
    Document = apps.get_model("contracts", "Document")
    Contract = apps.get_model("contracts", "Contract")
    SmsCode = apps.get_model("contracts", "SmsCode")

    for document in Document.objects.filter(document_type="contract").select_related("application"):
        contract, _ = Contract.objects.get_or_create(
            application=document.application,
            defaults={
                "sign_token": document.sign_token,
                "contract_number": document.document_number,
                "pdf_file": document.pdf_file.name or "",
                "is_signed": document.is_signed,
                "signed_at": document.signed_at,
                "signed_by_phone": document.signed_by_phone,
            },
        )
        SmsCode.objects.filter(document=document).update(contract=contract)


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0003_remove_application_brand_and_more"),
        ("contracts", "0002_contract_contract_number"),
    ]

    operations = [
        migrations.CreateModel(
            name="Document",
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
                (
                    "document_type",
                    models.CharField(
                        choices=[
                            ("contract", "Договор"),
                            ("acceptance", "Акт приёма-передачи"),
                            ("return", "Акт возврата"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "sign_token",
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                ("document_number", models.CharField(blank=True, max_length=20)),
                (
                    "pdf_file",
                    models.FileField(
                        blank=True, upload_to=apps.contracts.models.document_upload_path
                    ),
                ),
                ("is_signed", models.BooleanField(default=False)),
                ("signed_at", models.DateTimeField(blank=True, null=True)),
                ("signed_by_phone", models.CharField(blank=True, max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "application",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="applications.application",
                    ),
                ),
            ],
            options={
                "verbose_name": "Документ",
                "verbose_name_plural": "Документы",
                "db_table": "documents",
            },
        ),
        # Add as nullable first so existing SmsCode rows are valid before data migration
        migrations.AddField(
            model_name="smscode",
            name="document",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="sms_codes",
                to="contracts.document",
            ),
        ),
        # Copy each Contract → Document, reassign SmsCode.contract → SmsCode.document
        migrations.RunPython(
            migrate_contracts_to_documents,
            migrate_documents_to_contracts_backward,
        ),
        # All rows now have a document; make the FK non-nullable
        migrations.AlterField(
            model_name="smscode",
            name="document",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="sms_codes",
                to="contracts.document",
            ),
        ),
        migrations.RemoveField(
            model_name="smscode",
            name="contract",
        ),
        migrations.DeleteModel(
            name="Contract",
        ),
    ]
