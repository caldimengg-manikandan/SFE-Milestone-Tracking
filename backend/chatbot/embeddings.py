"""
Local, offline text embeddings shared by knowledge-chunk retrieval and tool selection.

Uses fastembed (ONNX Runtime, pure CPU - no torch/sentence-transformers) so the chatbot
stays free of a heavy ML dependency. The model downloads once from HF Hub on first use and
is cached on disk (EMBEDDING_MODEL_CACHE_DIR) - no network needed on subsequent runs.
"""
import threading

import numpy as np
from django.conf import settings

_model = None
_model_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                try:
                    from fastembed import TextEmbedding
                    _model = TextEmbedding(
                        model_name=getattr(settings, 'EMBEDDING_MODEL_NAME', 'BAAI/bge-small-en-v1.5'),
                        cache_dir=getattr(settings, 'EMBEDDING_MODEL_CACHE_DIR', None),
                    )
                except Exception:
                    _model = False
    return None if _model is False else _model


def embed_texts(texts: list) -> list:
    """Embeds a batch of documents/passages (e.g. knowledge chunks, tool descriptions).
    Returns one float vector per input text, in the same order."""
    if not texts:
        return []
    model = _get_model()
    if model is None:
        return [None] * len(texts)
    try:
        return [vec.tolist() for vec in model.passage_embed(texts)]
    except Exception:
        return [None] * len(texts)


def embed_query(text: str) -> list:
    """Embeds a single search query. BGE models use an asymmetric query/passage encoding
    (query_embed applies a retrieval-tuned instruction prefix internally) - always use this
    for the user's query text, and embed_texts for the documents being searched."""
    if not text or not text.strip():
        return []
    model = _get_model()
    if model is None:
        return []
    try:
        return next(model.query_embed([text])).tolist()
    except Exception:
        return []


def cosine_similarity_batch(query_vec, matrix) -> np.ndarray:
    """query_vec: 1D vector. matrix: 2D array (N, D) of document vectors.
    Returns a 1D array of N cosine similarities. Degenerate (all-zero/missing) vectors score
    0 against the query rather than raising or producing NaN, so callers can safely rank
    result sets that include legacy rows with no embedding yet."""
    m = np.asarray(matrix, dtype=np.float32)
    if m.size == 0:
        return np.zeros(0)
    q = np.asarray(query_vec, dtype=np.float32)
    q_norm = np.linalg.norm(q)
    if q.size == 0 or q_norm == 0:
        return np.zeros(m.shape[0])
    q_unit = q / q_norm
    m_norms = np.linalg.norm(m, axis=1)
    safe_norms = np.where(m_norms == 0, 1.0, m_norms)
    m_unit = m / safe_norms[:, None]
    scores = m_unit.dot(q_unit)
    scores[m_norms == 0] = 0.0
    return scores
