import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def mask_phone_number(phone: str) -> str:
    """Mask phone number for secure logging (e.g., +91 98****3210)."""
    if len(phone) >= 10:
        return f"{phone[:6]}****{phone[-4:]}"
    return "****"


async def send_sms_otp(phone_number: str, otp_code: str) -> dict:
    """
    Dispatch a real 6-digit SMS OTP to the provided phone number.
    Supports Fast2SMS, Twilio, MSG91, and a secure development mode.
    
    Security:
    - Never prints or logs the raw OTP code in production.
    - Sanitizes input phone number to E.164.
    """
    # Clean phone number: remove non-digits
    digits_only = "".join(filter(str.isdigit, phone_number))
    
    # Standardize 10-digit Indian phone number
    if len(digits_only) == 10:
        indian_number = digits_only
        e164_number = f"+91{digits_only}"
    elif len(digits_only) == 12 and digits_only.startswith("91"):
        indian_number = digits_only[2:]
        e164_number = f"+{digits_only}"
    else:
        indian_number = digits_only[-10:]
        e164_number = f"+{digits_only}"

    provider = (settings.SMS_PROVIDER or "fast2sms").lower()
    masked_phone = mask_phone_number(e164_number)

    # 1. Fast2SMS (India Premier OTP Gateway)
    if provider == "fast2sms" and settings.FAST2SMS_API_KEY:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": settings.FAST2SMS_API_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "route": "otp",
                "variables_values": str(otp_code),
                "numbers": indian_number
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                data = res.json()
                if res.status_code == 200 and data.get("return") is True:
                    logger.info(f"Fast2SMS OTP successfully dispatched to {masked_phone}")
                    return {"success": True, "provider": "fast2sms", "message_id": data.get("request_id")}
                else:
                    err_msg = data.get("message", "Fast2SMS provider error")
                    logger.error(f"Fast2SMS dispatch failed for {masked_phone}: {err_msg}")
                    raise RuntimeError(f"SMS delivery failed: {err_msg}")
        except Exception as e:
            logger.error(f"Fast2SMS exception for {masked_phone}: {str(e)}")
            raise

    # 2. Twilio Gateway
    elif provider == "twilio" and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            data = {
                "From": settings.TWILIO_PHONE_NUMBER,
                "To": e164_number,
                "Body": f"Your ClipCutter verification code is: {otp_code}. Valid for 5 minutes. Do not share this OTP with anyone."
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=data, auth=auth)
                res_data = res.json()
                if res.status_code in [200, 201]:
                    logger.info(f"Twilio OTP successfully dispatched to {masked_phone}")
                    return {"success": True, "provider": "twilio", "message_id": res_data.get("sid")}
                else:
                    err_msg = res_data.get("message", "Twilio provider error")
                    logger.error(f"Twilio dispatch failed for {masked_phone}: {err_msg}")
                    raise RuntimeError(f"Twilio SMS delivery failed: {err_msg}")
        except Exception as e:
            logger.error(f"Twilio exception for {masked_phone}: {str(e)}")
            raise

    # 3. MSG91 Gateway
    elif provider == "msg91" and settings.MSG91_AUTH_KEY:
        try:
            url = "https://control.msg91.com/api/v5/otp"
            headers = {
                "authkey": settings.MSG91_AUTH_KEY,
                "Content-Type": "application/json"
            }
            params = {
                "template_id": settings.MSG91_TEMPLATE_ID,
                "mobile": f"91{indian_number}",
                "otp": str(otp_code)
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, params=params)
                res_data = res.json()
                if res.status_code == 200 and res_data.get("type") == "success":
                    logger.info(f"MSG91 OTP successfully dispatched to {masked_phone}")
                    return {"success": True, "provider": "msg91", "message_id": res_data.get("request_id")}
                else:
                    err_msg = res_data.get("message", "MSG91 provider error")
                    logger.error(f"MSG91 dispatch failed for {masked_phone}: {err_msg}")
                    raise RuntimeError(f"MSG91 SMS delivery failed: {err_msg}")
        except Exception as e:
            logger.error(f"MSG91 exception for {masked_phone}: {str(e)}")
            raise

    # 4. Local Development Sandbox / Gateway Not Configured Notice
    else:
        logger.warning(
            f"[SMS Gateway Notice] Real SMS API key not configured in .env (SMS_PROVIDER='{provider}'). "
            f"SMS dispatch requested for {masked_phone}."
        )
        return {
            "success": True, 
            "provider": "development_sandbox", 
            "message": "Gateway ready. Set FAST2SMS_API_KEY or TWILIO_AUTH_TOKEN in .env for live carrier delivery."
        }
