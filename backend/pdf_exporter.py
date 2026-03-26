"""
PDF/CSV Export Service
FastAPI router for generating and exporting reports and data in various formats.
Supports HTML reports and CSV data exports with org_id scoping.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import csv
import io
from typing import List, Optional

from database import get_db
from models import (
    User, Organization, Product, Client, WeeklyReport,
    ScoutResult, Supplier, ActivityLog
)
from auth import get_current_user, require_role, get_org_scoped_query
from config import settings


router = APIRouter(prefix="/export", tags=["export"])


def generate_executive_summary_html(org_id: str, db: Session) -> str:
    """Generate an executive summary HTML report."""
    org = db.query(Organization).filter(Organization.id == org_id).first()

    # Get metrics
    product_count = db.query(func.count(Product.id)).filter(
        Product.org_id == org_id
    ).scalar() or 0

    client_count = db.query(func.count(Client.id)).filter(
        Client.org_id == org_id
    ).scalar() or 0

    # Get latest weekly report
    latest_report = db.query(WeeklyReport).filter(
        WeeklyReport.org_id == org_id
    ).order_by(WeeklyReport.created_at.desc()).first()

    total_revenue = 0
    total_units = 0
    if latest_report and latest_report.metrics:
        total_revenue = latest_report.metrics.get('total_revenue', 0)
        total_units = latest_report.metrics.get('total_units', 0)

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Executive Summary - {org.name if org else 'Report'}</title>
        <style>
            body {{
                background-color: #0A0A0A;
                color: #FFFFFF;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 900px;
                margin: 0 auto;
                background-color: #111111;
                border: 1px solid #1E1E1E;
                border-radius: 8px;
                padding: 30px;
            }}
            h1 {{
                color: #FFD700;
                border-bottom: 2px solid #FFD700;
                padding-bottom: 10px;
                margin-top: 0;
            }}
            .metrics {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin: 30px 0;
            }}
            .metric-box {{
                background-color: #0A0A0A;
                border: 1px solid #1E1E1E;
                border-radius: 6px;
                padding: 15px;
            }}
            .metric-label {{
                color: #888;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 8px;
            }}
            .metric-value {{
                color: #FFD700;
                font-size: 28px;
                font-weight: bold;
            }}
            .timestamp {{
                color: #888;
                font-size: 12px;
                margin-top: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Executive Summary</h1>
            <p>Organization: <strong>{org.name if org else 'N/A'}</strong></p>

            <div class="metrics">
                <div class="metric-box">
                    <div class="metric-label">Total Products</div>
                    <div class="metric-value">{product_count}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Active Clients</div>
                    <div class="metric-value">{client_count}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Total Revenue</div>
                    <div class="metric-value">${total_revenue:,.2f}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">Total Units Sold</div>
                    <div class="metric-value">{total_units:,}</div>
                </div>
            </div>

            <div class="timestamp">
                Generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}
            </div>
        </div>
    </body>
    </html>
    """
    return html


def generate_product_analysis_html(org_id: str, db: Session) -> str:
    """Generate a product analysis HTML report."""
    org = db.query(Organization).filter(Organization.id == org_id).first()

    # Get top products by revenue
    products = db.query(Product).filter(
        Product.org_id == org_id
    ).order_by(Product.revenue.desc()).limit(10).all()

    product_rows = ""
    for idx, product in enumerate(products, 1):
        product_rows += f"""
        <tr>
            <td>{idx}</td>
            <td>{product.asin or 'N/A'}</td>
            <td>{product.name or 'Unnamed'}</td>
            <td>${product.revenue or 0:,.2f}</td>
            <td>{product.bsr or 'N/A'}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Product Analysis - {org.name if org else 'Report'}</title>
        <style>
            body {{
                background-color: #0A0A0A;
                color: #FFFFFF;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 1000px;
                margin: 0 auto;
                background-color: #111111;
                border: 1px solid #1E1E1E;
                border-radius: 8px;
                padding: 30px;
            }}
            h1 {{
                color: #FFD700;
                border-bottom: 2px solid #FFD700;
                padding-bottom: 10px;
                margin-top: 0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th {{
                background-color: #0A0A0A;
                color: #FFD700;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #1E1E1E;
                font-weight: 600;
            }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #1E1E1E;
            }}
            tr:hover {{
                background-color: #0F0F0F;
            }}
            .timestamp {{
                color: #888;
                font-size: 12px;
                margin-top: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Product Analysis</h1>
            <p>Top 10 Products by Revenue</p>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>ASIN</th>
                        <th>Product Name</th>
                        <th>Revenue</th>
                        <th>BSR</th>
                    </tr>
                </thead>
                <tbody>
                    {product_rows if product_rows else '<tr><td colspan="5" style="text-align: center; color: #888;">No products found</td></tr>'}
                </tbody>
            </table>

            <div class="timestamp">
                Generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}
            </div>
        </div>
    </body>
    </html>
    """
    return html


