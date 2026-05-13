import logging
import sys
from .config import settings


def setup_logging() -> logging.Logger:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Kurangi noise dari library pihak ketiga
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    return logging.getLogger("labcermat.ai")


logger = setup_logging()
