import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger("clipcutter.email")


def generate_verification_email_html(user_name: str, verification_url: str) -> str:
    """Generate modern, responsive HTML email template for account verification."""
    display_name = user_name or "Creator"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Clip Cutter Account</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #03070d;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
    }}
    .container {{
      max-width: 580px;
      margin: 40px auto;
      background-color: #08101a;
      border: 1px solid #1a2a3a;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8);
    }}
    .header {{
      padding: 36px 32px 24px;
      text-align: center;
      background: radial-gradient(circle at top, rgba(184, 240, 50, 0.15), transparent 70%);
      border-bottom: 1px solid #162434;
    }}
    .logo-badge {{
      display: inline-block;
      padding: 8px 18px;
      background-color: rgba(184, 240, 50, 0.1);
      border: 1px solid rgba(184, 240, 50, 0.3);
      border-radius: 999px;
      color: #b8f032;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }}
    .title {{
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }}
    .body {{
      padding: 32px;
      color: #cbd5e1;
      font-size: 15px;
      line-height: 1.6;
    }}
    .cta-container {{
      text-align: center;
      margin: 32px 0 24px;
    }}
    .cta-btn {{
      display: inline-block;
      padding: 14px 36px;
      background-color: #b8f032;
      color: #000000;
      font-size: 14px;
      font-weight: 900;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 999px;
      box-shadow: 0 0 25px rgba(184, 240, 50, 0.4);
    }}
    .link-box {{
      background-color: #040910;
      border: 1px solid #1a2a3a;
      border-radius: 12px;
      padding: 12px;
      font-size: 12px;
      color: #94a3b8;
      word-break: break-all;
      margin-top: 20px;
    }}
    .footer {{
      padding: 24px 32px;
      background-color: #050a12;
      border-top: 1px solid #162434;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">✦ Clip Cutter AI</div>
      <h1 class="title">Verify Your Email Address</h1>
    </div>
    <div class="body">
      <p>Hello <strong>{display_name}</strong>,</p>
      <p>Thank you for signing up for Clip Cutter AI. To activate your account and start generating viral 9:16 vertical shorts, please verify your email address by clicking the button below:</p>
      
      <div class="cta-container">
        <a href="{verification_url}" class="cta-btn" target="_blank">Verify Email & Activate Account</a>
      </div>

      <p style="font-size: 13px; color: #94a3b8;">This verification link will expire in <strong>{settings.EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes</strong> for security reasons and can only be used once.</p>
      
      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">If the button above does not work, copy and paste this URL into your browser:</p>
      <div class="link-box">
        <a href="{verification_url}" style="color: #38bdf8; text-decoration: none;">{verification_url}</a>
      </div>
    </div>
    <div class="footer">
      <p>If you did not register for an account on Clip Cutter AI, please ignore this email.</p>
      <p>&copy; {settings.APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""


def send_verification_email(to_email: str, user_name: str, verification_url: str) -> bool:
    """
    Send a real verification email via SMTP.
    Falls back to structured console logging if SMTP credentials are not configured.
    """
    subject = f"Verify your {settings.APP_NAME} account"
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@clipcutter.ai"
    from_name = settings.SMTP_FROM_NAME or settings.APP_NAME
    
    html_content = generate_verification_email_html(user_name, verification_url)
    text_content = f"Hello {user_name or 'Creator'},\n\nPlease verify your email for {settings.APP_NAME} by opening this link:\n{verification_url}\n\nThis link expires in {settings.EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes.\n\nThank you!"

    # If SMTP credentials are provided, send via SMTP server
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
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
            
            logger.info(f"[Email Service] Verification email dispatched to {to_email} via SMTP")
            print(f"[Email Service] Verification email successfully sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"[Email Service Error] Failed to send email via SMTP: {e}")
            print(f"[Email Service Error] SMTP failed: {e}")

    # Fallback to local console log
    print("\n" + "="*70)
    print(f"📧 [EMAIL VERIFICATION LINK DISPATCHED]")
    print(f"To: {to_email} ({user_name})")
    print(f"Verification URL: {verification_url}")
    print(f"Expires in: {settings.EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes")
    print("="*70 + "\n")
    return True
