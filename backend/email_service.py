"""
Email Service Module
Email notification system for FBA Wholesale SaaS platform
Handles template rendering and email distribution
"""

import json
import logging
import os
import urllib.request
import urllib.error
from typing import Dict, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from config import settings
from auth import get_current_user, tenant_session
from database import get_db
from models import User

logger = logging.getLogger(__name__)

# Email template request model
class EmailRequest(BaseModel):
    """Request model for sending a one-off email"""
    to_email: EmailStr
    subject: str
    template_name: Optional[str] = None
    context_data: Optional[Dict] = None


# Email Configuration — Resend HTTP API (Railway blocks SMTP ports)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")

# Check if email is properly configured
EMAIL_CONFIGURED = bool(RESEND_API_KEY)

if not EMAIL_CONFIGURED:
    logger.warning(
        "RESEND_API_KEY not configured. Email notifications will be logged only. "
        "Set RESEND_API_KEY in environment to enable email sending."
    )
else:
    logger.info(f"Email configured via Resend API. From: {EMAIL_FROM}")


# Dark theme color scheme
DARK_THEME = {
    "bg": "#0A0A0A",
    "accent": "#FFD700",
    "text": "#FFFFFF",
    "secondary_text": "#D0D0D0",
    "border": "#2A2A2A",
}


