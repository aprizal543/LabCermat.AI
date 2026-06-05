"""
Azure AI Search Service — Keyword / BM25 Only
LabCermat Sprint 8

No vector/embedding search — uses BM25 full-text search only.
Index schema is flat: id, document_id, title, section, content, source_page, chunk_index.

Public API:
    ensure_index()                          create index if not exists
    upload_chunks(chunks)                   upsert DocumentChunk list
    search(query, top_k, document_id)       BM25 keyword search
    delete_document(document_id)            remove all chunks for a doc
"""

from __future__ import annotations

from typing import Optional

from app.core.config import settings
from app.core.logging import logger
from app.services.document_service import DocumentChunk

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_client():
    """Return an authenticated SearchClient for the configured index."""
    from azure.search.documents import SearchClient
    from azure.core.credentials import AzureKeyCredential

    return SearchClient(
        endpoint=settings.azure_ai_search_endpoint,
        index_name=settings.azure_ai_search_index_name,
        credential=AzureKeyCredential(settings.azure_ai_search_key),
    )


def _get_index_client():
    """Return an authenticated SearchIndexClient."""
    from azure.search.documents.indexes import SearchIndexClient
    from azure.core.credentials import AzureKeyCredential

    return SearchIndexClient(
        endpoint=settings.azure_ai_search_endpoint,
        credential=AzureKeyCredential(settings.azure_ai_search_key),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ensure_index() -> bool:
    """Create the search index if it does not already exist.

    Returns True if index is ready, False if search is not configured
    or creation fails.
    """
    if not settings.search_configured:
        logger.warning("search_service: Azure AI Search not configured — skipping ensure_index")
        return False

    try:
        from azure.search.documents.indexes import SearchIndexClient
        from azure.search.documents.indexes.models import (
            SearchIndex,
            SearchField,
            SearchFieldDataType,
            SimpleField,
            SearchableField,
        )
        from azure.core.credentials import AzureKeyCredential

        index_client = SearchIndexClient(
            endpoint=settings.azure_ai_search_endpoint,
            credential=AzureKeyCredential(settings.azure_ai_search_key),
        )
        index_name = settings.azure_ai_search_index_name

        # Check if index already exists
        try:
            index_client.get_index(index_name)
            logger.info("search_service: index '%s' already exists", index_name)
            return True
        except Exception:
            pass  # index not found — create it

        fields = [
            SimpleField(name="id",           type=SearchFieldDataType.String, key=True,  filterable=True),
            SimpleField(name="document_id",  type=SearchFieldDataType.String, filterable=True),
            SearchableField(name="title",    type=SearchFieldDataType.String),
            SimpleField(name="section",      type=SearchFieldDataType.String, filterable=True),
            SearchableField(
                name="content",
                type=SearchFieldDataType.String,
                analyzer_name="id.lucene",
            ),
            SimpleField(name="source_page",  type=SearchFieldDataType.Int32,  filterable=True,  sortable=True),
            SimpleField(name="chunk_index",  type=SearchFieldDataType.Int32,  sortable=True),
        ]

        index = SearchIndex(name=index_name, fields=fields)
        index_client.create_index(index)
        logger.info("search_service: index '%s' created", index_name)
        return True

    except Exception as exc:
        logger.warning("search_service: ensure_index failed — %s", exc)
        return False


def upload_chunks(chunks: list[DocumentChunk]) -> dict:
    """Upsert a list of DocumentChunk objects to the search index.

    Returns a summary dict: { "uploaded": int, "failed": int }
    """
    if not settings.search_configured:
        return {"uploaded": 0, "failed": len(chunks), "error": "not configured"}

    if not chunks:
        return {"uploaded": 0, "failed": 0}

    # Ensure index exists before uploading
    ensure_index()

    docs = [
        {
            "id":           chunk.chunk_id,
            "document_id":  chunk.document_id,
            "title":        chunk.title,
            "section":      chunk.section,
            "content":      chunk.content,
            "source_page":  chunk.source_page,
            "chunk_index":  chunk.chunk_index,
        }
        for chunk in chunks
    ]

    try:
        client = _get_client()
        results = client.upload_documents(documents=docs)
        succeeded = sum(1 for r in results if r.succeeded)
        failed = len(docs) - succeeded

        logger.info(
            "search_service: uploaded %d/%d chunks for doc '%s'",
            succeeded, len(docs), chunks[0].document_id if chunks else "?",
        )
        return {"uploaded": succeeded, "failed": failed}

    except Exception as exc:
        logger.warning("search_service: upload_chunks failed — %s", exc)
        return {"uploaded": 0, "failed": len(chunks), "error": str(exc)}


def search(
    query: str,
    top_k: int = 5,
    document_id: Optional[str] = None,
) -> list[dict]:
    """BM25 keyword search over indexed SOP chunks.

    Args:
        query:       Free-text search string (Indonesian supported via id.lucene)
        top_k:       Maximum number of results to return
        document_id: Optional filter — restrict to one document

    Returns a list of dicts with keys:
        chunk_id, document_id, title, section, content, source_page, chunk_index, score
    """
    if not settings.search_configured:
        logger.warning("search_service: Azure AI Search not configured — returning empty")
        return []

    try:
        client = _get_client()

        filter_expr = f"document_id eq '{document_id}'" if document_id else None

        results = client.search(
            search_text=query,
            top=top_k,
            filter=filter_expr,
            select=["id", "document_id", "title", "section", "content", "source_page", "chunk_index"],
            include_total_count=False,
        )

        hits: list[dict] = []
        for r in results:
            hits.append({
                "chunk_id":    r["id"],
                "document_id": r["document_id"],
                "title":       r["title"],
                "section":     r["section"],
                "content":     r["content"],
                "source_page": r["source_page"],
                "chunk_index": r["chunk_index"],
                "score":       r.get("@search.score", 0.0),
            })

        logger.info(
            "search_service: query='%s' returned %d hits",
            query[:60], len(hits),
        )
        return hits

    except Exception as exc:
        logger.warning("search_service: search failed — %s", exc)
        return []


def delete_document(document_id: str) -> dict:
    """Remove all indexed chunks belonging to a document_id.

    Returns { "deleted": int }
    """
    if not settings.search_configured:
        return {"deleted": 0, "error": "not configured"}

    try:
        client = _get_client()

        # First retrieve all chunk IDs for this document
        results = client.search(
            search_text="*",
            filter=f"document_id eq '{document_id}'",
            select=["id"],
            top=1000,
        )
        ids_to_delete = [{"id": r["id"]} for r in results]

        if not ids_to_delete:
            return {"deleted": 0}

        client.delete_documents(documents=ids_to_delete)
        logger.info("search_service: deleted %d chunks for document '%s'", len(ids_to_delete), document_id)
        return {"deleted": len(ids_to_delete)}

    except Exception as exc:
        logger.warning("search_service: delete_document failed — %s", exc)
        return {"deleted": 0, "error": str(exc)}
