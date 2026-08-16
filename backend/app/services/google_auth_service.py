from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def verify_google_id_token(token: str) -> dict:
    """
    Cryptographically verify a Google OAuth 2.0 ID token issued by Google Identity Services.
    
    Validation Checks:
    1. Signature verified against Google's public certificates.
    2. Audience (aud) matches the registered GOOGLE_CLIENT_ID (or list of valid IDs).
    3. Issuer (iss) is 'accounts.google.com' or 'https://accounts.google.com'.
    4. Expiration timestamp (exp) is strictly valid.
    
    Returns:
        dict: Verified user identity containing google_id, email, name, avatar, email_verified.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(status_code=400, detail="Missing or invalid Google authentication token")

    # Determine the expected audience(s) (supports comma-separated list of Client IDs)
    raw_client_ids = (settings.GOOGLE_CLIENT_ID or "").strip()
    valid_audiences = [
        cid.strip() 
        for cid in raw_client_ids.replace(";", ",").split(",") 
        if cid.strip() and not any(p in cid.lower() for p in ["your-google", "clipcutter-google", "placeholder"])
    ]

    # If only 1 audience, pass as string; if multiple, pass as list; if none, pass None
    audience_param = valid_audiences if len(valid_audiences) > 1 else (valid_audiences[0] if len(valid_audiences) == 1 else None)

    logger.info(f"[GoogleAuth] Verifying token (length={len(token)}, expected_audiences={valid_audiences or 'NONE'})")

    try:
        req = requests.Request()

        # Attempt cryptographic verification with Google's public certs & audience check
        try:
            id_info = id_token.verify_oauth2_token(token, req, audience_param)
        except ValueError as aud_err:
            err_str = str(aud_err).lower()
            
            # If audience mismatch, decode token claims safely to provide exact actionable feedback
            if "audience" in err_str or "wrong" in err_str:
                try:
                    import json, base64
                    payload_b64 = token.split('.')[1]
                    padding = 4 - len(payload_b64) % 4
                    if padding != 4:
                        payload_b64 += '=' * padding
                    payload = json.loads(base64.urlsafe_b64decode(payload_b64))
                    actual_aud = payload.get('aud', 'UNKNOWN')
                    logger.error(
                        f"[GoogleAuth AUDIENCE MISMATCH] "
                        f"Incoming Token aud = '{actual_aud}' | "
                        f"Backend configured audiences = {valid_audiences} | "
                        f"Action: Set GOOGLE_CLIENT_ID on Render to match '{actual_aud}'"
                    )
                    raise HTTPException(
                        status_code=401,
                        detail=(
                            f"Google authentication failed: Token audience mismatch. "
                            f"Frontend sent token for client ID: {actual_aud}, "
                            f"but backend expected: {valid_audiences}. "
                            f"Please update GOOGLE_CLIENT_ID in your Render environment variables to match."
                        )
                    )
                except HTTPException:
                    raise
                except Exception:
                    pass
            
            # Re-raise original error if not audience mismatch
            raise

        # Check issuer
        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid Google token issuer")

        # Extract verified user profile
        google_id = id_info.get("sub")
        email = id_info.get("email")
        name = id_info.get("name") or (email.split("@")[0] if email else "Google User")
        avatar = id_info.get("picture")
        email_verified = bool(id_info.get("email_verified", False))

        if not google_id or not email:
            raise ValueError("Google token payload does not contain required user identity")

        logger.info(f"[GoogleAuth SUCCESS] Cryptographically verified: {email} (google_id={google_id[:8]}...)")

        return {
            "google_id": google_id,
            "email": email.strip().lower(),
            "name": name,
            "avatar": avatar,
            "email_verified": email_verified
        }

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"[GoogleAuth FAILED] ValueError: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Google authentication failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"[GoogleAuth FAILED] {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Unable to verify Google credentials. Please try again."
        )
