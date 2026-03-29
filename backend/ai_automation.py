"""
Phase 10: AI & Automation Layer
Amazon FBA SaaS Platform - AI-powered tools, competitor monitoring, and automation rules
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import re
import json

from auth import get_current_user
from database import get_db, Base, engine
from models import User

router = APIRouter(prefix="/ai-tools", tags=["AI Tools"])

# ==================== DATABASE MODELS ====================

class ListingOptimization(Base):
    """Listing optimization tracking and history"""
    __tablename__ = "listing_optimizations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    client_id = Column(Integer, nullable=False, index=True)
    asin = Column(String, nullable=False, index=True)
    original_title = Column(String, nullable=False)
    optimized_title = Column(String, nullable=True)
    original_bullets = Column(JSON, nullable=False)  # List of 5 bullet points
    optimized_bullets = Column(JSON, nullable=True)
    original_backend_keywords = Column(String, nullable=False)
    optimized_backend_keywords = Column(String, nullable=True)
    keyword_score_before = Column(Float, default=0.0)
    keyword_score_after = Column(Float, default=0.0)
    optimization_status = Column(String, default="pending")  # pending, generated, reviewed, applied
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompetitorWatch(Base):
    """Competitor monitoring and price tracking"""
    __tablename__ = "competitor_watches"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    client_id = Column(Integer, nullable=False, index=True)
    our_asin = Column(String, nullable=False, index=True)
    competitor_asin = Column(String, nullable=False, index=True)
    competitor_brand = Column(String, nullable=False)
    competitor_price = Column(Float, nullable=False)
    our_price = Column(Float, nullable=False)
    price_diff_pct = Column(Float, default=0.0)
    competitor_rating = Column(Float, default=0.0)
    competitor_reviews = Column(Integer, default=0)
    competitor_bsr = Column(Integer, nullable=True)
    alert_type = Column(String, nullable=True)  # price_drop, new_competitor, review_surge, bsr_change, out_of_stock
    is_active = Column(Boolean, default=True)
    last_checked = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIInsight(Base):
    """AI-generated insights and recommendations"""
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    client_id = Column(Integer, nullable=False, index=True)
    insight_type = Column(String, nullable=False)  # ppc_optimization, inventory_alert, price_suggestion, listing_improvement, competitor_threat, growth_opportunity
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    impact_level = Column(String, default="medium")  # low, medium, high, critical
    recommended_action = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    is_acted = Column(Boolean, default=False)
    data = Column(JSON, default={})  # Additional context data
    created_at = Column(DateTime, default=datetime.utcnow)


class AutomationRule(Base):
    """Automation rules for scheduled actions and alerts"""
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    trigger_type = Column(String, nullable=False)  # schedule, threshold, event
    trigger_config = Column(JSON, nullable=False)  # Stores cron, threshold values, etc.
    action_type = Column(String, nullable=False)  # alert, report, email, task_create
    action_config = Column(JSON, nullable=False)  # Stores action details
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class NLQuery(Base):
    """Natural language query history"""
    __tablename__ = "nl_queries"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query_text = Column(String, nullable=False)
    parsed_intent = Column(String, nullable=True)  # ppc_analysis, inventory_check, competitor_watch, etc.
    parsed_filters = Column(JSON, nullable=True)
    result_summary = Column(String, nullable=True)
    result_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# Create tables
Base.metadata.create_all(bind=engine)

# ==================== PYDANTIC SCHEMAS ====================

class ListingOptimizationRequest(BaseModel):
    client_id: int
    asin: str
    title: str
    bullets: list[str]
    backend_keywords: str


class ListingOptimizationResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    asin: str
    original_title: str
    optimized_title: str | None
    original_bullets: list
    optimized_bullets: list | None
    keyword_score_before: float
    keyword_score_after: float
    optimization_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CompetitorWatchRequest(BaseModel):
    client_id: int
    our_asin: str
    competitor_asin: str
    competitor_brand: str
    competitor_price: float
    our_price: float


class CompetitorWatchResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    our_asin: str
    competitor_asin: str
    competitor_brand: str
    competitor_price: float
    our_price: float
    price_diff_pct: float
    competitor_rating: float
    competitor_reviews: int
    competitor_bsr: int | None
    alert_type: str | None
    is_active: bool
    last_checked: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AIInsightResponse(BaseModel):
    id: int
    org_id: int
    client_id: int
    insight_type: str
    title: str
    description: str
    impact_level: str
    recommended_action: str
    is_read: bool
    is_acted: bool
    data: dict
    created_at: datetime

    class Config:
        from_attributes = True


class AutomationRuleRequest(BaseModel):
    name: str
    description: str
    trigger_type: str  # schedule, threshold, event
    trigger_config: dict
    action_type: str  # alert, report, email, task_create
    action_config: dict


class AutomationRuleResponse(BaseModel):
    id: int
    org_id: int
    name: str
    description: str
    trigger_type: str
    trigger_config: dict
    action_type: str
    action_config: dict
    is_active: bool
    last_triggered: datetime | None
    trigger_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class NLQueryRequest(BaseModel):
    query_text: str


# ==================== LISTING OPTIMIZATION LOGIC ====================

def calculate_keyword_score(text: str) -> float:
    """
    Calculate keyword score based on length, structure, and keyword density.
    Score 0-100: higher is better for optimization.
    """
    if not text or len(text.strip()) == 0:
        return 0.0

    words = text.lower().split()
    word_count = len(words)

    # Optimal: 20-40 words for backend keywords
    length_score = min(100, (word_count / 30) * 100) if word_count > 0 else 0

    # Check for duplicates (bad)
    unique_words = len(set(words))
    dedup_score = (unique_words / word_count * 100) if word_count > 0 else 0

    # Combined score
    return (length_score * 0.5 + dedup_score * 0.5)


def optimize_listing(title: str, bullets: list[str], backend_keywords: str) -> dict:
    """
    Rule-based listing optimization.
    Returns optimized versions with before/after scores.
    """
    # TODO: Replace with AI API call to Claude/OpenAI for advanced optimization

    score_before = calculate_keyword_score(backend_keywords)

    # Title optimization: ensure it's 60-120 chars, includes keyword
    optimized_title = title
    if len(title) < 60:
        optimized_title = title + " - Premium Quality"
    elif len(title) > 120:
        optimized_title = title[:120].rsplit(' ', 1)[0]

    # Bullet optimization: ensure 5 bullets, no excessive length
    optimized_bullets = []
    for bullet in bullets:
        if len(bullet) > 200:
            optimized_bullets.append(bullet[:200])
        else:
            optimized_bullets.append(bullet)

    # Ensure 5 bullets
    while len(optimized_bullets) < 5:
        optimized_bullets.append("Premium quality product")
    optimized_bullets = optimized_bullets[:5]

    # Backend keywords optimization: remove duplicates, normalize spacing
    keywords_list = [k.strip().lower() for k in backend_keywords.split(",")]
    keywords_list = list(dict.fromkeys(keywords_list))  # Remove duplicates
    optimized_keywords = ", ".join(keywords_list)

    score_after = calculate_keyword_score(optimized_keywords)

    return {
        "optimized_title": optimized_title,
        "optimized_bullets": optimized_bullets,
        "optimized_backend_keywords": optimized_keywords,
        "score_before": score_before,
        "score_after": score_after
    }


# ==================== COMPETITOR MONITORING LOGIC ====================

def generate_competitor_alerts(watch: CompetitorWatch) -> str | None:
    """
    Analyze competitor metrics and generate alert if significant change detected.
    """
    # Price drop alert: >5% decrease
    if watch.price_diff_pct < -5:
        return "price_drop"

    # Review surge: check if reviews exceed baseline (simple heuristic: >100)
    if watch.competitor_reviews > 100 and watch.competitor_rating >= 4.5:
        return "review_surge"

    # BSR change: if rank improved (lower number)
    if watch.competitor_bsr and watch.competitor_bsr < 1000:
        return "bsr_change"

    # Out of stock flag (if competitor data unavailable)
    if watch.competitor_price <= 0:
        return "out_of_stock"

    return None


def update_price_diff(watch: CompetitorWatch):
    """Calculate price difference percentage"""
    if watch.our_price > 0:
        watch.price_diff_pct = ((watch.competitor_price - watch.our_price) / watch.our_price) * 100
    else:
        watch.price_diff_pct = 0.0


# ==================== AI INSIGHT GENERATION LOGIC ====================

def generate_insights_for_client(org_id: int, client_id: int, db: Session) -> list[AIInsight]:
    """
    Generate AI insights based on client data and heuristics.
    TODO: Integrate with actual analytics data from metrics/ppc tables.
    """
    insights = []

    # Heuristic 1: High ACoS detection (if we had PPC data)
    acos_threshold = 30
    # If high ACoS detected, suggest PPC optimization
    insight = AIInsight(
        org_id=org_id,
        client_id=client_id,
        insight_type="ppc_optimization",
        title="PPC Campaign Optimization Needed",
        description=f"Detected campaigns with ACoS above {acos_threshold}%. Consider pausing underperforming keywords.",
        impact_level="high",
        recommended_action="Review PPC campaign settings and pause keywords with ACOS > 40%.",
        data={"threshold": acos_threshold, "suggestion_type": "keyword_pause"}
    )
    insights.append(insight)

    # Heuristic 2: Low inventory alert
    insight = AIInsight(
        org_id=org_id,
        client_id=client_id,
        insight_type="inventory_alert",
        title="Low Inventory Warning",
        description="Some products have inventory below 2 weeks of sales velocity.",
        impact_level="critical",
        recommended_action="Reorder inventory immediately to avoid stockouts.",
        data={"days_until_stockout": 14}
    )
    insights.append(insight)

    # Heuristic 3: Price optimization opportunity
    insight = AIInsight(
        org_id=org_id,
        client_id=client_id,
        insight_type="price_suggestion",
        title="Competitive Price Adjustment",
        description="Competitors are underpricing similar products by 8-12%.",
        impact_level="medium",
        recommended_action="Consider a 5-8% price reduction to remain competitive.",
        data={"avg_competitor_price": 29.99, "our_price": 34.99, "suggested_price": 32.00}
    )
    insights.append(insight)

    # Heuristic 4: Listing improvement
    insight = AIInsight(
        org_id=org_id,
        client_id=client_id,
        insight_type="listing_improvement",
        title="Title & Bullets Optimization",
        description="Listing lacks high-volume search keywords. Optimization could boost visibility.",
        impact_level="high",
        recommended_action="Use AI Listing Optimizer to improve SEO keywords.",
        data={"current_score": 65, "potential_score": 88}
    )
    insights.append(insight)

    # Heuristic 5: Growth opportunity
    insight = AIInsight(
        org_id=org_id,
        client_id=client_id,
        insight_type="growth_opportunity",
        title="Untapped Category Opportunity",
        description="Related categories show 40% higher margins with similar demand.",
        impact_level="medium",
        recommended_action="Explore launching complementary products in related categories.",
        data={"category": "Accessories", "demand_increase": 0.40, "margin_increase": 0.35}
    )
    insights.append(insight)

    return insights


# ==================== NATURAL LANGUAGE QUERY PARSER ====================

def parse_natural_language_query(query_text: str) -> dict:
    """
    Simple keyword-based NL parser. Detects intent and extracts filters.
    TODO: Replace with Claude/OpenAI API call for advanced NLP.
    """
    query_lower = query_text.lower()

    # Intent detection via keywords
    intent = "general"
    filters = {}

    if any(word in query_lower for word in ["acos", "ppc", "campaign", "spend"]):
        intent = "ppc_analysis"
        # Try to extract ACoS threshold
        acos_match = re.search(r'acos\s*[><=]*\s*(\d+)', query_lower)
        if acos_match:
            filters["acos_threshold"] = int(acos_match.group(1))

    elif any(word in query_lower for word in ["inventory", "stock", "quantity"]):
        intent = "inventory_check"
        filters["low_stock"] = True

    elif any(word in query_lower for word in ["competitor", "price", "rating"]):
        intent = "competitor_watch"
        filters["monitor_active"] = True

    elif any(word in query_lower for word in ["keyword", "bsr", "rank", "ranking"]):
        intent = "ranking_analysis"
        filters["metric"] = "bsr"

    elif any(word in query_lower for word in ["client", "account", "listing"]):
        intent = "client_overview"

    return {
        "intent": intent,
        "filters": filters,
        "summary": f"Parsed as {intent} query with filters: {filters}"
    }


# ==================== API ENDPOINTS ====================

@router.post("/optimize-listing", response_model=ListingOptimizationResponse)
async def submit_listing_optimization(
    request: ListingOptimizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit ASIN for listing optimization"""

    # Run optimization logic
    opt_result = optimize_listing(request.title, request.bullets, request.backend_keywords)

    # Save to database
    optimization = ListingOptimization(
        org_id=current_user.org_id,
        client_id=request.client_id,
        asin=request.asin,
        original_title=request.title,
        optimized_title=opt_result["optimized_title"],
        original_bullets=request.bullets,
        optimized_bullets=opt_result["optimized_bullets"],
        original_backend_keywords=request.backend_keywords,
        optimized_backend_keywords=opt_result["optimized_backend_keywords"],
        keyword_score_before=opt_result["score_before"],
        keyword_score_after=opt_result["score_after"],
        optimization_status="generated"
    )

    db.add(optimization)
    db.commit()
    db.refresh(optimization)

    return optimization


