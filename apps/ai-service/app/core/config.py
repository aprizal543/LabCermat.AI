from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────
    app_env: str = "development"
    app_version: str = "1.0.0"
    app_port: int = 8000

    backend_url: str = "http://localhost:3001"

    # ── AI Mode — Sprint 7 (QC Anomaly ML Artifact) ───────────
    # "rule_based" | "azure_ml_artifact"
    ai_mode: str = "rule_based"
    azure_ml_model_dir: str = ""

    # ── Azure OpenAI / AI Foundry — Sprint 8 ─────────────────
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_deployment_name: str = "gpt-4o-mini"
    azure_openai_embedding_deployment_name: str = "text-embedding-3-small"

    # ── Azure AI Document Intelligence — Sprint 8 ─────────────
    azure_document_intelligence_endpoint: str = ""
    azure_document_intelligence_key: str = ""

    # ── Azure AI Search — Sprint 8 ────────────────────────────
    azure_ai_search_endpoint: str = ""
    azure_ai_search_key: str = ""
    azure_ai_search_index_name: str = "labcermat-sop-index"

    # ── Generative AI Provider — Sprint 8 Langkah 7 ──────────
    # "template_fallback" | "groq"
    ai_generative_provider: str = "template_fallback"
    ai_generative_timeout_seconds: int = 20

    # ── Groq ──────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    # ── Logging ───────────────────────────────────────────────
    log_level: str = "info"

    # ── Derived helpers (read-only properties) ────────────────

    @property
    def openai_configured(self) -> bool:
        """True jika semua field Azure OpenAI terisi."""
        return bool(self.azure_openai_endpoint and self.azure_openai_api_key)

    @property
    def document_intelligence_configured(self) -> bool:
        """True jika semua field Document Intelligence terisi."""
        return bool(
            self.azure_document_intelligence_endpoint
            and self.azure_document_intelligence_key
        )

    @property
    def search_configured(self) -> bool:
        """True jika semua field Azure AI Search terisi."""
        return bool(self.azure_ai_search_endpoint and self.azure_ai_search_key)

    @property
    def groq_configured(self) -> bool:
        """True jika Groq provider dipilih dan API key tersedia."""
        return (
            self.ai_generative_provider.strip().lower() == "groq"
            and bool(self.groq_api_key)
        )


settings = Settings()
