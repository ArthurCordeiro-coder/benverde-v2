from html import escape


def build_password_reset_email(
    username: str, code: str, expires_in_minutes: int
) -> dict[str, str]:
    safe_username = escape(username)
    safe_code = escape(code)
    minutos = max(expires_in_minutes, 1)
    subject = "Benverde | Codigo para redefinir sua senha"
    text = (
        f"Ola, {username}.\n\n"
        f"Seu codigo de recuperacao de senha e: {code}\n"
        f"Esse codigo expira em {minutos} minutos.\n\n"
        "Se voce nao solicitou essa recuperacao, ignore este e-mail.\n"
        "Equipe Benverde"
    )
    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
      <body style="margin:0;padding:0;background:#f4f7f2;font-family:Arial,sans-serif;color:#173322;">
        <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
          <div style="background:#ffffff;border:1px solid #dbe7db;border-radius:18px;padding:32px;">
            <p style="margin:0 0 12px;font-size:14px;color:#4a6352;">Benverde</p>
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#173322;">
              Recuperacao de senha
            </h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
              Ola, <strong>{safe_username}</strong>. Use o codigo abaixo para redefinir sua senha.
            </p>
            <div
              style="
                margin:0 0 20px;
                padding:18px 20px;
                border-radius:14px;
                background:#103a22;
                color:#ffffff;
                font-size:32px;
                font-weight:700;
                letter-spacing:8px;
                text-align:center;
              "
            >
              {safe_code}
            </div>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">
              Este codigo expira em <strong>{minutos} minutos</strong>.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#5f7767;">
              Se voce nao solicitou essa recuperacao, ignore este e-mail com seguranca.
            </p>
          </div>
        </div>
      </body>
    </html>
    """.strip()
    return {"subject": subject, "text": text, "html": html}
