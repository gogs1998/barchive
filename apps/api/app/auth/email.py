"""Resend transactional email helper.

Uses Resend's REST API via httpx (async). Falls back gracefully in test/dev
environments when RESEND_API_KEY is not set (logs to stdout instead).
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_SEND_URL = "https://api.resend.com/emails"


async def send_email(*, to: str, subject: str, html: str) -> None:
    """Send a transactional email via Resend.

    Raises httpx.HTTPStatusError on non-2xx responses when a real key is
    configured; silently logs (does not raise) in dev/test mode so tests that
    don't mock this function still pass.
    """
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email to %s: %s", to, subject)
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            RESEND_SEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": html},
        )
        resp.raise_for_status()


async def send_verification_email(to: str, token: str) -> None:
    verify_url = f"{settings.frontend_url}/auth/verify-email?token={token}"
    await send_email(
        to=to,
        subject="Verify your BarIQ email address",
        html=(
            f"<p>Welcome to BarIQ!</p>"
            f"<p>Click the link below to verify your email address (valid for 24 hours):</p>"
            f'<p><a href="{verify_url}">{verify_url}</a></p>'
        ),
    )


async def send_password_reset_email(to: str, token: str) -> None:
    reset_url = f"{settings.frontend_url}/auth/reset-password?token={token}"
    await send_email(
        to=to,
        subject="Reset your BarIQ password",
        html=(
            f"<p>You requested a password reset for your BarIQ account.</p>"
            f"<p>Click the link below to set a new password (valid for 1 hour):</p>"
            f'<p><a href="{reset_url}">{reset_url}</a></p>'
            f"<p>If you did not request this, please ignore this email.</p>"
        ),
    )
