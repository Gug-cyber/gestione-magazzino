from fastapi import Depends, HTTPException
from .auth import get_current_active_user

VALID_ROLES = ["guest", "operatore", "magazziniere", "manager", "admin"]


def get_current_admin(current_user=Depends(get_current_active_user)):
    """Dependency that ensures the current user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Accesso riservato agli amministratori")
    return current_user


def require_role(required_role: str):
    """Dependency factory that requires a minimum role level."""
    def role_checker(current_user=Depends(get_current_active_user)):
        user_role = getattr(current_user, "ruolo", "operatore") or "operatore"
        if user_role not in VALID_ROLES:
            user_role = "operatore"
        if required_role not in VALID_ROLES:
            raise HTTPException(status_code=500, detail=f"Ruolo non valido: {required_role}")
        if VALID_ROLES.index(user_role) < VALID_ROLES.index(required_role):
            raise HTTPException(
                status_code=403,
                detail=f"Ruolo {required_role} o superiore richiesto",
            )
        return current_user
    return role_checker
