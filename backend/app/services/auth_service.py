"""Servizio di autenticazione JWT per clienti."""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cliente_account import ClienteAccount

# Configurazione
SECRET_KEY = "your-secret-key-change-in-production-gestione-magazzino-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 giorni

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/clienti/login", auto_error=False)


def hash_password(password: str) -> str:
    """Hash della password con bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica password contro hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un token JWT."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_cliente(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> ClienteAccount:
    """Ottieni il cliente corrente dal token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token non valido o scaduto",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if token is None:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        cliente_id: int = payload.get("sub")
        if cliente_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    cliente = db.query(ClienteAccount).filter(ClienteAccount.id == cliente_id).first()
    if cliente is None:
        raise credentials_exception
    
    return cliente