def get_html_wrapper(content: str, title: str = "FBA Wholesale") -> str:
    """
    Wrap email content in dark-themed HTML structure
    """
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: {DARK_THEME['bg']};
                color: {DARK_THEME['text']};
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: {DARK_THEME['bg']};
                border-bottom: 2px solid {DARK_THEME['accent']};
                padding: 20px;
                text-align: center;
                margin-bottom: 30px;
            }}
            .header h1 {{
                color: {DARK_THEME['accent']};
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }}
            .content {{
                background-color: {DARK_THEME['bg']};
                padding: 20px;
                border: 1px solid {DARK_THEME['border']};
                border-radius: 8px;
            }}
            .content h2 {{
                color: {DARK_THEME['accent']};
                font-size: 20px;
                margin-top: 0;
            }}
            .content p {{
                line-height: 1.6;
                color: {DARK_THEME['secondary_text']};
                margin: 10px 0;
            }}
            .content a {{
                color: {DARK_THEME['accent']};
                text-decoration: none;
                font-weight: 600;
            }}
            .content a:hover {{
                text-decoration: underline;
            }}
            .button {{
                display: inline-block;
                background-color: {DARK_THEME['accent']};
                color: {DARK_THEME['bg']};
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                margin: 10px 0;
            }}
            .button:hover {{
                opacity: 0.9;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid {DARK_THEME['border']};
                color: {DARK_THEME['secondary_text']};
                font-size: 12px;
            }}
            .alert {{
                background-color: {DARK_THEME['border']};
                border-left: 4px solid {DARK_THEME['accent']};
                padding: 15px;
                margin: 15px 0;
                border-radius: 4px;
            }}
            .alert.warning {{
                border-left-color: #FF6B6B;
            }}
            .alert.success {{
                border-left-color: #51CF66;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }}
            table th {{
                background-color: {DARK_THEME['border']};
                color: {DARK_THEME['accent']};
                padding: 12px;
                text-align: left;
                border: 1px solid {DARK_THEME['border']};
            }}
            table td {{
                padding: 10px 12px;
                border: 1px solid {DARK_THEME['border']};
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>FBA Wholesale</h1>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <p>© 2026 FBA Wholesale. All rights reserved.</p>
                <p>You received this email because you're a member of an FBA Wholesale organization.</p>
            </div>
        </div>
    </body>
    </html>
    """


def template_welcome(context_data: Dict) -> tuple[str, str]:
    """
    Welcome email template for new users
    Returns (subject, html_content)
    """
    user_name = context_data.get("user_name", "User")
    org_name = context_data.get("org_name", "FBA Wholesale")

    content = f"""
    <h2>Welcome to {org_name}!</h2>
    <p>Hi {user_name},</p>
    <p>Your account has been created successfully. You now have access to powerful tools for managing your Amazon FBA wholesale business.</p>
    <div class="alert alert.success">
        <p><strong>Get Started</strong></p>
        <p>Log in to your dashboard to start tracking products, monitoring pricing, and optimizing your inventory.</p>
    </div>
    <p>If you have any questions, our support team is here to help.</p>
    <p>Best regards,<br/>The FBA Wholesale Team</p>
    """

    subject = f"Welcome to {org_name}!"
    html = get_html_wrapper(content, "Welcome to FBA Wholesale")

    return subject, html


def template_weekly_digest(context_data: Dict) -> tuple[str, str]:
    """
    Weekly digest template summarizing account activity
    Returns (subject, html_content)
    """
    user_name = context_data.get("user_name", "User")
    week_start = context_data.get("week_start", "")
    products_tracked = context_data.get("products_tracked", 0)
    price_changes = context_data.get("price_changes", 0)
    stock_alerts = context_data.get("stock_alerts", 0)
    roi_average = context_data.get("roi_average", "N/A")

    content = f"""
    <h2>Your Weekly Summary</h2>
    <p>Hi {user_name},</p>
    <p>Here's what happened in your FBA Wholesale account this week ({week_start}):</p>

    <table>
        <tr>
            <th>Metric</th>
            <th>Value</th>
        </tr>
        <tr>
            <td>Products Tracked</td>
            <td>{products_tracked}</td>
        </tr>
        <tr>
            <td>Price Changes Detected</td>
            <td>{price_changes}</td>
        </tr>
        <tr>
            <td>Stock Alerts</td>
            <td>{stock_alerts}</td>
        </tr>
        <tr>
            <td>Average ROI</td>
            <td>{roi_average}%</td>
        </tr>
    </table>

    <p>
        <a href="#" class="button">View Full Report</a>
    </p>
    <p>Have questions? Check out our help center or contact support.</p>
    <p>Best regards,<br/>The FBA Wholesale Team</p>
    """

    subject = "Weekly Digest: Your FBA Wholesale Summary"
    html = get_html_wrapper(content, "Weekly Digest")

    return subject, html


def template_price_alert(context_data: Dict) -> tuple[str, str]:
    """
    Price alert template for significant price changes
    Returns (subject, html_content)
    """
    user_name = context_data.get("user_name", "User")
    product_name = context_data.get("product_name", "Product")
    asin = context_data.get("asin", "")
    old_price = context_data.get("old_price", "N/A")
    new_price = context_data.get("new_price", "N/A")
    price_change_pct = context_data.get("price_change_pct", "N/A")
    alert_type = context_data.get("alert_type", "change")

    icon = "📈" if float(str(price_change_pct).rstrip("%")) > 0 else "📉"
    alert_class = "warning" if float(str(price_change_pct).rstrip("%")) < 0 else "success"

    content = f"""
    <h2>Price Alert: {product_name}</h2>
    <p>Hi {user_name},</p>
    <p>We detected a significant price change for one of your tracked products:</p>

    <div class="alert alert.{alert_class}">
        <p><strong>{icon} {product_name}</strong></p>
        <p>ASIN: {asin}</p>
        <p>Previous Price: <strong>${old_price}</strong></p>
        <p>New Price: <strong>${new_price}</strong></p>
        <p>Change: <strong>{price_change_pct}</strong></p>
    </div>

    <p>Check your dashboard to review this and other price movements for your inventory.</p>
    <p>
        <a href="#" class="button">View Product Details</a>
    </p>
    <p>Best regards,<br/>The FBA Wholesale Team</p>
    """

    subject = f"Price Alert: {product_name} - {price_change_pct} Change"
    html = get_html_wrapper(content, "Price Alert")

    return subject, html


def template_report_ready(context_data: Dict) -> tuple[str, str]:
    """
    Report ready notification template
    Returns (subject, html_content)
    """
    user_name = context_data.get("user_name", "User")
    report_name = context_data.get("report_name", "Report")
    report_date = context_data.get("report_date", "")
    summary = context_data.get("summary", "Your report is ready.")

    content = f"""
    <h2>Your {report_name} is Ready</h2>
    <p>Hi {user_name},</p>
    <p>Your {report_name} for {report_date} has been generated and is ready to download.</p>

    <div class="alert alert.success">
        <p><strong>Report Summary</strong></p>
        <p>{summary}</p>
    </div>

    <p>
        <a href="#" class="button">Download Report</a>
    </p>
    <p>You can also access all your reports from the Reports section of your dashboard.</p>
    <p>Best regards,<br/>The FBA Wholesale Team</p>
    """

    subject = f"Your {report_name} is Ready"
    html = get_html_wrapper(content, "Report Ready")

    return subject, html


def template_account_invite(context_data: Dict) -> tuple[str, str]:
    """
    Account invite template for new team members
    Returns (subject, html_content)
    """
    inviter_name = context_data.get("inviter_name", "A colleague")
    org_name = context_data.get("org_name", "FBA Wholesale")
    invite_link = context_data.get("invite_link", "#")
    invite_code = context_data.get("invite_code", "")

    content = f"""
    <h2>You're Invited to Join {org_name}</h2>
    <p>Hello,</p>
    <p>{inviter_name} has invited you to join {org_name} on FBA Wholesale.</p>
    <p>FBA Wholesale helps Amazon sellers track products, monitor pricing, and optimize wholesale sourcing decisions.</p>

    <div class="alert alert.success">
        <p><strong>Accept the Invitation</strong></p>
        <p>Click the button below to join {org_name} and start collaborating.</p>
        <p><strong>Invitation Code: {invite_code}</strong></p>
    </div>

    <p>
        <a href="{invite_link}" class="button">Accept Invitation</a>
    </p>
    <p>This invitation will expire in 7 days. If you didn't expect this invitation or have questions, you can safely ignore this email.</p>
    <p>Best regards,<br/>The FBA Wholesale Team</p>
    """

    subject = f"You're invited to {org_name} on FBA Wholesale"
    html = get_html_wrapper(content, "Account Invitation")

    return subject, html


def template_trial_ending(context_data: Dict) -> tuple[str, str]:
    """Trial-ending reminder (§2.4). Daily cron triggers at 3 days + 1 day out.

    Required keys: user_name, days_remaining, billing_link.
    """
    user_name = context_data.get("user_name", "there")
    days_remaining = int(context_data.get("days_remaining", 3))
    billing_link = context_data.get(
        "billing_link",
        "https://amazon-fba-saas.vercel.app/billing",
    )
    plural = "s" if days_remaining != 1 else ""

    content = f"""
    <h2>Your trial ends in {days_remaining} day{plural}</h2>
    <p>Hi {user_name},</p>
    <p>Your 14-day Ecom Era trial ends in <strong>{days_remaining} day{plural}</strong>. Add a payment method now to keep access uninterrupted.</p>

    <p style="text-align: center; margin: 30px 0;">
        <a href="{billing_link}" class="button">Add Payment Method</a>
    </p>

    <p style="font-size: 12px; color: #999;">
        Without a card, your account will be paused at trial end. Your data
        stays available for 30 days after that — you can resume any time
        by adding a card.
    </p>
    <p>Best regards,<br/>The Ecom Era Team</p>
    """
    subject = f"Your Ecom Era trial ends in {days_remaining} day{plural}"
    html = get_html_wrapper(content, "Trial Ending Soon")
    return subject, html


# Template registry
TEMPLATE_REGISTRY = {
    "welcome": template_welcome,
    "weekly_digest": template_weekly_digest,
    "price_alert": template_price_alert,
    "report_ready": template_report_ready,
    "account_invite": template_account_invite,
    "trial_ending": template_trial_ending,
}


def get_template(template_name: str, context_data: Dict) -> tuple[str, str]:
    """
    Get email template by name
    Returns (subject, html_content)
    """
    if template_name not in TEMPLATE_REGISTRY:
        raise ValueError(f"Unknown template: {template_name}")

    try:
        return TEMPLATE_REGISTRY[template_name](context_data)
    except Exception as e:
        logger.error(f"Error rendering template {template_name}: {e}")
        raise


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
) -> bool:
    """
    Send email via Resend HTTP API (Railway blocks SMTP ports)
    Returns True if successful, False if not configured or error occurred
    """
    if not EMAIL_CONFIGURED:
        logger.warning(f"Email not sent (Resend not configured): To={to_email}, Subject={subject}")
        return False

    try:
        payload = json.dumps({
            "from": EMAIL_FROM,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            logger.info(f"Email sent successfully via Resend: To={to_email}, ID={result.get('id')}")
            return True

    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        logger.error(f"Resend API error {e.code}: {body}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


async def send_notification_email(
    to_email: str,
    template_name: str,
    context_data: Dict
) -> bool:
    """
    Helper function to send a templated notification email
    Can be imported and used by other modules

    Args:
        to_email: Recipient email address
        template_name: Name of the template to use
        context_data: Dictionary of template variables

    Returns:
        True if email was sent successfully, False otherwise
    """
    try:
        subject, html_content = get_template(template_name, context_data)
        return send_email(to_email, subject, html_content)
    except ValueError as e:
        logger.error(f"Template error: {e}")
        return False
    except Exception as e:
        logger.error(f"Error sending notification email: {e}")
        return False


# Initialize router
router = APIRouter(prefix="/email", tags=["email"])


@router.post("/send")
async def send_email_endpoint(
    email_request: EmailRequest,
    current_user: User = Depends(tenant_session),
    db=Depends(get_db)
):
    """
    Send a one-off email to a user
    Requires admin or owner role
    """
    # Check authorization
    if current_user.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and owners can send emails"
        )

    to_email = email_request.to_email
    subject = email_request.subject
    template_name = email_request.template_name
    context_data = email_request.context_data or {}

    try:
        # Determine content source
        if template_name:
            # Use template
            html_content = get_template(template_name, context_data)[1]
        else:
            # Use provided subject and wrap in default HTML
            html_content = get_html_wrapper(
                f"<p>{context_data.get('body', 'No content provided')}</p>",
                "FBA Wholesale"
            )

        # Send email
        success = send_email(to_email, subject, html_content)

        return {
            "success": success,
            "message": "Email sent successfully" if success else "Email could not be sent",
            "to_email": to_email,
            "subject": subject,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )


@router.post("/test")
async def send_test_email(
    current_user: User = Depends(tenant_session),
    db=Depends(get_db)
):
    """
    Send a test email to the current user
    Useful for verifying email configuration
    """
    to_email = current_user.email
    context_data = {
        "user_name": current_user.name or "User",
        "org_name": "FBA Wholesale",
    }

    try:
        subject, html_content = get_template("welcome", context_data)
        success = send_email(to_email, subject, html_content)

        return {
            "success": success,
            "message": "Test email sent successfully" if success else "Test email could not be sent",
            "to_email": to_email,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error sending test email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test email"
        )


@router.get("/templates")
async def list_templates(
    current_user: User = Depends(tenant_session),
    db=Depends(get_db)
):
    """
    List all available email templates
    """
    templates = [
        {
            "name": "welcome",
            "description": "Welcome email for new users",
            "required_fields": ["user_name", "org_name"]
        },
        {
            "name": "weekly_digest",
            "description": "Weekly summary of account activity",
            "required_fields": ["user_name", "week_start", "products_tracked", "price_changes", "stock_alerts", "roi_average"]
        },
        {
            "name": "price_alert",
            "description": "Price change notification",
            "required_fields": ["user_name", "product_name", "asin", "old_price", "new_price", "price_change_pct"]
        },
        {
            "name": "report_ready",
            "description": "Report generation completion notification",
            "required_fields": ["user_name", "report_name", "report_date", "summary"]
        },
        {
            "name": "account_invite",
            "description": "Invitation to join organization",
            "required_fields": ["inviter_name", "org_name", "invite_link", "invite_code"]
        },
    ]

    return {
        "success": True,
        "templates": templates,
        "count": len(templates),
        "timestamp": datetime.utcnow().isoformat(),
    }
