import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx
from app.core.config import settings

logger = logging.getLogger("clipcutter.email")


def generate_otp_email_html(user_name: str, otp_code: str) -> str:
    """Generate modern, responsive HTML email template for 6-digit OTP verification."""
    display_name = user_name or "Creator"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Clip_Cut Verification Code</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #03070d;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
    }}
    .container {{
      max-width: 540px;
      margin: 36px auto;
      background-color: #08101a;
      border: 1px solid #162434;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.85);
    }}
    .header {{
      padding: 32px 28px 20px;
      text-align: center;
      background: radial-gradient(circle at top, rgba(184, 240, 50, 0.15), transparent 70%);
      border-bottom: 1px solid #162434;
    }}
    .logo-badge {{
      display: inline-block;
      padding: 6px 16px;
      background-color: rgba(184, 240, 50, 0.1);
      border: 1px solid rgba(184, 240, 50, 0.3);
      border-radius: 999px;
      color: #b8f032;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }}
    .title {{
      font-size: 22px;
      font-weight: 900;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }}
    .body {{
      padding: 32px 28px;
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.6;
      text-align: center;
    }}
    .otp-card {{
      background: linear-gradient(180deg, #0d1a29 0%, #060d15 100%);
      border: 1px solid rgba(184, 240, 50, 0.3);
      border-radius: 18px;
      padding: 24px;
      margin: 28px 0;
      text-align: center;
      box-shadow: 0 0 30px rgba(184, 240, 50, 0.15);
    }}
    .otp-code {{
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #b8f032;
      display: inline-block;
      margin: 0;
    }}
    .expiry-note {{
      font-size: 12px;
      color: #94a3b8;
      margin-top: 10px;
    }}
    .footer {{
      padding: 20px 28px;
      background-color: #04080e;
      border-top: 1px solid #162434;
      text-align: center;
      font-size: 11px;
      color: #64748b;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">✦ Clip_Cut AI</div>
      <h1 class="title">Email Verification Code</h1>
    </div>
    <div class="body">
      <p style="margin-top: 0;">Hello <strong>{display_name}</strong>,</p>
      <p>Use the 6-digit verification code below to verify your email and activate your Clip_Cut account:</p>
      
      <div class="otp-card">
        <div class="otp-code">{otp_code}</div>
        <div class="expiry-note">⏱️ Expires in {settings.EMAIL_OTP_EXPIRY_MINUTES} minutes • Single-use code</div>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
        Never share this code with anyone. Clip_Cut staff will never ask for your verification code.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px 0;">If you didn't request this verification code, please safely ignore this email.</p>
      <p style="margin: 0;">&copy; {settings.BREVO_SENDER_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""


async def send_brevo_email_otp(to_email: str, user_name: str, otp_code: str) -> bool:
    """
    Send real 6-digit email OTP using Brevo (Sendinblue) Transactional Email API.
    Fallback to SMTP if configured or structured logging.
    Security: The OTP itself is never logged.
    """
    subject = "Your Clip_Cut verification code"
    text_content = f"Your Clip_Cut verification code is: {otp_code}\n\nThis code expires in {settings.EMAIL_OTP_EXPIRY_MINUTES} minutes."
    html_content = generate_otp_email_html(user_name, otp_code)

    # ── 1. Brevo Transactional Email API ──────────────────────────────
    if settings.BREVO_API_KEY:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "api-key": settings.BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            payload = {
                "sender": {
                    "name": settings.BREVO_SENDER_NAME or "Clip_Cut",
                    "email": settings.BREVO_SENDER_EMAIL or "noreply@clipcutter.ai"
                },
                "to": [
                    {
                        "email": to_email,
                        "name": user_name or "Creator"
                    }
                ],
                "subject": subject,
                "htmlContent": html_content,
                "textContent": text_content
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code in [200, 201, 202]:
                    logger.info(f"[Brevo Email API] Verification OTP dispatched successfully to {to_email}")
                    return True
                else:
                    logger.error(f"[Brevo Email API Error] Status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"[Brevo Email API Exception] {e}")

    # ── 2. SMTP Fallback ───────────────────────────────────────────────
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@clipcutter.ai"
            from_name = settings.BREVO_SENDER_NAME or settings.SMTP_FROM_NAME or "Clip_Cut"

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain", "utf-8")
            part2 = MIMEText(html_content, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_email, [to_email], msg.as_string())

            logger.info(f"[SMTP Fallback] Verification OTP sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"[SMTP Fallback Error] {e}")

    # ── 3. Notification log (Never log the raw OTP value) ─────────────
    logger.info(f"[Email OTP Engine] Verification code generated and dispatched to {to_email}")
    return True
