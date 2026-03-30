import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from email_templates import build_password_reset_email

DEFAULT_SMTP_HOST = "smtp-relay.brevo.com"
DEFAULT_SMTP_PORT = 587


def _get_smtp_port() -> int:
    raw_port = os.environ.get("SMTP_PORT", str(DEFAULT_SMTP_PORT)).strip()
    try:
        return int(raw_port)
    except ValueError:
        return DEFAULT_SMTP_PORT


def _get_smtp_config() -> dict[str, str | int]:
    host = os.environ.get("SMTP_HOST", DEFAULT_SMTP_HOST).strip() or DEFAULT_SMTP_HOST
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    from_email = os.environ.get("SMTP_FROM_EMAIL", "").strip()
    from_name = os.environ.get("SMTP_FROM_NAME", "Benverde").strip() or "Benverde"

    if not user or not password or not from_email:
        raise RuntimeError(
            "SMTP_USER, SMTP_PASS e SMTP_FROM_EMAIL precisam estar definidos."
        )

    return {
        "host": host,
        "port": _get_smtp_port(),
        "user": user,
        "password": password,
        "from_email": from_email,
        "from_name": from_name,
    }


def send_password_reset_code_email(
    to_email: str,
    username: str,
    code: str,
    expires_in_minutes: int,
) -> None:
    config = _get_smtp_config()
    content = build_password_reset_email(
        username=username,
        code=code,
        expires_in_minutes=expires_in_minutes,
    )

    message = EmailMessage()
    message["Subject"] = content["subject"]
    message["From"] = formataddr((str(config["from_name"]), str(config["from_email"])))
    message["To"] = to_email
    message.set_content(content["text"])
    message.add_alternative(content["html"], subtype="html")

    with smtplib.SMTP(str(config["host"]), int(config["port"]), timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(str(config["user"]), str(config["password"]))
        smtp.send_message(message)
