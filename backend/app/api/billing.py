from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import razorpay
import time
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import User, Subscription, PlanType, SubscriptionStatus

router = APIRouter(prefix="/api/billing", tags=["Billing"])

client = None
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class OrderCreate(BaseModel):
    plan: Optional[str] = None
    plan_type: Optional[str] = None


class VerifyPayment(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    subscription_id: Optional[int] = None
    plan_type: Optional[str] = None


@router.post("/create-order")
async def create_order(order_data: OrderCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
        
    requested_plan = (order_data.plan or order_data.plan_type or "BASE").upper()
    if requested_plan == "BASE":
        amount = settings.BASE_PLAN_PRICE_INR * 100
        plan_type = PlanType.BASE
    elif requested_plan == "PRO":
        amount = settings.PRO_PLAN_PRICE_INR * 100
        plan_type = PlanType.PRO
    else:
        raise HTTPException(status_code=400, detail="Invalid plan selected")

    receipt = f"order_{current_user.id}_{int(time.time())}"
    
    order = client.order.create({
        "amount": amount,
        "currency": "INR",
        "receipt": receipt
    })
    
    new_sub = Subscription(
        user_id=current_user.id,
        plan_type=plan_type,
        razorpay_order_id=order["id"],
        status=SubscriptionStatus.PENDING,
        amount_paid=amount / 100
    )
    db.add(new_sub)
    await db.commit()
    await db.refresh(new_sub)
    
    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "subscription_id": new_sub.id
    }


@router.post("/verify-payment")
async def verify_payment(payment_data: VerifyPayment, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
        
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': payment_data.razorpay_order_id,
            'razorpay_payment_id': payment_data.razorpay_payment_id,
            'razorpay_signature': payment_data.razorpay_signature
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")
        
    if payment_data.subscription_id:
        result = await db.execute(select(Subscription).where(Subscription.id == payment_data.subscription_id))
    else:
        result = await db.execute(select(Subscription).where(Subscription.razorpay_order_id == payment_data.razorpay_order_id))
        
    subscription = result.scalar_one_or_none()
    
    if not subscription or subscription.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.razorpay_payment_id = payment_data.razorpay_payment_id
    subscription.expires_at = datetime.utcnow() + timedelta(days=30)
    
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    
    user.plan = subscription.plan_type
    if subscription.plan_type == PlanType.BASE:
        user.credits_remaining += settings.BASE_PLAN_CREDITS
    elif subscription.plan_type == PlanType.PRO:
        user.credits_remaining += settings.PRO_PLAN_CREDITS
        
    await db.commit()
    return {"message": "Payment verified successfully", "credits": user.credits_remaining}

@router.get("/plans")
async def get_plans():
    return [
        {
            "name": "FREE",
            "price": 0,
            "credits": settings.FREE_CREDITS,
            "description": "Basic features with limited credits"
        },
        {
            "name": "BASE",
            "price": settings.BASE_PLAN_PRICE_INR,
            "credits": settings.BASE_PLAN_CREDITS,
            "description": "More credits for regular creators"
        },
        {
            "name": "PRO",
            "price": settings.PRO_PLAN_PRICE_INR,
            "credits": settings.PRO_PLAN_CREDITS,
            "description": "Maximum credits for professional creators"
        }
    ]
