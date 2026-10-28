import logging
import smtplib
from email.message import EmailMessage

from flask import current_app

import config

log = logging.getLogger(__name__)


def send_mail(to, subject, body):
    """Send a plain-text email. Without SMTP settings the email is only logged (handy in development)."""
    if current_app.config.get("TESTING"):
        current_app.extensions.setdefault("mail_outbox", []).append({"to": to, "subject": subject, "body": body})
        return True
    if not config.SMTP_HOST:
        log.warning("SMTP not configured - email to %s not sent.\nSubject: %s\n%s", to, subject, body)
        return False

    message = EmailMessage()
    message["From"] = config.MAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10) as smtp:
            if config.SMTP_USE_TLS:
                smtp.starttls()
            if config.SMTP_USER:
                smtp.login(config.SMTP_USER, config.SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except (smtplib.SMTPException, OSError):
        # A failed email must never fail the request that triggered it
        log.exception("Could not send email to %s", to)
        return False


def frontend_link(path):
    return f"{config.FRONTEND_URL}{path}"
