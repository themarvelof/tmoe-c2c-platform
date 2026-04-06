from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

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
    password: str
    role: str
    company_name: Optional[str] = None
    website: Optional[str] = None

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
    categories: List[str]
    description: str
    monthly_sessions: int
    monthly_pageviews: int
    content_slots: List[ContentSlot] = []
    payment_details: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PublisherProfileCreate(BaseModel):
    name: str
    website: str
    categories: List[str]
    description: str
    monthly_sessions: int
    monthly_pageviews: int
    payment_details: Optional[Dict[str, Any]] = None

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
    industry: str
    description: str
    target_categories: List[str]
    target_markets: List[str]
    commerce_links: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BrandProfileCreate(BaseModel):
    company_name: str
    website: str
    industry: str
    description: str
    target_categories: List[str]
    target_markets: List[str]
    commerce_links: List[str] = []

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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BrandReportCreate(BaseModel):
    brand_id: str
    report_date: str
    period: str
    metrics: BrandReportMetrics
    campaign_breakdown: Optional[List[Dict[str, Any]]] = []
    custom_data: Optional[Dict[str, Any]] = {}

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

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = pwd_context.hash(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        company_name=user_data.company_name,
        website=user_data.website
    )
    
    await db.users.insert_one(user.model_dump())
    
    return {
        "message": "Registration successful. Awaiting admin approval.",
        "user": UserResponse(**user.model_dump())
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["status"] == UserStatus.PENDING:
        raise HTTPException(status_code=403, detail="Account pending admin approval")
    
    if user["status"] in [UserStatus.REJECTED, UserStatus.SUSPENDED]:
        raise HTTPException(status_code=403, detail=f"Account {user['status']}")
    
    token = create_access_token({"user_id": user["id"], "role": user["role"]})
    
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
    password_hash = pwd_context.hash(user_data.password)
    
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

# ==================== BRAND ROUTES ====================

@api_router.post("/brand/profile")
async def create_brand_profile(
    profile_data: BrandProfileCreate,
    current_user: UserResponse = Depends(require_role([UserRole.BRAND]))
):
    existing = await db.brand_profiles.find_one({"user_id": current_user.id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    profile = BrandProfile(user_id=current_user.id, **profile_data.model_dump())
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
        {"$set": profile_data.model_dump()}
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

# ==================== SEED DATA ROUTE ====================

@api_router.post("/seed-admin")
async def seed_admin():
    # Check if admin exists
    existing = await db.users.find_one({"email": "admin@tmoe.com"}, {"_id": 0})
    if existing:
        return {"message": "Admin already exists"}
    
    # Create admin user
    password_hash = pwd_context.hash("Admin@123")
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
