"""Process-wide PostHog client for the Scrapy crawler."""

import atexit
import os
from pathlib import Path

from dotenv import load_dotenv
from posthog import Posthog


load_dotenv(Path(__file__).resolve().parents[1] / '.env')


def _create_posthog_client() -> Posthog | None:
    """Create the shared client when PostHog has been configured."""
    project_token = os.getenv('POSTHOG_PROJECT_TOKEN')
    if not project_token:
        if os.getenv('POSTHOG_DEBUG', '').lower() == 'true':
            raise RuntimeError(
                'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or '
                'un-configured, this causes events to be silently missed. This error '
                'stops appearing once POSTHOG_PROJECT_TOKEN is configured'
            )
        return None

    options = {'enable_exception_autocapture': True}
    posthog_host = os.getenv('POSTHOG_HOST')
    if posthog_host:
        options['host'] = posthog_host

    client = Posthog(project_token, **options)
    atexit.register(client.shutdown)
    return client


posthog_client = _create_posthog_client()