def generate_weekly_digest_html(org_id: str, db: Session) -> str:
    """Generate a weekly digest HTML report."""
    org = db.query(Organization).filter(Organization.id == org_id).first()

    # Get latest 4 weekly reports
    reports = db.query(WeeklyReport).filter(
        WeeklyReport.org_id == org_id
    ).order_by(WeeklyReport.created_at.desc()).limit(4).all()

    report_rows = ""
    for report in reports:
        week_start = report.created_at.strftime('%b %d') if report.created_at else 'N/A'
        revenue = report.metrics.get('total_revenue', 0) if report.metrics else 0
        units = report.metrics.get('total_units', 0) if report.metrics else 0
        report_rows += f"""
        <tr>
            <td>Week of {week_start}</td>
            <td>${revenue:,.2f}</td>
            <td>{units:,}</td>
            <td>{report.summary or 'No summary'}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Weekly Digest - {org.name if org else 'Report'}</title>
        <style>
            body {{
                background-color: #0A0A0A;
                color: #FFFFFF;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 1000px;
                margin: 0 auto;
                background-color: #111111;
                border: 1px solid #1E1E1E;
                border-radius: 8px;
                padding: 30px;
            }}
            h1 {{
                color: #FFD700;
                border-bottom: 2px solid #FFD700;
                padding-bottom: 10px;
                margin-top: 0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th {{
                background-color: #0A0A0A;
                color: #FFD700;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #1E1E1E;
                font-weight: 600;
            }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #1E1E1E;
            }}
            .timestamp {{
                color: #888;
                font-size: 12px;
                margin-top: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Weekly Digest</h1>
            <p>Recent Weekly Performance Summary</p>

            <table>
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Revenue</th>
                        <th>Units Sold</th>
                        <th>Summary</th>
                    </tr>
                </thead>
                <tbody>
                    {report_rows if report_rows else '<tr><td colspan="4" style="text-align: center; color: #888;">No reports available</td></tr>'}
                </tbody>
            </table>

            <div class="timestamp">
                Generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}
            </div>
        </div>
    </body>
    </html>
    """
    return html


def generate_client_overview_html(org_id: str, db: Session) -> str:
    """Generate a client overview HTML report."""
    org = db.query(Organization).filter(Organization.id == org_id).first()

    # Get all clients with order count
    clients = db.query(Client).filter(
        Client.org_id == org_id
    ).order_by(Client.created_at.desc()).limit(20).all()

    client_rows = ""
    for idx, client in enumerate(clients, 1):
        client_rows += f"""
        <tr>
            <td>{idx}</td>
            <td>{client.name or 'Unnamed'}</td>
            <td>{client.email or 'N/A'}</td>
            <td>{client.phone or 'N/A'}</td>
            <td>{client.created_at.strftime('%b %d, %Y') if client.created_at else 'N/A'}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Client Overview - {org.name if org else 'Report'}</title>
        <style>
            body {{
                background-color: #0A0A0A;
                color: #FFFFFF;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 1000px;
                margin: 0 auto;
                background-color: #111111;
                border: 1px solid #1E1E1E;
                border-radius: 8px;
                padding: 30px;
            }}
            h1 {{
                color: #FFD700;
                border-bottom: 2px solid #FFD700;
                padding-bottom: 10px;
                margin-top: 0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th {{
                background-color: #0A0A0A;
                color: #FFD700;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #1E1E1E;
                font-weight: 600;
            }}
            td {{
                padding: 12px;
                border-bottom: 1px solid #1E1E1E;
            }}
            .timestamp {{
                color: #888;
                font-size: 12px;
                margin-top: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Client Overview</h1>
            <p>All Registered Clients</p>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    {client_rows if client_rows else '<tr><td colspan="5" style="text-align: center; color: #888;">No clients found</td></tr>'}
                </tbody>
            </table>

            <div class="timestamp">
                Generated on {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}
            </div>
        </div>
    </body>
    </html>
    """
    return html