@router.get("/listing-optimizations", response_model=list[ListingOptimizationResponse])
async def list_listing_optimizations(
    client_id: int | None = Query(None),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List listing optimizations with optional filters"""

    query = db.query(ListingOptimization).filter(
        ListingOptimization.org_id == current_user.org_id
    )

    if client_id:
        query = query.filter(ListingOptimization.client_id == client_id)
    if status:
        query = query.filter(ListingOptimization.optimization_status == status)

    return query.order_by(ListingOptimization.created_at.desc()).all()


@router.get("/listing-optimizations/{opt_id}", response_model=ListingOptimizationResponse)
async def get_listing_optimization(
    opt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific listing optimization"""

    optimization = db.query(ListingOptimization).filter(
        ListingOptimization.id == opt_id,
        ListingOptimization.org_id == current_user.org_id
    ).first()

    if not optimization:
        raise HTTPException(status_code=404, detail="Optimization not found")

    return optimization


@router.put("/listing-optimizations/{opt_id}", response_model=ListingOptimizationResponse)
async def update_listing_optimization(
    opt_id: int,
    status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update listing optimization status (e.g., mark as applied)"""

    optimization = db.query(ListingOptimization).filter(
        ListingOptimization.id == opt_id,
        ListingOptimization.org_id == current_user.org_id
    ).first()

    if not optimization:
        raise HTTPException(status_code=404, detail="Optimization not found")

    optimization.optimization_status = status
    optimization.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(optimization)

    return optimization


@router.get("/competitor-watch", response_model=list[CompetitorWatchResponse])
async def list_competitor_watches(
    client_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List competitor watches"""

    query = db.query(CompetitorWatch).filter(
        CompetitorWatch.org_id == current_user.org_id,
        CompetitorWatch.is_active == True
    )

    if client_id:
        query = query.filter(CompetitorWatch.client_id == client_id)

    return query.order_by(CompetitorWatch.created_at.desc()).all()


@router.post("/competitor-watch", response_model=CompetitorWatchResponse)
async def create_competitor_watch(
    request: CompetitorWatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new competitor watch entry"""

    watch = CompetitorWatch(
        org_id=current_user.org_id,
        client_id=request.client_id,
        our_asin=request.our_asin,
        competitor_asin=request.competitor_asin,
        competitor_brand=request.competitor_brand,
        competitor_price=request.competitor_price,
        our_price=request.our_price,
    )

    update_price_diff(watch)
    watch.alert_type = generate_competitor_alerts(watch)

    db.add(watch)
    db.commit()
    db.refresh(watch)

    return watch


@router.get("/competitor-watch/alerts")
async def get_competitor_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active competitor alerts"""

    alerts = db.query(CompetitorWatch).filter(
        CompetitorWatch.org_id == current_user.org_id,
        CompetitorWatch.is_active == True,
        CompetitorWatch.alert_type != None
    ).order_by(CompetitorWatch.created_at.desc()).all()

    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }


@router.put("/competitor-watch/{watch_id}", response_model=CompetitorWatchResponse)
async def update_competitor_watch(
    watch_id: int,
    competitor_price: float | None = None,
    is_active: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update competitor watch entry"""

    watch = db.query(CompetitorWatch).filter(
        CompetitorWatch.id == watch_id,
        CompetitorWatch.org_id == current_user.org_id
    ).first()

    if not watch:
        raise HTTPException(status_code=404, detail="Watch entry not found")

    if competitor_price is not None:
        watch.competitor_price = competitor_price
        update_price_diff(watch)
        watch.alert_type = generate_competitor_alerts(watch)

    if is_active is not None:
        watch.is_active = is_active

    watch.last_checked = datetime.utcnow()
    db.commit()
    db.refresh(watch)

    return watch


@router.get("/insights", response_model=list[AIInsightResponse])
async def list_ai_insights(
    client_id: int | None = Query(None),
    insight_type: str | None = Query(None),
    impact_level: str | None = Query(None),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List AI insights with optional filters"""

    query = db.query(AIInsight).filter(
        AIInsight.org_id == current_user.org_id
    )

    if client_id:
        query = query.filter(AIInsight.client_id == client_id)
    if insight_type:
        query = query.filter(AIInsight.insight_type == insight_type)
    if impact_level:
        query = query.filter(AIInsight.impact_level == impact_level)
    if unread_only:
        query = query.filter(AIInsight.is_read == False)

    return query.order_by(AIInsight.created_at.desc()).all()


@router.post("/insights/generate")
async def generate_insights(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI insights for a specific client"""

    # Generate insights using heuristic logic
    new_insights = generate_insights_for_client(current_user.org_id, client_id, db)

    # Save all insights
    for insight in new_insights:
        db.add(insight)

    db.commit()

    return {
        "message": f"Generated {len(new_insights)} insights",
        "count": len(new_insights),
        "insights": new_insights
    }


@router.put("/insights/{insight_id}/read")
async def mark_insight_read(
    insight_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark insight as read"""

    insight = db.query(AIInsight).filter(
        AIInsight.id == insight_id,
        AIInsight.org_id == current_user.org_id
    ).first()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_read = True
    db.commit()
    db.refresh(insight)

    return insight


@router.put("/insights/{insight_id}/act")
async def mark_insight_acted(
    insight_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark insight as acted upon"""

    insight = db.query(AIInsight).filter(
        AIInsight.id == insight_id,
        AIInsight.org_id == current_user.org_id
    ).first()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_acted = True
    db.commit()
    db.refresh(insight)

    return insight


@router.get("/automation-rules", response_model=list[AutomationRuleResponse])
async def list_automation_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List automation rules"""

    return db.query(AutomationRule).filter(
        AutomationRule.org_id == current_user.org_id
    ).order_by(AutomationRule.created_at.desc()).all()


@router.post("/automation-rules", response_model=AutomationRuleResponse)
async def create_automation_rule(
    request: AutomationRuleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new automation rule"""

    rule = AutomationRule(
        org_id=current_user.org_id,
        name=request.name,
        description=request.description,
        trigger_type=request.trigger_type,
        trigger_config=request.trigger_config,
        action_type=request.action_type,
        action_config=request.action_config
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule


@router.put("/automation-rules/{rule_id}", response_model=AutomationRuleResponse)
async def update_automation_rule(
    rule_id: int,
    request: AutomationRuleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update automation rule"""

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == current_user.org_id
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.name = request.name
    rule.description = request.description
    rule.trigger_type = request.trigger_type
    rule.trigger_config = request.trigger_config
    rule.action_type = request.action_type
    rule.action_config = request.action_config

    db.commit()
    db.refresh(rule)

    return rule


@router.post("/automation-rules/{rule_id}/trigger")
async def manually_trigger_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger an automation rule"""

    rule = db.query(AutomationRule).filter(
        AutomationRule.id == rule_id,
        AutomationRule.org_id == current_user.org_id
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # TODO: Execute rule action (send alert, create report, etc.)
    rule.last_triggered = datetime.utcnow()
    rule.trigger_count += 1

    db.commit()
    db.refresh(rule)

    return {
        "message": f"Rule '{rule.name}' triggered successfully",
        "rule": rule
    }


@router.post("/query")
async def natural_language_query(
    request: NLQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process natural language query and return results"""

    # Parse query
    parsed = parse_natural_language_query(request.query_text)

    # TODO: Execute query based on intent and return actual results
    # For now, return sample results based on intent

    result_data = {
        "intent": parsed["intent"],
        "filters": parsed["filters"],
        "sample_results": [
            {"id": 1, "name": "Sample Result 1", "value": 45.5},
            {"id": 2, "name": "Sample Result 2", "value": 38.2},
        ]
    }

    # Save query to history
    query_record = NLQuery(
        org_id=current_user.org_id,
        user_id=current_user.id,
        query_text=request.query_text,
        parsed_intent=parsed["intent"],
        parsed_filters=parsed["filters"],
        result_summary=parsed["summary"],
        result_data=result_data
    )

    db.add(query_record)
    db.commit()

    return {
        "query": request.query_text,
        "parsed_intent": parsed["intent"],
        "filters": parsed["filters"],
        "results": result_data["sample_results"],
        "summary": parsed["summary"]
    }


@router.get("/dashboard")
async def get_ai_dashboard(
    client_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI tools dashboard statistics"""

    base_filter = {"org_id": current_user.org_id}
    if client_id:
        base_filter["client_id"] = client_id

    # Count insights
    total_insights = db.query(func.count(AIInsight.id)).filter(
        AIInsight.org_id == current_user.org_id
    ).scalar() or 0

    unread_insights = db.query(func.count(AIInsight.id)).filter(
        AIInsight.org_id == current_user.org_id,
        AIInsight.is_read == False
    ).scalar() or 0

    # Count active competitor watches
    active_watches = db.query(func.count(CompetitorWatch.id)).filter(
        CompetitorWatch.org_id == current_user.org_id,
        CompetitorWatch.is_active == True
    ).scalar() or 0

    # Count active alerts
    active_alerts = db.query(func.count(CompetitorWatch.id)).filter(
        CompetitorWatch.org_id == current_user.org_id,
        CompetitorWatch.is_active == True,
        CompetitorWatch.alert_type != None
    ).scalar() or 0

    # Count automation rules
    total_rules = db.query(func.count(AutomationRule.id)).filter(
        AutomationRule.org_id == current_user.org_id
    ).scalar() or 0

    active_rules = db.query(func.count(AutomationRule.id)).filter(
        AutomationRule.org_id == current_user.org_id,
        AutomationRule.is_active == True
    ).scalar() or 0

    # Count optimizations
    total_optimizations = db.query(func.count(ListingOptimization.id)).filter(
        ListingOptimization.org_id == current_user.org_id
    ).scalar() or 0

    pending_optimizations = db.query(func.count(ListingOptimization.id)).filter(
        ListingOptimization.org_id == current_user.org_id,
        ListingOptimization.optimization_status == "pending"
    ).scalar() or 0

    return {
        "insights": {
            "total": total_insights,
            "unread": unread_insights
        },
        "competitor_watch": {
            "total_active": active_watches,
            "active_alerts": active_alerts
        },
        "automation": {
            "total_rules": total_rules,
            "active_rules": active_rules
        },
        "listing_optimization": {
            "total": total_optimizations,
            "pending": pending_optimizations
        }
    }
