import logging
import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import asyncio
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


async def _dispatch_brevo_http(to_email: str, user_name: str, otp_code: str, brevo_key: str) -> tuple[bool, str]:
    """Execute Brevo HTTP POST with explicit timeouts and error parsing."""
    t_start = time.perf_counter()
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": brevo_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    sender_email = (settings.BREVO_SENDER_EMAIL or "noreply@clipcutter.ai").strip()
    sender_name = (settings.BREVO_SENDER_NAME or "Clip_Cut").strip()
    subject = "Your Clip_Cut verification code"
    text_content = f"Your Clip_Cut verification code is: {otp_code}\n\nThis code expires in {settings.EMAIL_OTP_EXPIRY_MINUTES} minutes."
    html_content = generate_otp_email_html(user_name, otp_code)

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
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

    logger.info(f"[Brevo HTTP -> START] Request to Brevo API for {to_email} (sender: {sender_email})")
    
    timeout_config = httpx.Timeout(connect=4.0, read=5.0, write=4.0, pool=4.0)
    async with httpx.AsyncClient(timeout=timeout_config) as client:
        response = await client.post(url, headers=headers, json=payload)
        elapsed_ms = (time.perf_counter() - t_start) * 1000
        
        logger.info(f"[Brevo HTTP <- FINISH] Status {response.status_code} in {elapsed_ms:.1f}ms for {to_email}")

        if response.status_code in [200, 201, 202]:
            logger.info(f"[Brevo HTTP SUCCESS] Message accepted by Brevo for {to_email}")
            return True, f"6-digit verification code sent to {to_email} via Brevo."
        elif response.status_code == 401:
            logger.error(f"[Brevo HTTP 401 Unauthorized] Invalid API Key: {response.text}")
            return False, f"Brevo API error: Invalid API key (HTTP 401). Response: {response.text}"
        elif response.status_code == 403:
            logger.error(f"[Brevo HTTP 403 Forbidden] Sender not verified: {response.text}")
            return False, f"Brevo API error: Sender '{sender_email}' not verified (HTTP 403). Response: {response.text}"
        elif response.status_code == 400:
            logger.error(f"[Brevo HTTP 400 Bad Request] Invalid payload: {response.text}")
            return False, f"Brevo API error: Bad request for {to_email} (HTTP 400). Response: {response.text}"
        elif response.status_code == 429:
            logger.error(f"[Brevo HTTP 429 Rate Limit]: {response.text}")
            return False, "Brevo email rate limit exceeded. Please wait and try again."
        else:
            logger.error(f"[Brevo HTTP Error {response.status_code}]: {response.text}")
            return False, f"Brevo delivery failed (Status {response.status_code}): {response.text}"


async def send_brevo_email_otp(to_email: str, user_name: str, otp_code: str) -> tuple[bool, str]:
    """
    Send real 6-digit email OTP using Brevo (Sendinblue) Transactional Email API.
    Enforces a hard 8.0-second total timeout so requests NEVER hang indefinitely.
    Returns (True, success_message) or (False, error_reason).
    Security: The raw OTP value is NEVER logged.
    """
    t_start = time.perf_counter()
    brevo_key = (settings.BREVO_API_KEY or "").strip()

    # ── 1. Brevo Transactional Email API (Hard 8s Timeout) ────────────
    if brevo_key:
        try:
            return await asyncio.wait_for(
                _dispatch_brevo_http(to_email, user_name, otp_code, brevo_key),
                timeout=8.0
            )
        except asyncio.TimeoutError:
            elapsed_s = time.perf_counter() - t_start
            logger.error(f"[Brevo Timeout] Total request timed out after {elapsed_s:.1f}s for {to_email}")
            return False, "Brevo email delivery timed out after 8 seconds. Please try again."
        except httpx.TimeoutException:
            logger.error(f"[Brevo HTTP Timeout] Connection/read timed out for {to_email}")
            return False, "Brevo email service connection timed out. Please try again."
        except Exception as e:
            logger.error(f"[Brevo Exception] {type(e).__name__}: {e}")
            return False, f"Unable to dispatch email via Brevo ({type(e).__name__}: {e})"

    # ── 2. Explicit SMTP Fallback (Only if explicitly configured) ───────
    if settings.SMTP_USER and settings.SMTP_USER.strip() and settings.SMTP_PASSWORD and settings.SMTP_PASSWORD.strip():
        try:
            from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@clipcutter.ai"
            from_name = settings.BREVO_SENDER_NAME or settings.SMTP_FROM_NAME or "Clip_Cut"
            subject = "Your Clip_Cut verification code"
            text_content = f"Your Clip_Cut verification code is: {otp_code}\n\nThis code expires in {settings.EMAIL_OTP_EXPIRY_MINUTES} minutes."
            html_content = generate_otp_email_html(user_name, otp_code)

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to_email
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            def _send_smtp_sync():
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=6) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(from_email, [to_email], msg.as_string())

            await asyncio.wait_for(asyncio.to_thread(_send_smtp_sync), timeout=7.0)
            logger.info(f"[SMTP Fallback SUCCESS] Verification OTP sent to {to_email}")
            return True, f"Verification code sent to {to_email} via SMTP."
        except Exception as e:
            logger.error(f"[SMTP Fallback Error] {e}")
            return False, f"SMTP delivery failed: {e}"

    # ── 3. Dev / Staging Simulation Fallback ───────────────────────────
    if settings.DEBUG:
        logger.info(f"[Dev Simulation Mode] OTP generated for {to_email} (BREVO_API_KEY is not configured in .env)")
        return True, f"6-digit verification code generated for {to_email}."

    logger.error(f"[Brevo Configuration Missing] BREVO_API_KEY is not configured in backend environment variables.")
    return False, "BREVO_API_KEY is not configured in server environment variables. Please add BREVO_API_KEY to .env."
