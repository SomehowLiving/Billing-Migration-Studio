import os
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")

    print("TOKEN EXISTS:", bool(token))

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])

        print("PAYLOAD:", payload)

        user = db.query(User).filter(User.id == payload["sub"]).first()

        print("USER FOUND:", user is not None)

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user

    except jwt.ExpiredSignatureError:
        print("TOKEN EXPIRED")
        raise HTTPException(status_code=401, detail="Token expired")

    except jwt.InvalidTokenError as e:
        print("INVALID TOKEN:", str(e))
        raise HTTPException(status_code=401, detail="Invalid token")
    

def seed_admin(db: Session):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = db.query(User).filter(User.email == admin_email).first()
    if existing is None:
        user = User(
            email=admin_email,
            name="Admin",
            password_hash=hash_password(admin_password),
            role="admin",
        )
        db.add(user)
        db.commit()
    elif not verify_password(admin_password, existing.password_hash):
        existing.password_hash = hash_password(admin_password)
        db.commit()
