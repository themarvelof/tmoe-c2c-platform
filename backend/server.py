from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import csv
import io
import json
import hashlib
import hmac
import openpyxl
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import httpx

import impact_export
from services import impact_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT and Password hashing
JWT_SECRET = os.environ.get('JWT_SECRET', 'secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '720'))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRole(str):
    PUBLISHER = "publisher"
    BRAND = "brand"
    ADMIN = "admin"

class UserStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class CampaignStatus(str):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PayoutStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"

# User Models
class UserRegister(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    role: str
    company_name: Optional[str] = None
    website: Optional[str] = None
    # Brand profile fields
    industry: Optional[str] = None
    description: Optional[str] = None
    target_categories: Optional[List[str]] = None
    target_markets: Optional[List[str]] = None
    commerce_links: Optional[List[str]] = None
    # Publisher profile fields
    name: Optional[str] = None
    categories: Optional[List[str]] = None
    monthly_sessions: Optional[int] = None
    monthly_pageviews: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminCreateBrand(BaseModel):
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    website: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    role: str
    status: str = UserStatus.PENDING
    company_name: Optional[str] = None
    website: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    role: str
    status: str
    company_name: Optional[str] = None
    website: Optional[str] = None
    created_at: str

# Publisher Profile Models
class ContentSlot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slot_type: str
    category: str
    monthly_traffic: int
    status: str = "available"

class PublisherProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    website: str
    logo_url: Optional[str] = None
    categories: List[str]
    description: str
    monthly_sessions: int
    monthly_pageviews: int
    content_slots: List[ContentSlot] = []
    payment_details: Optional[Dict[str, Any]] = None
    rss_feed_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PublisherProfileCreate(BaseModel):
    name: str
    website: str
    logo_url: Optional[str] = None
    categories: List[str]
    description: str
    monthly_sessions: int
    monthly_pageviews: int
    payment_details: Optional[Dict[str, Any]] = None
    rss_feed_url: Optional[str] = None

class ContentSlotCreate(BaseModel):
    slot_type: str
    category: str
    monthly_traffic: int

# Brand Profile Models
class BrandProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_name: str
    website: str
    logo_url: Optional[str] = None
    industry: str
    description: str
    target_categories: List[str]
    target_markets: List[str]
    commerce_links: List[str] = []
    impact_program_sub_id: Optional[str] = None
    impact_report_handle: Optional[str] = None
    impact_campaign_names: Optional[List[str]] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BrandProfileCreate(BaseModel):
    company_name: str
    website: str
    logo_url: Optional[str] = None
    industry: str
    description: str
    target_categories: List[str]
    target_markets: List[str]
    commerce_links: List[str] = []
    impact_program_sub_id: Optional[str] = None
    impact_report_handle: Optional[str] = None
    impact_campaign_names: Optional[List[str]] = []

# Campaign Brief Models
class CampaignBrief(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    name: str
    category: str
    target_markets: List[str]
    product_skus: List[str]
    budget_range: str
    gmv_target: Optional[float] = None
    roi_target: Optional[float] = None
    commerce_links: List[str]
    status: str = "submitted"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignBriefCreate(BaseModel):
    name: str
    category: str
    target_markets: List[str]
    product_skus: List[str]
    budget_range: str
    gmv_target: Optional[float] = None
    roi_target: Optional[float] = None
    commerce_links: List[str]

# Campaign Models
class EstimatedOutcomes(BaseModel):
    traffic: int
    clicks: int
    orders: int
    gmv: float
    roi: float

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    target_markets: List[str]
    assigned_publishers: List[str] = []
    assigned_brand: str
    content_type: str
    content_budget: float
    distribution_budget: float
    estimated_outcomes: Optional[EstimatedOutcomes] = None
    commerce_links: List[str]
    status: str = CampaignStatus.DRAFT
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    performance_data: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignCreate(BaseModel):
    name: str
    category: str
    target_markets: List[str]
    assigned_publishers: List[str] = []
    assigned_brand: str
    content_type: str
    content_budget: float
    distribution_budget: float
    commerce_links: List[str]
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CampaignUpdate(BaseModel):
    status: Optional[str] = None
    assigned_publishers: Optional[List[str]] = None
    performance_data: Optional[Dict[str, Any]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

# ROI Benchmark Models
class ROIBenchmark(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    cvr: float
    aov: float
    traffic_multiplier: float
    ctr: float
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ROIBenchmarkCreate(BaseModel):
    category: str
    cvr: float
    aov: float
    traffic_multiplier: float
    ctr: float

# Settlement Models
class Settlement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    publisher_id: str
    gmv: float
    rate_model: str
    amount_owed: float
    platform_fee: float
    payout_status: str = PayoutStatus.PENDING
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SettlementCreate(BaseModel):
    campaign_id: str
    publisher_id: str
    gmv: float
    rate_model: str
    amount_owed: float
    platform_fee: float

class SettlementUpdate(BaseModel):
    payout_status: str

# Brand Reporting Models
class BrandReportMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    revenue: float = 0.0
    ctr: float = 0.0
    conversion_rate: float = 0.0
    cost_per_click: float = 0.0
    roas: float = 0.0

class BrandReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    report_date: str
    period: str  # daily, weekly, monthly
    metrics: BrandReportMetrics
    campaign_breakdown: Optional[List[Dict[str, Any]]] = []
    custom_data: Optional[Dict[str, Any]] = {}
    csv_columns: Optional[List[str]] = []
    csv_rows: Optional[List[Dict[str, Any]]] = []
    filename: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BrandReportCreate(BaseModel):
    brand_id: str
    report_date: str
    period: str
    metrics: BrandReportMetrics
    campaign_breakdown: Optional[List[Dict[str, Any]]] = []
    custom_data: Optional[Dict[str, Any]] = {}

class AdminBrandImpactConfig(BaseModel):
    impact_program_sub_id: Optional[str] = None
    impact_report_handle: Optional[str] = None
    impact_campaign_names: Optional[List[str]] = None

class AdminImpactImportBody(BaseModel):
    start_date: str
    end_date: str
    report_handle: Optional[str] = None
    program_sub_id: Optional[str] = None
    replace_matching_range: bool = True

class AdminImpactSyncAllBody(BaseModel):
    start_date: str
    end_date: str
    replace_matching_range: bool = True

class AdminImpactSyncWindowBody(BaseModel):
    days: int = 10
    replace_matching_range: bool = True

# Content Piece Models (from RSS feeds)
class ContentPiece(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    publisher_id: str
    brand_id: str
    campaign_id: Optional[str] = None
    title: str
    url: str
    published_date: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    author: Optional[str] = None
    source: str = "rss"  # rss, manual, api
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ContentPieceCreate(BaseModel):
    publisher_id: str
    brand_id: str
    campaign_id: Optional[str] = None
    title: str
    url: str
    published_date: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    author: Optional[str] = None
    source: str = "rss"

# ==================== HELPER FUNCTIONS ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return UserResponse(**user)

def require_role(required_roles: List[str]):
    async def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

def hash_password(password: str) -> str:
    """Hash password as salt:hash using scrypt (node-compatible shape)."""
    salt = os.urandom(16).hex()
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=bytes.fromhex(salt),
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    ).hex()
    return f"{salt}:{derived}"

def verify_password(password: str, stored: str) -> bool:
    """
    Verify scrypt salt:hash format.
    Falls back to legacy bcrypt hashes for existing users.
    """
    if ":" in stored:
        try:
            salt, hashed = stored.split(":", 1)
            if not salt or not hashed:
                return False
            derived = hashlib.scrypt(
                password.encode("utf-8"),
                salt=bytes.fromhex(salt),
                n=2**14,
                r=8,
                p=1,
                dklen=64,
            ).hex()
            return hmac.compare_digest(derived, hashed)
        except Exception:
            return False
    try:
        return pwd_context.verify(password, stored)
    except Exception:
        return False

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send email using Brevo transactional email API.
    Returns True on success, False otherwise.
    """
    api_key = (os.environ.get("BREVO_API_KEY") or "").strip()
    if not api_key:
        logger.warning("Email skipped for %s: BREVO_API_KEY missing", to_email)
        return False

    sender_email = (os.environ.get("BREVO_SENDER_EMAIL") or "no-reply@tmoe.local").strip()
    sender_name = (os.environ.get("BREVO_SENDER_NAME") or "TMOE").strip()
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        if response.status_code >= 400:
            logger.error(
                "Brevo email failed to %s (status=%s): %s",
                to_email,
                response.status_code,
                response.text[:1000],
            )
            return False
        return True
    except requests.RequestException as exc:
        logger.exception("Brevo email request failed for %s: %s", to_email, exc)
        return False

def send_registration_email(recipient_email: str, role: str) -> bool:
    subject = "Successfully Registered - TMOE"
    html_content = (
        "<p>Hi,</p>"
        f"<p>You have successfully registered on TMOE as a <strong>{role}</strong>.</p>"
        "<p>Your account is awaiting admin approval.</p>"
        "<p>Thanks,<br/>TMOE Team</p>"
    )
    return send_email(recipient_email, subject, html_content)

SEED_ACCOUNT_PASSWORDS = {
    "admin@tmoe.com": "Admin@123",
    "abhishek@marvelof.com": "Publisher@123",
    "amazontmoe@marvelof.com": "Amazon@123",
    "skyscanner@gmail.com": "Skyscanner@123",
}

async def repair_missing_seed_password(user: Dict[str, Any]) -> Optional[str]:
    """
    Backfill password_hash for known seeded accounts when older docs are missing it.
    Returns repaired hash if patched, else None.
    """
    email = str(user.get("email") or "").strip().lower()
    if email not in SEED_ACCOUNT_PASSWORDS:
        return None
    if user.get("password_hash"):
        return str(user.get("password_hash"))
    repaired = hash_password(SEED_ACCOUNT_PASSWORDS[email])
    await db.users.update_one(
        {"id": user.get("id")},
        {"$set": {"password_hash": repaired}}
    )
    logger.warning("Repaired missing password_hash for seeded account %s", email)
    return repaired

def _impact_credentials_configured() -> bool:
    sid = (os.environ.get("IMPACT_ACCOUNT_SID") or "").strip()
    tok = (os.environ.get("IMPACT_AUTH_TOKEN") or "").strip()
    return bool(sid and tok)

def _resolve_impact_sub_aid(
    profile: Optional[Dict[str, Any]],
    program_sub_id: Optional[str],
) -> Optional[str]:
    if program_sub_id and str(program_sub_id).strip():
        return str(program_sub_id).strip()
    if profile and profile.get("impact_program_sub_id"):
        v = profile.get("impact_program_sub_id")
        if v is not None and str(v).strip():
            return str(v).strip()
    env = os.environ.get("IMPACT_SUBAID") or os.environ.get("IMPACT_SUB_AID")
    if env and str(env).strip():
        return str(env).strip()
    return None

def _resolve_impact_report_handle(profile: Optional[Dict[str, Any]], override: Optional[str]) -> str:
    if override and str(override).strip():
        return str(override).strip()
    if profile and profile.get("impact_report_handle"):
        v = profile.get("impact_report_handle")
        if v is not None and str(v).strip():
            return str(v).strip()
    return (os.environ.get("IMPACT_REPORT_HANDLE") or "partner_performance_by_program").strip()

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash provided password or auto-generate one when signup omits it.
    generated_password = f"Tmoe@{uuid.uuid4().hex[:12]}"
    raw_password = user_data.password if user_data.password else generated_password
    password_hash = hash_password(raw_password)
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        company_name=user_data.company_name,
        website=user_data.website
    )
    
    await db.users.insert_one(user.model_dump())

    # Optionally create role-specific profile during signup when full profile data is provided.
    if user_data.role == UserRole.BRAND:
        if (
            user_data.company_name
            and user_data.website
            and user_data.industry
            and user_data.description
            and user_data.target_categories
            and user_data.target_markets
        ):
            brand_profile = BrandProfile(
                user_id=user.id,
                company_name=user_data.company_name.strip(),
                website=user_data.website.strip(),
                industry=user_data.industry.strip(),
                description=user_data.description.strip(),
                target_categories=[c.strip() for c in user_data.target_categories if str(c).strip()],
                target_markets=[m.strip() for m in user_data.target_markets if str(m).strip()],
                commerce_links=[l.strip() for l in (user_data.commerce_links or []) if str(l).strip()],
            )
            await db.brand_profiles.insert_one(brand_profile.model_dump())

    if user_data.role == UserRole.PUBLISHER:
        if (
            user_data.name
            and user_data.website
            and user_data.description
            and user_data.categories
            and user_data.monthly_sessions is not None
            and user_data.monthly_pageviews is not None
        ):
            publisher_profile = PublisherProfile(
                user_id=user.id,
                name=user_data.name.strip(),
                website=user_data.website.strip(),
                categories=[c.strip() for c in user_data.categories if str(c).strip()],
                description=user_data.description.strip(),
                monthly_sessions=int(user_data.monthly_sessions),
                monthly_pageviews=int(user_data.monthly_pageviews),
            )
            await db.publisher_profiles.insert_one(publisher_profile.model_dump())

    send_registration_email(str(user_data.email), user_data.role)
    
    return {
        "message": "Registration successful. Awaiting admin approval.",
        "user": UserResponse(**user.model_dump())
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    password_hash = user.get("password_hash")
    if not password_hash or not isinstance(password_hash, str):
        repaired = await repair_missing_seed_password(user)
        if repaired:
            password_hash = repaired
            user["password_hash"] = repaired
        else:
            logger.warning("Login blocked for %s: missing password_hash in user record", credentials.email)
            raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    status_value = user.get("status", UserStatus.PENDING)
    if status_value == UserStatus.PENDING:
        raise HTTPException(status_code=403, detail="Account pending admin approval")

    if status_value in [UserStatus.REJECTED, UserStatus.SUSPENDED]:
        raise HTTPException(status_code=403, detail=f"Account {status_value}")

    user_id = user.get("id")
    role = user.get("role")
    if not user_id or not role:
        logger.error("Login failed for %s: user record missing id/role", credentials.email)
        raise HTTPException(status_code=500, detail="Account data is incomplete")

    token = create_access_token({"user_id": user_id, "role": role})

    return {
        "token": token,
        "user": UserResponse(**user)
    }

@api_router.get("/auth/me")
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users/pending")
async def get_pending_users(current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))):
    users = await db.users.find({"status": UserStatus.PENDING}, {"_id": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status: str,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User status updated to {status}"}

@api_router.get("/admin/users")
async def get_all_users(current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))):
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.post("/admin/users/create-brand")
async def create_brand_account(
    user_data: AdminCreateBrand,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create brand user with approved status (admin created, so pre-approved)
    user = User(
        email=user_data.email,
        password_hash=password_hash,
        role=UserRole.BRAND,
        status=UserStatus.APPROVED,  # Auto-approved since admin is creating
        company_name=user_data.company_name,
        website=user_data.website
    )
    
    await db.users.insert_one(user.model_dump())
    
    return {
        "message": "Brand account created successfully",
        "user": UserResponse(**user.model_dump()),
        "credentials": {
            "email": user_data.email,
            "password": user_data.password  # Return plaintext password for admin to share
        }
    }

@api_router.get("/admin/dashboard/stats")
async def get_dashboard_stats(current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))):
    active_campaigns = await db.campaigns.count_documents({"status": CampaignStatus.ACTIVE})
    pending_verifications = await db.users.count_documents({"status": UserStatus.PENDING})
    total_publishers = await db.users.count_documents({"role": UserRole.PUBLISHER, "status": UserStatus.APPROVED})
    total_brands = await db.users.count_documents({"role": UserRole.BRAND, "status": UserStatus.APPROVED})
    
    # Calculate total GMV from completed campaigns
    campaigns = await db.campaigns.find({"status": CampaignStatus.COMPLETED}, {"_id": 0}).to_list(1000)
    total_gmv = sum(c.get("performance_data", {}).get("gmv", 0) for c in campaigns if c.get("performance_data"))
    
    return {
        "active_campaigns": active_campaigns,
        "pending_verifications": pending_verifications,
        "total_publishers": total_publishers,
        "total_brands": total_brands,
        "total_gmv": total_gmv
    }


@api_router.get("/reports")
async def get_impact_reports(
    start_date: str,
    end_date: str,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN])),
):
    """Fetch Impact Reports API data and return summary/daily/table for dashboard."""
    try:
        start_obj = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        end_obj = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="start_date and end_date must be YYYY-MM-DD")
    if end_obj < start_obj:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")

    try:
        program_rows = await impact_service.get_program_report(start_date.strip(), end_date.strip())
        daily_rows = await impact_service.get_daily_report(start_date.strip(), end_date.strip())
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"Impact API error: {detail}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {exc}")

    records = [
        {
            "Campaign": str(row.get("campaign") or "Unknown").strip(),
            "Clicks": int(row.get("clicks", 0)),
            "Actions": int(row.get("actions", 0)),
            "Sale_Amount": round(float(row.get("revenue", 0.0)), 2),
        }
        for row in program_rows
    ]

    # Aggregate campaigns in case API returns repeated campaign rows.
    summary_map: Dict[str, Dict[str, Any]] = {}
    for row in records:
        campaign = str(row.get("Campaign") or "Unknown").strip()
        if campaign not in summary_map:
            summary_map[campaign] = {"campaign": campaign, "clicks": 0, "actions": 0, "revenue": 0.0}
        summary_map[campaign]["clicks"] += int(row.get("Clicks", 0))
        summary_map[campaign]["actions"] += int(row.get("Actions", 0))
        summary_map[campaign]["revenue"] += float(row.get("Sale_Amount", 0.0))

    summary = sorted(
        (
            {
                "campaign": v["campaign"],
                "clicks": int(v["clicks"]),
                "actions": int(v["actions"]),
                "revenue": round(float(v["revenue"]), 2),
            }
            for v in summary_map.values()
        ),
        key=lambda x: x["revenue"],
        reverse=True,
    )

    daily = sorted(
        [
            {
                "date": str(row.get("date", ""))[:10],
                "clicks": int(row.get("clicks", 0)),
                "actions": int(row.get("actions", 0)),
                "revenue": round(float(row.get("revenue", 0.0)), 2),
                "impressions": int(row.get("impressions", 0)),
            }
            for row in daily_rows
            if row.get("date")
        ],
        key=lambda x: x["date"],
    )

    total_revenue = sum(item["revenue"] for item in summary)
    count = len(summary)
    if count == 0:
        return {"summary": [], "daily": daily, "table": [], "records": []}

    if total_revenue > 0:
        ratios = {item["campaign"]: item["revenue"] / total_revenue for item in summary}
    else:
        equal = 1.0 / count
        ratios = {item["campaign"]: equal for item in summary}

    table = []
    for d in daily:
        for item in summary:
            ratio = ratios[item["campaign"]]
            table.append(
                {
                    "date": d["date"],
                    "campaign": item["campaign"],
                    "clicks": int(round(d["clicks"] * ratio)),
                    "conversions": int(round(d["actions"] * ratio)),
                    "revenue": round(d["revenue"] * ratio, 2),
                    "impressions": int(round(d["impressions"] * ratio)),
                }
            )

    return {"summary": summary, "daily": daily, "table": table, "records": records}

# ==================== PUBLISHER ROUTES ====================

@api_router.post("/publisher/profile")
async def create_publisher_profile(
    profile_data: PublisherProfileCreate,
    current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))
):
    # Check if profile already exists
    existing = await db.publisher_profiles.find_one({"user_id": current_user.id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    profile = PublisherProfile(user_id=current_user.id, **profile_data.model_dump())
    await db.publisher_profiles.insert_one(profile.model_dump())
    return profile

@api_router.get("/publisher/profile")
async def get_publisher_profile(current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))):
    profile = await db.publisher_profiles.find_one({"user_id": current_user.id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return PublisherProfile(**profile)

@api_router.put("/publisher/profile")
async def update_publisher_profile(
    profile_data: PublisherProfileCreate,
    current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))
):
    result = await db.publisher_profiles.update_one(
        {"user_id": current_user.id},
        {"$set": profile_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile updated successfully"}

@api_router.post("/publisher/profile/slots")
async def add_content_slot(
    slot_data: ContentSlotCreate,
    current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))
):
    slot = ContentSlot(**slot_data.model_dump())
    result = await db.publisher_profiles.update_one(
        {"user_id": current_user.id},
        {"$push": {"content_slots": slot.model_dump()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return slot

@api_router.get("/publisher/campaigns")
async def get_publisher_campaigns(current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))):
    campaigns = await db.campaigns.find(
        {"assigned_publishers": current_user.id},
        {"_id": 0}
    ).to_list(1000)
    return [Campaign(**c) for c in campaigns]

@api_router.get("/publisher/earnings")
async def get_publisher_earnings(current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))):
    settlements = await db.settlements.find({"publisher_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    total_earnings = sum(s["amount_owed"] for s in settlements)
    pending_payout = sum(s["amount_owed"] for s in settlements if s["payout_status"] in [PayoutStatus.PENDING, PayoutStatus.APPROVED])
    paid_out = sum(s["amount_owed"] for s in settlements if s["payout_status"] == PayoutStatus.PAID)
    
    return {
        "total_earnings": total_earnings,
        "pending_payout": pending_payout,
        "paid_out": paid_out,
        "settlements": [Settlement(**s) for s in settlements]
    }

@api_router.get("/publisher/my-brands")
async def get_publisher_brands(current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))):
    """Get all brands that this publisher is working with"""
    # Find campaigns assigned to this publisher
    campaigns = await db.campaigns.find(
        {"assigned_publishers": current_user.id},
        {"_id": 0}
    ).to_list(1000)
    
    # Get unique brand IDs
    brand_ids = list(set(c["assigned_brand"] for c in campaigns if c.get("assigned_brand")))
    
    if not brand_ids:
        return []
    
    # Get brand details
    brands = []
    for brand_id in brand_ids:
        user = await db.users.find_one({"id": brand_id}, {"_id": 0})
        if user:
            profile = await db.brand_profiles.find_one({"user_id": brand_id}, {"_id": 0})
            brand_campaigns = [c for c in campaigns if c.get("assigned_brand") == brand_id]
            brands.append({
                "user": UserResponse(**user),
                "profile": BrandProfile(**profile) if profile else None,
                "campaigns_count": len(brand_campaigns),
                "active_campaigns": len([c for c in brand_campaigns if c["status"] == "active"])
            })
    
    return brands

@api_router.get("/publisher/brand-reports")
async def get_publisher_brand_reports(current_user: UserResponse = Depends(require_role([UserRole.PUBLISHER]))):
    """Get reports for all brands this publisher works with, grouped by brand"""
    campaigns = await db.campaigns.find(
        {"assigned_publishers": current_user.id}, {"_id": 0}
    ).to_list(1000)
    brand_ids = list(set(c["assigned_brand"] for c in campaigns if c.get("assigned_brand")))
    if not brand_ids:
        return []

    result = []
    for brand_id in brand_ids:
        brand_user = await db.users.find_one({"id": brand_id}, {"_id": 0})
        if not brand_user:
            continue
        reports = await db.brand_reports.find(
            {"brand_id": brand_id}, {"_id": 0}
        ).sort("report_date", -1).to_list(100)

        total_impr = sum(r["metrics"]["impressions"] for r in reports)
        total_clicks = sum(r["metrics"]["clicks"] for r in reports)
        total_conv = sum(r["metrics"]["conversions"] for r in reports)
        total_rev = sum(r["metrics"]["revenue"] for r in reports)

        result.append({
            "brand": UserResponse(**brand_user),
            "report_count": len(reports),
            "summary": {
                "total_impressions": total_impr,
                "total_clicks": total_clicks,
                "total_conversions": total_conv,
                "total_revenue": round(total_rev, 2),
                "avg_ctr": round(total_clicks / total_impr * 100, 2) if total_impr > 0 else 0,
            },
            "reports": [BrandReport(**r) for r in reports[:30]]
        })
    return result

@api_router.get("/admin/all-brand-reports")
async def get_all_brand_reports_admin(current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))):
    """Admin gets reports for all brands"""
    brands = await db.users.find({"role": "brand"}, {"_id": 0}).to_list(1000)
    result = []
    creds_ok = _impact_credentials_configured()
    for brand_user in brands:
        brand_id = brand_user["id"]
        reports = await db.brand_reports.find(
            {"brand_id": brand_id}, {"_id": 0}
        ).sort("report_date", -1).to_list(500)

        total_impr = sum(r["metrics"]["impressions"] for r in reports)
        total_clicks = sum(r["metrics"]["clicks"] for r in reports)
        total_conv = sum(r["metrics"]["conversions"] for r in reports)
        total_rev = sum(r["metrics"]["revenue"] for r in reports)

        profile = await db.brand_profiles.find_one({"user_id": brand_id}, {"_id": 0})
        sub_aid = _resolve_impact_sub_aid(profile, None)
        impact_import_available = creds_ok and bool(sub_aid)

        result.append({
            "brand": UserResponse(**brand_user),
            "report_count": len(reports),
            "summary": {
                "total_impressions": total_impr,
                "total_clicks": total_clicks,
                "total_conversions": total_conv,
                "total_revenue": round(total_rev, 2),
                "avg_ctr": round(total_clicks / total_impr * 100, 2) if total_impr > 0 else 0,
            },
            "reports": [BrandReport(**r) for r in reports],
            "impact_import_available": impact_import_available,
        })
    return result

@api_router.post("/admin/brand-reports/{brand_id}/upload-csv")
async def admin_upload_for_brand(
    brand_id: str,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Admin can upload CSV/XLS/XLSX reports for any brand"""
    brand = await db.users.find_one({"id": brand_id, "role": "brand"}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Accepted formats: CSV, XLS, XLSX")

    content = await file.read()
    original_columns, csv_rows = parse_spreadsheet(content, file.filename)
    if not csv_rows:
        raise HTTPException(status_code=400, detail="File is empty or could not be parsed")

    metrics = extract_metrics_from_rows(csv_rows)

    report = BrandReport(
        brand_id=brand_id,
        report_date=datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        period="daily",
        metrics=metrics,
        campaign_breakdown=[],
        custom_data={"source": "admin_file_upload"},
        csv_columns=original_columns,
        csv_rows=csv_rows,
        filename=file.filename
    )
    await db.brand_reports.insert_one(report.model_dump())

    return {
        "message": f"Successfully imported report: {file.filename} ({len(csv_rows)} rows) for {brand['email']}",
        "report_id": report.id,
        "brand_email": brand["email"],
        "row_count": len(csv_rows)
    }

@api_router.patch("/admin/brands/{brand_id}/impact-config")
async def admin_update_brand_impact_config(
    brand_id: str,
    body: AdminBrandImpactConfig,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Set impact.com program (SUBAID) and optional report handle for a brand."""
    brand = await db.users.find_one({"id": brand_id, "role": "brand"}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    patch_raw = body.model_dump(exclude_unset=True)
    patch: Dict[str, Any] = {}
    for k, v in patch_raw.items():
        if k == "impact_campaign_names":
            if isinstance(v, list):
                cleaned = []
                seen = set()
                for item in v:
                    s = str(item).strip()
                    if s and s not in seen:
                        seen.add(s)
                        cleaned.append(s)
                patch[k] = cleaned
            continue
        if v is None:
            continue
        s = str(v).strip()
        if s:
            patch[k] = s
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.brand_profiles.update_one({"user_id": brand_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Brand profile not found. Create a profile for this brand before saving Impact settings.",
        )
    return {"message": "Impact settings updated"}

@api_router.post("/admin/brand-reports/{brand_id}/import-impact")
async def admin_import_impact_report(
    brand_id: str,
    body: AdminImpactImportBody,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Pull impact.com ReportExport and store one legacy performance row per program (dashboard table)."""
    result = await _impact_download_legacy_rows(
        brand_id,
        body.start_date.strip(),
        body.end_date.strip(),
        body.program_sub_id,
        body.report_handle,
        body.replace_matching_range,
    )
    if not result["ok"]:
        err = result["error"]
        code = 502
        if err == "Brand not found":
            code = 404
        elif "YYYY-MM-DD" in err or "end_date must" in err:
            code = 400
        elif "SUBAID" in err or "program id" in err.lower():
            code = 400
        elif "not configured" in err:
            code = 503
        raise HTTPException(status_code=code, detail=err)

    return {
        "message": f"Imported {result['rows']} Impact program row(s) into the performance table for {result['brand_email']}",
        "brand_email": result["brand_email"],
        "row_count": result["rows"],
        "report_handle": result.get("report_handle_used"),
        "impact": result.get("meta"),
    }

@api_router.post("/admin/impact-sync-all-brands")
async def admin_impact_sync_all_brands(
    body: AdminImpactSyncAllBody,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Run Impact ReportExport for every brand with credentials; rows are split by campaign/brand name."""
    creds_ok = _impact_credentials_configured()
    brands = await db.users.find({"role": "brand"}, {"_id": 0}).to_list(1000)
    results: List[Dict[str, Any]] = []
    total_rows = 0
    for bu in brands:
        bid = bu["id"]
        if not creds_ok:
            results.append({
                "brand_id": bid,
                "email": bu.get("email"),
                "skipped": True,
                "reason": "missing Impact credentials",
            })
            continue
        r = await _impact_download_legacy_rows(
            bid,
            body.start_date.strip(),
            body.end_date.strip(),
            None,
            None,
            body.replace_matching_range,
        )
        if r.get("ok"):
            total_rows += r["rows"]
            results.append({
                "brand_id": bid,
                "email": bu.get("email"),
                "skipped": False,
                "rows": r["rows"],
                "report_handle": r.get("report_handle_used"),
            })
        else:
            results.append({
                "brand_id": bid,
                "email": bu.get("email"),
                "skipped": False,
                "rows": 0,
                "error": r.get("error"),
            })
    return {
        "message": f"Impact sync finished; {total_rows} program row(s) imported across brands.",
        "total_rows": total_rows,
        "results": results,
    }

@api_router.post("/admin/impact-sync-last-10-days")
async def admin_impact_sync_last_10_days(
    body: AdminImpactSyncWindowBody,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """
    Daily sync window: for each brand, pull Impact rows day-by-day for last N days.
    Keeps historical days and updates the same day on re-sync.
    """
    days = max(1, min(int(body.days or 10), 30))
    today = datetime.now(timezone.utc).date()
    day_list = [(today - timedelta(days=(days - 1 - i))).isoformat() for i in range(days)]

    brands = await db.users.find({"role": "brand"}, {"_id": 0}).to_list(1000)
    total_rows = 0
    details: List[Dict[str, Any]] = []

    for bu in brands:
        bid = bu["id"]
        imported = 0
        errors: List[Dict[str, str]] = []
        for d in day_list:
            r = await _impact_download_legacy_rows(
                bid,
                d,
                d,
                None,
                None,
                body.replace_matching_range,
            )
            if r.get("ok"):
                imported += int(r.get("rows", 0))
            else:
                errors.append({"date": d, "error": str(r.get("error", "unknown error"))})
        total_rows += imported
        details.append({
            "brand_id": bid,
            "email": bu.get("email"),
            "rows_imported": imported,
            "errors": errors[:5],
        })

    return {
        "message": f"Daily Impact sync complete for last {days} day(s). Imported {total_rows} row(s).",
        "days": days,
        "total_rows": total_rows,
        "details": details,
    }

# ==================== BRAND ROUTES ====================

@api_router.post("/brand/profile")
async def create_brand_profile(
    profile_data: BrandProfileCreate,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    existing = await db.brand_profiles.find_one({"user_id": current_user.id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    profile = BrandProfile(user_id=current_user.id, **profile_data.model_dump(exclude_unset=True))
    await db.brand_profiles.insert_one(profile.model_dump())
    return profile

@api_router.get("/brand/profile")
async def get_brand_profile(current_user: UserResponse = Depends(require_role([UserRole.BRAND]))):
    profile = await db.brand_profiles.find_one({"user_id": current_user.id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return BrandProfile(**profile)

@api_router.put("/brand/profile")
async def update_brand_profile(
    profile_data: BrandProfileCreate,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    result = await db.brand_profiles.update_one(
        {"user_id": current_user.id},
        {"$set": profile_data.model_dump(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"message": "Profile updated successfully"}

@api_router.post("/brand/briefs")
async def submit_campaign_brief(
    brief_data: CampaignBriefCreate,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    brief = CampaignBrief(brand_id=current_user.id, **brief_data.model_dump())
    await db.campaign_briefs.insert_one(brief.model_dump())
    return brief

@api_router.get("/brand/briefs")
async def get_brand_briefs(current_user: UserResponse = Depends(require_role([UserRole.BRAND]))):
    briefs = await db.campaign_briefs.find({"brand_id": current_user.id}, {"_id": 0}).to_list(1000)
    return [CampaignBrief(**b) for b in briefs]

@api_router.get("/brand/campaigns")
async def get_brand_campaigns(current_user: UserResponse = Depends(require_role([UserRole.BRAND]))):
    campaigns = await db.campaigns.find({"assigned_brand": current_user.id}, {"_id": 0}).to_list(1000)
    return [Campaign(**c) for c in campaigns]

@api_router.get("/brand/my-publishers")
async def get_brand_publishers(current_user: UserResponse = Depends(require_role([UserRole.BRAND]))):
    """Get all publishers assigned to this brand"""
    # Find campaigns for this brand
    campaigns = await db.campaigns.find(
        {"assigned_brand": current_user.id},
        {"_id": 0}
    ).to_list(1000)
    
    # Get unique publisher IDs from all campaigns
    publisher_ids = []
    for campaign in campaigns:
        publisher_ids.extend(campaign.get("assigned_publishers", []))
    publisher_ids = list(set(publisher_ids))
    
    if not publisher_ids:
        return []
    
    # Get publisher details
    publishers = []
    for pub_id in publisher_ids:
        user = await db.users.find_one({"id": pub_id}, {"_id": 0})
        if user:
            profile = await db.publisher_profiles.find_one({"user_id": pub_id}, {"_id": 0})
            pub_campaigns = [c for c in campaigns if pub_id in c.get("assigned_publishers", [])]
            
            # Count content pieces
            content_count = await db.content_pieces.count_documents({
                "publisher_id": pub_id,
                "brand_id": current_user.id
            })
            
            publishers.append({
                "user": UserResponse(**user),
                "profile": PublisherProfile(**profile) if profile else None,
                "campaigns_count": len(pub_campaigns),
                "active_campaigns": len([c for c in pub_campaigns if c["status"] == "active"]),
                "content_pieces_count": content_count
            })
    
    return publishers

# ==================== BRAND REPORTING ROUTES ====================

@api_router.post("/brand/reports")
async def create_brand_report(
    report_data: BrandReportCreate,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND, UserRole.ADMIN]))
):
    # Verify the brand exists if admin is creating
    if current_user.role == UserRole.ADMIN:
        brand = await db.users.find_one({"id": report_data.brand_id, "role": UserRole.BRAND}, {"_id": 0})
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
    else:
        # If brand is creating their own report
        report_data.brand_id = current_user.id
    
    report = BrandReport(**report_data.model_dump())
    await db.brand_reports.insert_one(report.model_dump())
    return report

@api_router.post("/api-webhook/brand-reports")
async def webhook_create_brand_report(report_data: BrandReportCreate):
    """
    External API webhook endpoint for receiving brand reporting data
    This endpoint doesn't require authentication for external integrations
    """
    # Verify the brand exists
    brand = await db.users.find_one({"id": report_data.brand_id, "role": UserRole.BRAND}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    report = BrandReport(**report_data.model_dump())
    await db.brand_reports.insert_one(report.model_dump())
    return {"message": "Report created successfully", "report_id": report.id}

@api_router.get("/brand/reports")
async def get_brand_reports(
    period: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    query = {"brand_id": current_user.id}
    
    if period:
        query["period"] = period
    
    if start_date and end_date:
        query["report_date"] = {"$gte": start_date, "$lte": end_date}
    
    reports = await db.brand_reports.find(query, {"_id": 0}).sort("report_date", -1).to_list(1000)
    return [BrandReport(**r) for r in reports]

@api_router.get("/brand/reports/summary")
async def get_brand_reports_summary(current_user: UserResponse = Depends(require_role([UserRole.BRAND]))):
    """Get aggregated summary of all reports"""
    reports = await db.brand_reports.find({"brand_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    if not reports:
        return {
            "total_impressions": 0,
            "total_clicks": 0,
            "total_conversions": 0,
            "total_revenue": 0.0,
            "avg_ctr": 0.0,
            "avg_conversion_rate": 0.0,
            "avg_roas": 0.0,
            "report_count": 0
        }
    
    total_impressions = sum(r["metrics"]["impressions"] for r in reports)
    total_clicks = sum(r["metrics"]["clicks"] for r in reports)
    total_conversions = sum(r["metrics"]["conversions"] for r in reports)
    total_revenue = sum(r["metrics"]["revenue"] for r in reports)
    
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    avg_conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    avg_roas = sum(r["metrics"]["roas"] for r in reports) / len(reports) if reports else 0
    
    return {
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "total_revenue": total_revenue,
        "avg_ctr": round(avg_ctr, 2),
        "avg_conversion_rate": round(avg_conversion_rate, 2),
        "avg_roas": round(avg_roas, 2),
        "report_count": len(reports)
    }

@api_router.get("/admin/brand-reports/{brand_id}")
async def get_brand_reports_admin(
    brand_id: str,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Admin can view any brand's reports"""
    reports = await db.brand_reports.find({"brand_id": brand_id}, {"_id": 0}).sort("report_date", -1).to_list(1000)
    return [BrandReport(**r) for r in reports]

def _norm_header_token(value) -> str:
    if value is None:
        return ''
    return str(value).strip().lower().replace(' ', '_').replace('-', '_').lstrip('\ufeff')

def _row_cells_normalized(row) -> List[str]:
    return [_norm_header_token(c) for c in row] if row else []

def _looks_like_data_table_header(norm_cells: List[str]) -> bool:
    """True when row looks like impact.com / affiliate export column headers (not a title row)."""
    non_empty = [c for c in norm_cells if c]
    if len(non_empty) < 3:
        return False
    joined = ' '.join(non_empty)
    has_entity = any(
        x in joined
        for x in ('campaign', 'program', 'advertiser', 'partner', 'publisher', 'campaign_id')
    )
    has_metric = any(
        x in joined
        for x in ('clicks', 'imps', 'impression', 'actions', 'sale_amount', 'revenue', 'conversion')
    )
    return has_entity and has_metric

def _detect_header_row_index(all_rows: List[Any], max_scan: int = 45) -> int:
    for i in range(min(max_scan, len(all_rows))):
        row = all_rows[i]
        if _looks_like_data_table_header(_row_cells_normalized(row)):
            return i
    return 0

def _unique_column_names(raw_headers: List[str]) -> List[str]:
    counts: Dict[str, int] = {}
    out: List[str] = []
    for i, h in enumerate(raw_headers):
        base = (h or '').strip() or f'Column_{i}'
        n = counts.get(base, 0)
        counts[base] = n + 1
        out.append(base if n == 0 else f'{base}_{n}')
    return out

def _sheet_rows_to_dicts(all_rows: List[Any], header_idx: int) -> tuple[List[str], List[Dict[str, Any]]]:
    header_row = all_rows[header_idx]
    raw_headers = [
        str(c).strip() if c is not None else f'Column_{i}'
        for i, c in enumerate(header_row)
    ]
    original_columns = _unique_column_names(raw_headers)
    csv_rows: List[Dict[str, Any]] = []
    for row in all_rows[header_idx + 1:]:
        row_dict: Dict[str, str] = {}
        for i, col in enumerate(original_columns):
            val = row[i] if i < len(row) else None
            row_dict[col] = str(val).strip() if val is not None else ''
        if any(row_dict.values()):
            csv_rows.append(row_dict)
    return original_columns, csv_rows

def parse_spreadsheet(content: bytes, filename: str):
    """Parse CSV or XLS/XLSX file and return columns + rows"""
    ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''

    if ext == 'csv':
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        lines = text.splitlines()
        header_line_idx = 0
        for i, line in enumerate(lines[:50]):
            try:
                parsed = next(csv.reader([line]))
            except StopIteration:
                continue
            if _looks_like_data_table_header(_row_cells_normalized(parsed)):
                header_line_idx = i
                break
        body = '\n'.join(lines[header_line_idx:])
        grid = list(csv.reader(io.StringIO(body)))
        if not grid:
            return [], []
        raw_headers = [(c or '').strip() for c in grid[0]]
        if raw_headers:
            raw_headers[0] = raw_headers[0].lstrip('\ufeff')
        original_columns = _unique_column_names(raw_headers)
        csv_rows = []
        for data_row in grid[1:]:
            row_dict = {}
            for i, col in enumerate(original_columns):
                val = data_row[i] if i < len(data_row) else ''
                row_dict[col] = str(val).strip() if val is not None else ''
            if any(row_dict.values()):
                csv_rows.append(row_dict)

    elif ext in ('xls', 'xlsx'):
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        all_rows = list(ws.iter_rows(values_only=True))
        wb.close()
        if not all_rows:
            return [], []
        header_idx = _detect_header_row_index(all_rows)
        original_columns, csv_rows = _sheet_rows_to_dicts(all_rows, header_idx)
    else:
        return [], []

    return original_columns, csv_rows

def extract_metrics_from_rows(csv_rows):
    """Extract summary metrics from row data"""
    def norm_key(k: str) -> str:
        return k.lower().replace(' ', '_').replace('-', '_').lstrip('\ufeff')

    def get_num(row, keys, default=0):
        for k in keys:
            lk = norm_key(k)
            for rk, rv in row.items():
                if norm_key(rk) == lk and rv not in (None, ''):
                    try:
                        return float(str(rv).replace(',', '').replace('$', '').replace('%', ''))
                    except ValueError:
                        pass
        return default

    total_impressions = 0
    total_clicks = 0
    total_conversions = 0
    total_revenue = 0.0

    for row in csv_rows:
        total_impressions += int(get_num(row, ['impressions', 'impr', 'imps', 'imp', 'views', 'total_impressions']))
        total_clicks += int(get_num(row, ['clicks', 'total_clicks', 'click']))
        total_conversions += int(get_num(row, ['conversions', 'conv', 'actions', 'orders']))
        total_revenue += get_num(row, [
            'revenue', 'total_revenue', 'total_earnings', 'sales', 'earnings', 'amount',
            'sale_amount', 'gross_amount', 'gmv', 'payout', 'partner_earnings',
        ])

    return BrandReportMetrics(
        impressions=total_impressions,
        clicks=total_clicks,
        conversions=total_conversions,
        revenue=round(total_revenue, 2),
        ctr=round(total_clicks / total_impressions * 100, 2) if total_impressions > 0 else 0,
        conversion_rate=round(total_conversions / total_clicks * 100, 2) if total_clicks > 0 else 0,
        cost_per_click=round(total_revenue / total_clicks, 2) if total_clicks > 0 else 0,
        roas=round(total_revenue / (total_revenue * 0.1), 2) if total_revenue > 0 else 0
    )

def _impact_norm_key(k) -> str:
    return str(k).strip().lower().replace(' ', '_').replace('-', '_').lstrip('\ufeff')

def _impact_norm_phrase(v: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(v).lower()).strip()

def _impact_campaign_label(row: Dict[str, Any]) -> str:
    for want in (
        'campaign', 'program', 'program_name', 'advertiser', 'advertiser_name',
        'partner', 'sub_affiliate', 'media_partner',
    ):
        for rk, rv in row.items():
            if _impact_norm_key(rk) == want and str(rv).strip():
                return str(rv).strip()[:500]
    for rk, rv in row.items():
        if 'campaign' in _impact_norm_key(rk) and str(rv).strip():
            return str(rv).strip()[:500]
    return 'Program'

def _impact_row_program_id(row: Dict[str, Any]) -> str:
    for want in ("campaign_id", "program_id", "subaid", "sub_aid"):
        for rk, rv in row.items():
            if _impact_norm_key(rk) == want and str(rv).strip():
                return str(rv).strip()
    return ""

def _impact_row_report_date(row: Dict[str, Any], range_end: str) -> str:
    date_keys = (
        'action_date', 'action_batch_date', 'date', 'report_date', 'day',
        'event_date', 'period_end',
    )
    for dk in date_keys:
        for rk, rv in row.items():
            if _impact_norm_key(rk) != dk:
                continue
            raw = str(rv).strip()
            if not raw:
                continue
            if re.match(r'^\d{4}-\d{2}-\d{2}', raw):
                return raw[:10]
            token = raw.split()[0][:16]
            for fmt in ('%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d', '%d/%m/%Y'):
                try:
                    return datetime.strptime(token, fmt).date().isoformat()
                except ValueError:
                    continue
    return range_end.strip()[:10]

def _brand_aliases(brand_user: Dict[str, Any], profile: Optional[Dict[str, Any]]) -> tuple[List[str], bool]:
    explicit = profile.get("impact_campaign_names") if isinstance(profile, dict) else None
    if isinstance(explicit, list):
        normalized = []
        seen = set()
        for item in explicit:
            n = _impact_norm_phrase(item)
            if n and n not in seen:
                seen.add(n)
                normalized.append(n)
        if normalized:
            # Strict mode: only explicitly mapped campaign names are accepted.
            return normalized, True

    vals = []
    for v in (
        brand_user.get("company_name"),
        brand_user.get("email"),
        (profile or {}).get("company_name"),
    ):
        if not v:
            continue
        s = str(v).strip().lower()
        if s:
            vals.append(s)
            if "@" in s:
                vals.append(s.split("@", 1)[0])
    cleaned = []
    for s in vals:
        s = re.sub(r"[^a-z0-9]+", " ", s).strip()
        if s:
            cleaned.append(s)
    out = []
    seen = set()
    for s in cleaned:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out, False

def _campaign_matches_brand(campaign: str, aliases: List[str], strict_match: bool) -> bool:
    camp = _impact_norm_phrase(campaign)
    if not camp:
        return False
    if strict_match:
        return camp in aliases
    for a in aliases:
        if not a:
            continue
        if a in camp:
            return True
        a_tokens = [t for t in a.split() if len(t) >= 4]
        if any(tok in camp for tok in a_tokens):
            return True
    return False


def _impact_rows_from_json_payload(payload: Any) -> List[Dict[str, Any]]:
    """Normalize likely Impact JSON result shapes into a list of row dicts."""
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]

    if isinstance(payload, dict):
        for key in ("Rows", "rows", "Data", "data", "Records", "records", "Items", "items", "Result", "result"):
            val = payload.get(key)
            if isinstance(val, list):
                return [r for r in val if isinstance(r, dict)]
        for val in payload.values():
            if isinstance(val, list) and val and isinstance(val[0], dict):
                return [r for r in val if isinstance(r, dict)]
        if payload and all(not isinstance(v, (list, dict)) for v in payload.values()):
            return [payload]
    return []

async def _impact_download_legacy_rows(
    brand_id: str,
    start_s: str,
    end_s: str,
    program_sub_id: Optional[str],
    report_handle: Optional[str],
    replace_matching_range: bool,
) -> Dict[str, Any]:
    """
    Fetch Impact ReportExport (JSON), insert one legacy BrandReport per row (dashboard table shape).
    Returns dict: ok, rows, brand_email, report_handle_used, meta | error
    """
    brand = await db.users.find_one({"id": brand_id, "role": "brand"}, {"_id": 0})
    if not brand:
        return {"ok": False, "error": "Brand not found", "rows": 0}

    account_sid = (os.environ.get("IMPACT_ACCOUNT_SID") or "").strip()
    auth_token = (os.environ.get("IMPACT_AUTH_TOKEN") or "").strip()
    if not account_sid or not auth_token:
        return {
            "ok": False,
            "error": "Impact API not configured (IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN).",
            "rows": 0,
            "brand_email": brand.get("email"),
        }

    try:
        start_d = datetime.strptime(start_s.strip(), "%Y-%m-%d").date()
        end_d = datetime.strptime(end_s.strip(), "%Y-%m-%d").date()
    except ValueError:
        return {"ok": False, "error": "start_date and end_date must be YYYY-MM-DD", "rows": 0, "brand_email": brand.get("email")}

    if end_d < start_d:
        return {"ok": False, "error": "end_date must be on or after start_date", "rows": 0, "brand_email": brand.get("email")}

    profile = await db.brand_profiles.find_one({"user_id": brand_id}, {"_id": 0})
    aliases, strict_match = _brand_aliases(brand, profile)
    sub_aid = _resolve_impact_sub_aid(profile, program_sub_id)
    handle_used = _resolve_impact_report_handle(profile, report_handle)

    try:
        raw, meta = await impact_export.export_report(
            account_sid,
            auth_token,
            handle_used,
            sub_aid=sub_aid,
            start_date=start_s.strip(),
            end_date=end_s.strip(),
            result_format="JSON",
        )
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:800] if exc.response else str(exc)
        return {
            "ok": False,
            "error": f"impact.com API error ({exc.response.status_code}): {detail}",
            "rows": 0,
            "brand_email": brand["email"],
        }
    except (TimeoutError, RuntimeError, ValueError) as exc:
        return {"ok": False, "error": str(exc), "rows": 0, "brand_email": brand["email"]}

    fname = meta.get("download_filename") or f"impact_{handle_used}_{start_s}_{end_s}.json"
    rows: List[Dict[str, Any]] = []
    lower_name = fname.lower()
    if lower_name.endswith(".json") or str(meta.get("result_format", "")).upper() == "JSON":
        try:
            payload = json.loads(raw.decode("utf-8"))
            rows = _impact_rows_from_json_payload(payload)
        except Exception:
            rows = []
    if not rows:
        # Fallback for providers that still return CSV despite JSON request
        _, rows = parse_spreadsheet(raw, fname if "." in fname else f"{fname}.csv")

    if not rows:
        return {
            "ok": False,
            "error": "Impact export contained no parseable rows",
            "rows": 0,
            "brand_email": brand["email"],
        }

    if replace_matching_range:
        await db.brand_reports.delete_many({
            "brand_id": brand_id,
            "custom_data.source": "impact_report_export",
            "custom_data.impact_range_start": start_s.strip(),
            "custom_data.impact_range_end": end_s.strip(),
        })

    docs = []
    base_fn = fname.rsplit(".", 1)[0][:120]
    for row in rows:
        camp = _impact_campaign_label(row)
        if aliases and not _campaign_matches_brand(camp, aliases, strict_match):
            continue
        rdate = _impact_row_report_date(row, end_s)
        metrics = extract_metrics_from_rows([row])
        br = BrandReport(
            brand_id=brand_id,
            report_date=rdate,
            period="daily",
            metrics=metrics,
            campaign_breakdown=[{"campaign": camp}],
            custom_data={
                "source": "impact_report_export",
                "impact": meta,
                "impact_range_start": start_s.strip(),
                "impact_range_end": end_s.strip(),
                "impact_report_handle": handle_used,
            },
            csv_columns=[],
            csv_rows=[],
            filename=f"{base_fn} — {camp}"[:220],
        )
        docs.append(br.model_dump())

    if docs:
        await db.brand_reports.insert_many(docs)

    return {
        "ok": True,
        "rows": len(docs),
        "brand_email": brand["email"],
        "report_handle_used": handle_used,
        "meta": meta,
    }

ALLOWED_EXTENSIONS = ('.csv', '.xls', '.xlsx')

@api_router.post("/brand/reports/upload-csv")
async def upload_report(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    """Upload a CSV or XLS/XLSX report file"""
    if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Accepted formats: CSV, XLS, XLSX")

    content = await file.read()
    original_columns, csv_rows = parse_spreadsheet(content, file.filename)

    if not csv_rows:
        raise HTTPException(status_code=400, detail="File is empty or could not be parsed")

    metrics = extract_metrics_from_rows(csv_rows)

    report = BrandReport(
        brand_id=current_user.id,
        report_date=datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        period="daily",
        metrics=metrics,
        campaign_breakdown=[],
        custom_data={"source": "file_upload"},
        csv_columns=original_columns,
        csv_rows=csv_rows,
        filename=file.filename
    )

    await db.brand_reports.insert_one(report.model_dump())

    return {
        "message": f"Successfully imported report: {file.filename} ({len(csv_rows)} rows)",
        "report_id": report.id,
        "filename": file.filename,
        "columns": original_columns,
        "row_count": len(csv_rows)
    }

@api_router.delete("/brand/reports/{report_id}")
async def delete_brand_report(
    report_id: str,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    result = await db.brand_reports.delete_one({"id": report_id, "brand_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted"}

@api_router.delete("/brand/reports")
async def delete_all_brand_reports(
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    result = await db.brand_reports.delete_many({"brand_id": current_user.id})
    return {"message": f"Deleted {result.deleted_count} reports"}

# ==================== CAMPAIGN ROUTES ====================

@api_router.post("/campaigns")
async def create_campaign(
    campaign_data: CampaignCreate,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    # Calculate ROI estimate
    benchmark = await db.roi_benchmarks.find_one({"category": campaign_data.category}, {"_id": 0})
    
    estimated_outcomes = None
    if benchmark:
        total_budget = campaign_data.content_budget + campaign_data.distribution_budget
        estimated_traffic = int(total_budget * benchmark["traffic_multiplier"])
        estimated_clicks = int(estimated_traffic * benchmark["ctr"])
        estimated_orders = int(estimated_clicks * benchmark["cvr"])
        estimated_gmv = estimated_orders * benchmark["aov"]
        estimated_roi = (estimated_gmv - total_budget) / total_budget if total_budget > 0 else 0
        
        estimated_outcomes = EstimatedOutcomes(
            traffic=estimated_traffic,
            clicks=estimated_clicks,
            orders=estimated_orders,
            gmv=estimated_gmv,
            roi=estimated_roi
        )
    
    campaign = Campaign(
        **campaign_data.model_dump(),
        estimated_outcomes=estimated_outcomes
    )
    await db.campaigns.insert_one(campaign.model_dump())
    return campaign

@api_router.get("/campaigns")
async def get_campaigns(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(1000)
    elif current_user.role == UserRole.PUBLISHER:
        campaigns = await db.campaigns.find({"assigned_publishers": current_user.id}, {"_id": 0}).to_list(1000)
    elif current_user.role == UserRole.BRAND:
        campaigns = await db.campaigns.find({"assigned_brand": current_user.id}, {"_id": 0}).to_list(1000)
    else:
        campaigns = []
    
    return [Campaign(**c) for c in campaigns]

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, current_user: UserResponse = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return Campaign(**campaign)

@api_router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    update_data: CampaignUpdate,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign updated successfully"}

@api_router.put("/campaigns/{campaign_id}/assign-publisher")
async def assign_publisher_to_campaign(
    campaign_id: str,
    publisher_email: str,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Assign a publisher to a campaign using their email"""
    # Find publisher by email
    publisher = await db.users.find_one({"email": publisher_email, "role": UserRole.PUBLISHER}, {"_id": 0})
    if not publisher:
        raise HTTPException(status_code=404, detail=f"Publisher with email {publisher_email} not found")
    
    # Add publisher to campaign's assigned_publishers
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$addToSet": {"assigned_publishers": publisher["id"]}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {
        "message": f"Publisher {publisher_email} assigned to campaign",
        "publisher_id": publisher["id"],
        "publisher_email": publisher["email"]
    }

@api_router.put("/campaigns/{campaign_id}/remove-publisher")
async def remove_publisher_from_campaign(
    campaign_id: str,
    publisher_email: str,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Remove a publisher from a campaign using their email"""
    # Find publisher by email
    publisher = await db.users.find_one({"email": publisher_email, "role": UserRole.PUBLISHER}, {"_id": 0})
    if not publisher:
        raise HTTPException(status_code=404, detail=f"Publisher with email {publisher_email} not found")
    
    # Remove publisher from campaign's assigned_publishers
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$pull": {"assigned_publishers": publisher["id"]}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": f"Publisher {publisher_email} removed from campaign"}

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted successfully"}

# ==================== ROI BENCHMARK ROUTES ====================

@api_router.post("/roi-benchmarks")
async def create_benchmark(
    benchmark_data: ROIBenchmarkCreate,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    # Check if benchmark for category exists
    existing = await db.roi_benchmarks.find_one({"category": benchmark_data.category}, {"_id": 0})
    if existing:
        # Update existing
        await db.roi_benchmarks.update_one(
            {"category": benchmark_data.category},
            {"$set": {**benchmark_data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Benchmark updated successfully"}
    
    benchmark = ROIBenchmark(**benchmark_data.model_dump())
    await db.roi_benchmarks.insert_one(benchmark.model_dump())
    return benchmark

@api_router.get("/roi-benchmarks")
async def get_benchmarks(current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))):
    benchmarks = await db.roi_benchmarks.find({}, {"_id": 0}).to_list(1000)
    return [ROIBenchmark(**b) for b in benchmarks]

@api_router.get("/roi-benchmarks/{category}")
async def get_benchmark_by_category(
    category: str,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    benchmark = await db.roi_benchmarks.find_one({"category": category}, {"_id": 0})
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return ROIBenchmark(**benchmark)

# ==================== SETTLEMENT ROUTES ====================

@api_router.post("/settlements")
async def create_settlement(
    settlement_data: SettlementCreate,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    settlement = Settlement(**settlement_data.model_dump())
    await db.settlements.insert_one(settlement.model_dump())
    return settlement

@api_router.get("/settlements")
async def get_settlements(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        settlements = await db.settlements.find({}, {"_id": 0}).to_list(1000)
    elif current_user.role == UserRole.PUBLISHER:
        settlements = await db.settlements.find({"publisher_id": current_user.id}, {"_id": 0}).to_list(1000)
    else:
        settlements = []
    
    return [Settlement(**s) for s in settlements]

@api_router.put("/settlements/{settlement_id}")
async def update_settlement(
    settlement_id: str,
    update_data: SettlementUpdate,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    result = await db.settlements.update_one(
        {"id": settlement_id},
        {"$set": {**update_data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return {"message": "Settlement updated successfully"}

# ==================== CONTENT TRACKING ROUTES ====================

@api_router.post("/content-pieces")
async def create_content_piece(
    content_data: ContentPieceCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a content piece - accessible by publisher, brand, or admin"""
    content = ContentPiece(**content_data.model_dump())
    await db.content_pieces.insert_one(content.model_dump())
    return content

@api_router.get("/brand/publishers/{publisher_id}/content")
async def get_publisher_content_for_brand(
    publisher_id: str,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    """Get all content pieces from a publisher about this brand"""
    content_pieces = await db.content_pieces.find({
        "publisher_id": publisher_id,
        "brand_id": current_user.id
    }, {"_id": 0}).sort("published_date", -1).to_list(1000)
    
    return [ContentPiece(**c) for c in content_pieces]

@api_router.get("/admin/content-pieces")
async def get_all_content_pieces(
    publisher_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))
):
    """Admin can view all content pieces with optional filters"""
    query = {}
    if publisher_id:
        query["publisher_id"] = publisher_id
    if brand_id:
        query["brand_id"] = brand_id
    
    content_pieces = await db.content_pieces.find(query, {"_id": 0}).sort("published_date", -1).to_list(1000)
    return [ContentPiece(**c) for c in content_pieces]

@api_router.get("/admin/publishers-list")
async def get_publishers_list(current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))):
    """Get list of all publishers with their profiles"""
    publishers = await db.users.find({"role": UserRole.PUBLISHER}, {"_id": 0}).to_list(1000)
    result = []
    for pub in publishers:
        profile = await db.publisher_profiles.find_one({"user_id": pub["id"]}, {"_id": 0})
        campaigns_count = await db.campaigns.count_documents({"assigned_publishers": pub["id"]})
        result.append({
            "user": UserResponse(**pub),
            "profile": PublisherProfile(**profile) if profile else None,
            "campaigns_count": campaigns_count
        })
    return result

@api_router.get("/admin/brands-list")
async def get_brands_list(current_user: UserResponse = Depends(require_role([UserRole.ADMIN]))):
    """Get list of all brands with their profiles"""
    brands = await db.users.find({"role": UserRole.BRAND}, {"_id": 0}).to_list(1000)
    result = []
    for brand in brands:
        profile = await db.brand_profiles.find_one({"user_id": brand["id"]}, {"_id": 0})
        campaigns_count = await db.campaigns.count_documents({"assigned_brand": brand["id"]})
        result.append({
            "user": UserResponse(**brand),
            "profile": BrandProfile(**profile) if profile else None,
            "campaigns_count": campaigns_count
        })
    return result

# ==================== SEED DATA ROUTE ====================

@api_router.post("/seed-admin")
async def seed_admin():
    # Check if admin exists
    existing = await db.users.find_one({"email": "admin@tmoe.com"}, {"_id": 0})
    if existing:
        return {"message": "Admin already exists"}
    
    # Create admin user
    password_hash = hash_password("Admin@123")
    admin_user = User(
        email="admin@tmoe.com",
        password_hash=password_hash,
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        company_name="TMOE Operations"
    )
    
    await db.users.insert_one(admin_user.model_dump())
    
    # Seed some default benchmarks
    default_benchmarks = [
        {"category": "Technology", "cvr": 0.02, "aov": 150.0, "traffic_multiplier": 10, "ctr": 0.05},
        {"category": "Fashion", "cvr": 0.03, "aov": 80.0, "traffic_multiplier": 12, "ctr": 0.06},
        {"category": "Food & Beverage", "cvr": 0.025, "aov": 50.0, "traffic_multiplier": 15, "ctr": 0.07},
        {"category": "Health & Wellness", "cvr": 0.035, "aov": 120.0, "traffic_multiplier": 8, "ctr": 0.055},
        {"category": "Home & Garden", "cvr": 0.028, "aov": 100.0, "traffic_multiplier": 10, "ctr": 0.05},
    ]
    
    for benchmark_data in default_benchmarks:
        benchmark = ROIBenchmark(**benchmark_data)
        await db.roi_benchmarks.insert_one(benchmark.model_dump())
    
    return {"message": "Admin user and default benchmarks created successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_seed():
    """Seed essential data on startup if not already present."""
    try:
        # Repair legacy seeded users that may exist without password_hash.
        for email, plain_password in SEED_ACCOUNT_PASSWORDS.items():
            doc = await db.users.find_one({"email": email}, {"_id": 0})
            if doc and not doc.get("password_hash"):
                await db.users.update_one(
                    {"id": doc.get("id")},
                    {"$set": {"password_hash": hash_password(plain_password)}}
                )
                logger.info("Repaired missing password hash for %s", email)

        # 1. Seed Admin
        if not await db.users.find_one({"email": "admin@tmoe.com"}):
            admin_user = User(
                email="admin@tmoe.com",
                password_hash=hash_password("Admin@123"),
                role=UserRole.ADMIN,
                status=UserStatus.APPROVED,
                company_name="TMOE Operations"
            )
            await db.users.insert_one(admin_user.model_dump())
            logger.info("Seeded admin user")

        # 2. Seed Publisher (abhishek@marvelof.com)
        pub_doc = await db.users.find_one({"email": "abhishek@marvelof.com"}, {"_id": 0})
        if not pub_doc:
            pub_user = User(
                email="abhishek@marvelof.com",
                password_hash=hash_password("Publisher@123"),
                role=UserRole.PUBLISHER,
                status=UserStatus.APPROVED,
                company_name="Marvel of Everything",
                website="https://marvelof.com"
            )
            await db.users.insert_one(pub_user.model_dump())
            pub_doc = pub_user.model_dump()
            logger.info("Seeded publisher abhishek@marvelof.com")

        pub_id = pub_doc["id"]

        # 3. Seed Publisher Profile
        if not await db.publisher_profiles.find_one({"user_id": pub_id}):
            profile = PublisherProfile(
                user_id=pub_id,
                name="Marvel of Everything",
                website="https://marvelof.com",
                logo_url="https://images.assettype.com/marvelof/2025-11-06/t2lv7eab/MarvelofLogo256x256.png?w=50&fm=png",
                categories=["Technology", "Fashion", "Food", "Home & Living"],
                description="Your Go-To Guide for Informed Decisions across tech, fashion, lifestyle & food.",
                monthly_sessions=500000,
                monthly_pageviews=2000000,
                rss_feed_url="https://marvelof.com/feed"
            )
            await db.publisher_profiles.insert_one(profile.model_dump())
            logger.info("Seeded publisher profile for Marvel of Everything")

        # 4. Seed Brand (amazontmoe@marvelof.com)
        brand_doc = await db.users.find_one({"email": "amazontmoe@marvelof.com"}, {"_id": 0})
        if not brand_doc:
            brand_user = User(
                email="amazontmoe@marvelof.com",
                password_hash=hash_password("Amazon@123"),
                role=UserRole.BRAND,
                status=UserStatus.APPROVED,
                company_name="Amazon TMOE",
                website="https://amazon.in"
            )
            await db.users.insert_one(brand_user.model_dump())
            brand_doc = brand_user.model_dump()
            logger.info("Seeded brand amazontmoe@marvelof.com")

        brand_id = brand_doc["id"]

        # 5. Seed Campaign linking brand and publisher
        if not await db.campaigns.find_one({"assigned_brand": brand_id, "assigned_publishers": pub_id}):
            campaign = Campaign(
                name="Amazon TMOE x Marvel of Everything",
                category="Technology",
                target_markets=["India"],
                assigned_publishers=[pub_id],
                assigned_brand=brand_id,
                content_type="Product Reviews & Guides",
                content_budget=25000.0,
                distribution_budget=25000.0,
                commerce_links=["https://amazon.in"],
                status=CampaignStatus.ACTIVE,
                start_date="2026-03-01",
                end_date="2026-06-30"
            )
            await db.campaigns.insert_one(campaign.model_dump())
            logger.info("Seeded campaign: Amazon TMOE x Marvel of Everything")

        # 4b. Seed Skyscanner Brand
        sky_doc = await db.users.find_one({"email": "skyscanner@gmail.com"}, {"_id": 0})
        if not sky_doc:
            sky_user = User(
                email="skyscanner@gmail.com",
                password_hash=hash_password("Skyscanner@123"),
                role=UserRole.BRAND,
                status=UserStatus.APPROVED,
                company_name="Skyscanner",
                website="https://skyscanner.com"
            )
            await db.users.insert_one(sky_user.model_dump())
            sky_doc = sky_user.model_dump()
            logger.info("Seeded brand skyscanner@gmail.com")

        sky_id = sky_doc["id"]

        # 5b. Seed Campaign linking Skyscanner and publisher
        if not await db.campaigns.find_one({"assigned_brand": sky_id, "assigned_publishers": pub_id}):
            sky_campaign = Campaign(
                name="Skyscanner x Marvel of Everything",
                category="Travel",
                target_markets=["India", "Global"],
                assigned_publishers=[pub_id],
                assigned_brand=sky_id,
                content_type="Travel Guides & Deals",
                content_budget=30000.0,
                distribution_budget=20000.0,
                commerce_links=["https://skyscanner.com"],
                status=CampaignStatus.ACTIVE,
                start_date="2026-03-01",
                end_date="2026-06-30"
            )
            await db.campaigns.insert_one(sky_campaign.model_dump())
            logger.info("Seeded campaign: Skyscanner x Marvel of Everything")

        # 6. Seed Amazon-related articles from marvelof.com
        existing_count = await db.content_pieces.count_documents({"brand_id": brand_id, "publisher_id": pub_id})
        if existing_count == 0:
            articles = [
                ContentPiece(
                    title="Smart TV To Surround Sound System: 5 Essential Items For The Ultimate Home Theatre Experience",
                    url="https://marvelof.com/gadgets/smart-tv-to-surround-sound-system-5-essential-items-for-the-ultimate-home-theatre-experience",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-04-06T05:45:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-04-02%2Fplg3h9t4%2FUntitled-design-2026-04-02T101439.931.jpg?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="Puja Menon",
                    description="From a high-quality display to immersive sound systems, here are five must-have items to set up a perfect home theatre experience."
                ),
                ContentPiece(
                    title="OPPO F33 Pro 5G Key Details Leaked: Here's Everything You Need to Know",
                    url="https://marvelof.com/gadgets/oppo-f33-pro-5g-india-launch-date-price-range-specs-leaked-online",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-04-06T04:30:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-04-06%2Fhewalr06%2FOPPO-F33-Pro-5G.jpg?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="TMOE Desk",
                    description="OPPO F33 Pro 5G expected to debut in India soon with bigger battery, IP69K rating, and slight price hike."
                ),
                ContentPiece(
                    title="Samsung Galaxy S26 vs iPhone 16 vs Pixel 9 Pro: Which Is Best In 2026?",
                    url="https://marvelof.com/gadgets/samsung-galaxy-s26-vs-iphone-16-vs-pixel-9-pro-which-is-best-in-2026",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-04-05T10:00:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-04-05%2Fvrkyhtv8%2FGalaxy-S26-iPhone-16-Or-Pixel-9-Pro?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="Naveen Kumar",
                    description="Galaxy S26, iPhone 16, or Pixel 9 Pro - find out which flagship wins in 2026."
                ),
                ContentPiece(
                    title="Best Camera Phones Under Rs 50,000 In 2026",
                    url="https://marvelof.com/gadgets/best-camera-phones-under-50000-in-2026",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-04-05T08:30:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-04-05%2Fu9l0kq7e%2Fbest-phone-camera?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="TMOE Desk",
                    description="From Vivo to Pixel, find the perfect camera phone for your budget."
                ),
                ContentPiece(
                    title="5 Signs It's Time To Upgrade Your Smartphone",
                    url="https://marvelof.com/gadgets/5-signs-its-time-to-upgrade-your-smartphone",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-04-05T06:15:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-04-05%2Fd8gnkir7%2FChange-Smartphone?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="Naveen Kumar",
                    description="From battery drain to lag, here's how to know your phone needs replacing."
                ),
                ContentPiece(
                    title="Get Salon-Like Treatment At Home With These Nourishing Hair Masks Under Rs 1,000",
                    url="https://marvelof.com/fashion/get-salon-like-treatment-at-home-with-these-nourishing-hair-masks-under-rs-1000",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-04-02T11:30:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-04-02%2F26n06p6a%2FUntitled-design-2026-04-02T164842.095.jpg?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="Puja Menon",
                    description="Struggling with dull and damaged hair? Here are some effective and budget-friendly hair masks you can try."
                ),
                ContentPiece(
                    title="Struggling With Dry Hands? Try These Nourishing Hand Creams",
                    url="https://marvelof.com/fashion/struggling-with-dry-hands-try-these-nourishing-hand-creams",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-04-02T09:00:00+00:00",
                    image_url="",
                    source="marvelof.com", author="TMOE Desk",
                    description="Keep your hands soft and moisturized with these nourishing hand creams available on Amazon."
                ),
                ContentPiece(
                    title="Smart TVs Under Rs 70,000: Enjoy Cinema-Like Experience At Home",
                    url="https://marvelof.com/gadgets/smart-tvs-under-rs-70000-enjoy-cinema-like-experience-at-home",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-03-23T10:00:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-03-19%2F6jomdog4%2FUntitled-design-2026-03-19T181238.102.jpg?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="Puja Menon",
                    description="Explore smart TVs under Rs 70,000 on Amazon and upgrade your home entertainment setup."
                ),
                ContentPiece(
                    title="Best Wired Earphones Under Rs 600 on Amazon",
                    url="https://marvelof.com/gadgets/best-wired-earphones-for-clear-sound-and-everyday-use-on-amazon",
                    publisher_id=pub_id, brand_id=brand_id,
                    published_date="2026-03-19T08:00:00+00:00",
                    image_url="https://media.assettype.com/marvelof%2F2026-03-19%2F1iuqmnlm%2Fwired-earphones.jpg?w=480&auto=format%2Ccompress&fit=max",
                    source="marvelof.com", author="TMOE Desk",
                    description="Take a look at wired earphones priced under Rs 600 available on Amazon."
                ),
            ]
            await db.content_pieces.insert_many([a.model_dump() for a in articles])
            logger.info(f"Seeded {len(articles)} Amazon articles from marvelof.com")

        # 7. Seed default benchmarks
        if await db.roi_benchmarks.count_documents({}) == 0:
            benchmarks = [
                {"category": "Technology", "cvr": 0.02, "aov": 150.0, "traffic_multiplier": 10, "ctr": 0.05},
                {"category": "Fashion", "cvr": 0.03, "aov": 80.0, "traffic_multiplier": 12, "ctr": 0.06},
                {"category": "Food & Beverage", "cvr": 0.025, "aov": 50.0, "traffic_multiplier": 15, "ctr": 0.07},
                {"category": "Health & Wellness", "cvr": 0.035, "aov": 120.0, "traffic_multiplier": 8, "ctr": 0.055},
                {"category": "Home & Garden", "cvr": 0.028, "aov": 100.0, "traffic_multiplier": 10, "ctr": 0.05},
            ]
            for b in benchmarks:
                await db.roi_benchmarks.insert_one(ROIBenchmark(**b).model_dump())
            logger.info("Seeded default ROI benchmarks")

        # 8. Seed sample report data for Amazon TMOE brand
        existing_reports = await db.brand_reports.count_documents({"brand_id": brand_id})
        if existing_reports == 0:
            import random
            sample_reports = []
            base_date = datetime(2026, 3, 1, tzinfo=timezone.utc)
            campaigns = ["Amazon Gadgets", "Amazon Fashion", "Amazon Home"]
            for i in range(30):
                day = base_date + timedelta(days=i)
                camp = campaigns[i % 3]
                impr = random.randint(8000, 25000)
                clicks = random.randint(int(impr * 0.03), int(impr * 0.08))
                convs = random.randint(int(clicks * 0.04), int(clicks * 0.12))
                rev = round(convs * random.uniform(80, 200), 2)
                ctr = round(clicks / impr * 100, 2)
                conv_rate = round(convs / clicks * 100, 2) if clicks > 0 else 0
                roas = round(rev / (rev * 0.1), 2) if rev > 0 else 0
                report = BrandReport(
                    brand_id=brand_id,
                    report_date=day.strftime('%Y-%m-%d'),
                    period="daily",
                    metrics=BrandReportMetrics(
                        impressions=impr, clicks=clicks, conversions=convs,
                        revenue=rev, ctr=ctr, conversion_rate=conv_rate,
                        cost_per_click=round(rev / clicks, 2) if clicks > 0 else 0, roas=roas
                    ),
                    campaign_breakdown=[{"campaign": camp}],
                    custom_data={"source": "seed"}
                )
                sample_reports.append(report.model_dump())
            await db.brand_reports.insert_many(sample_reports)
            logger.info(f"Seeded {len(sample_reports)} sample reports for Amazon TMOE")

        logger.info("Startup seed complete")
    except Exception as e:
        logger.error(f"Startup seed error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