@router.get("/report/{report_type}")
async def export_report(
    report_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate and download a report in HTML format.
    Types: executive_summary, product_analysis, weekly_digest, client_overview
    """
    org_id = current_user.org_id

    valid_types = {
        "executive_summary": generate_executive_summary_html,
        "product_analysis": generate_product_analysis_html,
        "weekly_digest": generate_weekly_digest_html,
        "client_overview": generate_client_overview_html,
    }

    if report_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report type. Must be one of: {', '.join(valid_types.keys())}"
        )

    # Generate HTML
    generator = valid_types[report_type]
    html_content = generator(org_id, db)

    # Create response
    filename = f"{report_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"

    return StreamingResponse(
        iter([html_content]),
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/csv/{data_type}")
async def export_csv(
    data_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export data as CSV.
    Types: products, clients, scouts, suppliers, weekly_reports
    """
    org_id = current_user.org_id

    # Create CSV buffer
    output = io.StringIO()
    writer = csv.writer(output)

    if data_type == "products":
        products = db.query(Product).filter(Product.org_id == org_id).all()
        writer.writerow(["ASIN", "Name", "Revenue", "BSR", "Created At"])
        for product in products:
            writer.writerow([
                product.asin or "",
                product.name or "",
                product.revenue or 0,
                product.bsr or "",
                product.created_at.isoformat() if product.created_at else ""
            ])
        filename = f"products_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    elif data_type == "clients":
        clients = db.query(Client).filter(Client.org_id == org_id).all()
        writer.writerow(["Name", "Email", "Phone", "Created At"])
        for client in clients:
            writer.writerow([
                client.name or "",
                client.email or "",
                client.phone or "",
                client.created_at.isoformat() if client.created_at else ""
            ])
        filename = f"clients_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    elif data_type == "scouts":
        scouts = db.query(ScoutResult).filter(ScoutResult.org_id == org_id).all()
        writer.writerow(["Product Name", "Category", "Estimated Price", "Opportunity Score", "Created At"])
        for scout in scouts:
            writer.writerow([
                scout.product_name or "",
                scout.category or "",
                scout.estimated_price or 0,
                scout.opportunity_score or 0,
                scout.created_at.isoformat() if scout.created_at else ""
            ])
        filename = f"scout_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    elif data_type == "suppliers":
        suppliers = db.query(Supplier).filter(Supplier.org_id == org_id).all()
        writer.writerow(["Name", "Email", "Contact", "Rating", "Created At"])
        for supplier in suppliers:
            writer.writerow([
                supplier.name or "",
                supplier.email or "",
                supplier.contact_name or "",
                supplier.rating or 0,
                supplier.created_at.isoformat() if supplier.created_at else ""
            ])
        filename = f"suppliers_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    elif data_type == "weekly_reports":
        reports = db.query(WeeklyReport).filter(WeeklyReport.org_id == org_id).all()
        writer.writerow(["Week of", "Revenue", "Units", "Growth (%)", "Summary"])
        for report in reports:
            revenue = report.metrics.get('total_revenue', 0) if report.metrics else 0
            units = report.metrics.get('total_units', 0) if report.metrics else 0
            growth = report.metrics.get('growth_pct', 0) if report.metrics else 0
            writer.writerow([
                report.created_at.strftime('%Y-%m-%d') if report.created_at else "",
                revenue,
                units,
                growth,
                report.summary or ""
            ])
        filename = f"weekly_reports_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid data type. Must be one of: products, clients, scouts, suppliers, weekly_reports"
        )

    # Get CSV content
    csv_content = output.getvalue()
    output.close()

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
