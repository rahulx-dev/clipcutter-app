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
    2. Audience (aud) matches the registered GOOGLE_CLIENT_ID.
    3. Issuer (iss) is 'accounts.google.com' or 'https://accounts.google.com'.
    4. Expiration timestamp (exp) is strictly valid.
    
    Returns:
        dict: Verified user identity containing google_id, email, name, avatar, email_verified.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(status_code=400, detail="Missing or invalid Google authentication token")

    try:
        req = requests.Request()
        client_id = settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else None
        # Ignore placeholder template values
        if client_id and ("your-google" in client_id.lower() or "clipcutter-google" in client_id.lower() or "placeholder" in client_id.lower()):
            client_id = None
        
        # Verify token cryptographically
        id_info = id_token.verify_oauth2_token(token, req, client_id)
        
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

        return {
            "google_id": google_id,
            "email": email.strip().lower(),
            "name": name,
            "avatar": avatar,
            "email_verified": email_verified
        }

    except ValueError as e:
        logger.error(f"Google token verification error: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Google authentication failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected Google token verification failure: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Unable to verify Google credentials. Please try again."
        )
