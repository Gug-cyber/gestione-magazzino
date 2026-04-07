import os
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from joserfc import jwt
from joserfc.jwk import OctKey
from joserfc.errors import JoseError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .schemas.utente import TokenData

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "changeme-use-a-long-random-secret-key-in-production")  # nosec B105 – default triggers warning below; real secret must be set via env var
if SECRET_KEY == "changeme-use-a-long-random-secret-key-in-production":  # nosec B105 – checking against the default to warn users; not a real credential
    logger.warning(
        "SECRET_KEY is using the default insecure value. "
        "Set the SECRET_KEY environment variable to a strong random secret in production."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def _prepare_password(password: str) -> str:
    """
    SHA-256 pre-hash the password before bcrypt to avoid the 72-byte limit.
    The hex digest is always 64 ASCII chars, well within bcrypt's limit.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_prepare_password(plain_password), hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(_prepare_password(password))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire.timestamp())})
    key = OctKey.import_key(SECRET_KEY.encode())
    return jwt.encode({"alg": ALGORITHM}, to_encode, key)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from .crud.utente import get_utente_by_username

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenziali non valide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        key = OctKey.import_key(SECRET_KEY.encode())
        token_obj = jwt.decode(token, key)
        username: str = token_obj.claims.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JoseError:
        raise credentials_exception

    utente = get_utente_by_username(db, token_data.username)
    if utente is None:
        raise credentials_exception
    return utente

def get_current_active_user(current_user=Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Utente non attivo")
    return current_user
