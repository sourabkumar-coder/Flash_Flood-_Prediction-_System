import os
import logging
import datetime
from typing import List, Optional, Dict, Any

try:
    from env_loader import load_env
    load_env()
except ImportError:
    try:
        from ..env_loader import load_env
        load_env()
    except Exception:
        pass

logger = logging.getLogger(__name__)

# In-memory fallback in case pymongo is missing or cluster is unreachable
_FALLBACK_USERS_STORE: Dict[str, Dict[str, Any]] = {}
_MONGO_CLIENT = None
_MONGO_DB = None


def get_mongo_client():
    global _MONGO_CLIENT, _MONGO_DB
    if _MONGO_CLIENT is not None:
        return _MONGO_DB

    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME", "flash_flood_db")

    if not mongo_uri:
        logger.warning("MONGO_URI not configured in .env. Using in-memory fallback user store.")
        return None

    try:
        from pymongo import MongoClient
        import pymongo

        client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            tlsAllowInvalidCertificates=False
        )
        # Verify connection
        db = client[db_name]
        db.users.create_index([("email", pymongo.ASCENDING)], unique=True)
        db.users.create_index([("state", pymongo.ASCENDING), ("district", pymongo.ASCENDING)])
        _MONGO_CLIENT = client
        _MONGO_DB = db
        logger.info(f"Connected to MongoDB Atlas: database '{db_name}'")
        return _MONGO_DB
    except ImportError:
        logger.warning("pymongo is not installed in the environment. Please run: pip install pymongo dnspython. Using in-memory store for now.")
        return None
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB Atlas ({str(e)}). Using local fallback store.")
        return None


def create_user(
    name: str,
    email: str,
    phone: str,
    password: str,
    state: str = "Himachal Pradesh",
    district: str = "Kullu",
    role: str = "citizen",
    notification_channel: str = "sms"
) -> Dict[str, Any]:
    """Register a new user / citizen with region details for flood alerts."""
    email_clean = email.strip().lower()
    user_doc = {
        "name": name.strip(),
        "email": email_clean,
        "phone": phone.strip(),
        "password": password,  # Demo check
        "state": state.strip(),
        "district": district.strip(),
        "role": role,
        "notification_channel": notification_channel,
        "created_at": datetime.datetime.utcnow().isoformat()
    }

    db = get_mongo_client()
    if db is not None:
        try:
            # Check existing
            existing = db.users.find_one({"email": email_clean})
            if existing:
                raise ValueError(f"User with email '{email_clean}' is already registered.")
            res = db.users.insert_one(user_doc)
            user_doc["_id"] = str(res.inserted_id)
            return user_doc
        except Exception as e:
            if "already registered" in str(e):
                raise
            logger.warning(f"MongoDB write failed ({str(e)}), writing to in-memory store.")

    # Fallback to local store
    if email_clean in _FALLBACK_USERS_STORE:
        raise ValueError(f"User with email '{email_clean}' is already registered.")
    user_doc["_id"] = f"user_{len(_FALLBACK_USERS_STORE) + 1}"
    _FALLBACK_USERS_STORE[email_clean] = user_doc
    return user_doc


def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Find user profile by email."""
    email_clean = email.strip().lower()
    db = get_mongo_client()
    if db is not None:
        try:
            doc = db.users.find_one({"email": email_clean})
            if doc:
                doc["_id"] = str(doc["_id"])
                return doc
        except Exception as e:
            logger.warning(f"MongoDB query failed: {str(e)}")

    return _FALLBACK_USERS_STORE.get(email_clean)


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user with email and password (demo check)."""
    user = find_user_by_email(email)
    if not user:
        return None
    if user.get("password") == password:
        # Return user info without password
        safe_user = {k: v for k, v in user.items() if k != "password"}
        return safe_user
    return None


def find_users_by_region(state: str, district: str) -> List[Dict[str, Any]]:
    """Retrieve all registered citizens living in a specific state and district."""
    state_clean = state.strip().lower()
    district_clean = district.strip().lower()

    db = get_mongo_client()
    if db is not None:
        try:
            cursor = db.users.find({
                "state": {"$regex": f"^{re_escape(state)}$", "$options": "i"},
                "district": {"$regex": f"^{re_escape(district)}$", "$options": "i"}
            })
            users = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                users.append(doc)
            if users:
                return users
        except Exception as e:
            logger.warning(f"MongoDB region search failed: {str(e)}")

    # Fallback search
    matched = []
    for u in _FALLBACK_USERS_STORE.values():
        if (
            u.get("state", "").strip().lower() == state_clean
            and u.get("district", "").strip().lower() == district_clean
        ):
            matched.append(u)
    return matched


def get_all_users(limit: int = 100) -> List[Dict[str, Any]]:
    """List registered users for administration."""
    db = get_mongo_client()
    if db is not None:
        try:
            cursor = db.users.find().limit(limit)
            users = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                users.append({k: v for k, v in doc.items() if k != "password"})
            return users
        except Exception as e:
            logger.warning(f"MongoDB fetch all failed: {str(e)}")

    return [{k: v for k, v in u.items() if k != "password"} for u in _FALLBACK_USERS_STORE.values()][:limit]


def re_escape(s: str) -> str:
    import re
    return re.escape(s)
