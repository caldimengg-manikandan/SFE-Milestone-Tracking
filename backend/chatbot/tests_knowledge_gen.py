import os
import tempfile

from django.core.management import call_command
from django.test import TestCase

from chatbot.knowledge_extractors import (
    content_hash,
    extract_model_specs,
    extract_route_matrix,
    extract_tool_registry,
    extract_business_logic_docstrings,
)
from chatbot.models import KnowledgeDocument, KnowledgeChunk
from chatbot.tool_catalog import AVAILABLE_TOOLS
from chatbot.tool_handlers import PAGE_ROUTES, FRIENDLY_PAGE_NAMES


class ModelSpecExtractionTestCase(TestCase):
    """Regression tests directly proving the class of bug we fixed can't silently recur:
    the old hand-written knowledge doc claimed Project.customer/project_manager and
    Milestone.project were ForeignKeys when they're actually plain CharFields, and that
    Customer/Detailer had inline contact fields when contacts are separate related models."""

    def test_project_customer_and_manager_are_charfields_not_fk(self):
        specs = extract_model_specs(['projects'])
        self.assertIn("`customer_name` (CharField", specs)
        self.assertIn("`project_manager_name` (CharField", specs)
        self.assertNotIn("`customer_name` (ForeignKey", specs)

    def test_milestone_project_is_charfield_not_fk(self):
        specs = extract_model_specs(['milestones'])
        self.assertIn("`project` (CharField", specs)
        self.assertNotIn("`project` (ForeignKey", specs)

    def test_customer_contacts_are_a_separate_related_model(self):
        specs = extract_model_specs(['projects'])
        self.assertIn("CustomerContact", specs)
        self.assertIn("(ReverseRelation -> CustomerContact)", specs)
        self.assertNotIn("`contact_email`", specs)

    def test_unknown_app_label_is_skipped_not_raised(self):
        specs = extract_model_specs(['not_a_real_app'])
        self.assertIn("Database Models", specs)  # header still present, just no models


class RouteAndToolRegistryExtractionTestCase(TestCase):
    def test_route_matrix_matches_live_navigate_to_page_routes(self):
        matrix = extract_route_matrix()
        for key, path in PAGE_ROUTES.items():
            self.assertIn(path, matrix, f"route {path} for {key} missing from generated matrix")
        for friendly in FRIENDLY_PAGE_NAMES.values():
            self.assertIn(friendly, matrix)

    def test_tool_registry_count_matches_live_catalog(self):
        registry = extract_tool_registry()
        self.assertIn(f"{len(AVAILABLE_TOOLS)} tools", registry)
        for tool in AVAILABLE_TOOLS:
            self.assertIn(f"`{tool['function']['name']}`", registry)


class BusinessLogicExtractionTestCase(TestCase):
    def test_rate_config_adapter_properties_are_documented(self):
        text = extract_business_logic_docstrings()
        self.assertIn("field_factor", text)
        self.assertIn("1.40", text)
        self.assertIn("flange_constant", text)


class ContentHashTestCase(TestCase):
    def test_stable_for_identical_input(self):
        self.assertEqual(content_hash("abc"), content_hash("abc"))

    def test_changes_when_input_changes(self):
        self.assertNotEqual(content_hash("abc"), content_hash("abcd"))


class IngestionDedupTestCase(TestCase):
    """Proves the fix for the duplicate-document ingestion bug: re-running seed/import
    commands with the same title updates the existing row instead of creating a new one."""

    def test_seed_app_knowledge_is_idempotent(self):
        call_command('seed_app_knowledge')
        first_count = KnowledgeDocument.objects.filter(title="SFE Application Knowledge (built-in)").count()
        call_command('seed_app_knowledge')
        second_count = KnowledgeDocument.objects.filter(title="SFE Application Knowledge (built-in)").count()
        self.assertEqual(first_count, 1)
        self.assertEqual(second_count, 1)

    def test_import_workflow_same_title_does_not_duplicate(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
            f.write("# Test workflow doc\nSome content.")
            tmp_path = f.name
        try:
            call_command('import_workflow', file=tmp_path, title='Test Dedup Doc')
            call_command('import_workflow', file=tmp_path, title='Test Dedup Doc')
            self.assertEqual(
                KnowledgeDocument.objects.filter(title='Test Dedup Doc').count(), 1
            )
        finally:
            os.unlink(tmp_path)


class GenerateAppKnowledgeCommandTestCase(TestCase):
    def test_generate_creates_one_document(self):
        call_command('generate_app_knowledge')
        docs = KnowledgeDocument.objects.filter(title="SFE Code-Derived Knowledge (auto-generated)")
        self.assertEqual(docs.count(), 1)
        self.assertEqual(docs.first().source, 'generated')
        self.assertTrue(docs.first().content_hash)

    def test_second_run_with_no_changes_skips_reembedding(self):
        call_command('generate_app_knowledge')
        doc = KnowledgeDocument.objects.get(title="SFE Code-Derived Knowledge (auto-generated)")
        chunk_ids_before = list(
            KnowledgeChunk.objects.filter(document=doc).order_by('id').values_list('id', flat=True)
        )

        call_command('generate_app_knowledge')
        doc.refresh_from_db()
        chunk_ids_after = list(
            KnowledgeChunk.objects.filter(document=doc).order_by('id').values_list('id', flat=True)
        )

        # If re-embedding had run, ingest_text_content deletes and recreates all chunks,
        # so the primary keys would differ even though the content is identical.
        self.assertEqual(chunk_ids_before, chunk_ids_after)
