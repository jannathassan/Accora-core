"""Realistic demo data seeder for Lumina Fashion / Ayesha Khan demo workspace."""

import uuid
from datetime import date as Date, datetime
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.invoice import Invoice


def seed_demo_workspace_data(db: Session, workspace_id: str):
    """Seed Lumina Fashion with rich, realistic transactions and invoices if none exist."""
    tx_count = db.query(Transaction).filter(Transaction.workspace_id == workspace_id).count()
    if tx_count > 0:
        return

    # Seed 2026 Transactions (Jan through Dec)
    tx_data = [
        # Jan 2026
        (Date(2026, 1, 5), "Wholesale Boutique Order — Nord Elegance", "Sales Revenue", "income", 5400.00, "completed"),
        (Date(2026, 1, 8), "Fabric & Raw Silk Sourcing — Milan Textiles", "Cost of Goods Sold", "expense", 2800.00, "completed"),
        (Date(2026, 1, 12), "Shopify Plus & Inventory Sync App", "Software & Tools", "expense", 399.00, "completed"),
        (Date(2026, 1, 15), "Direct-to-Consumer Online Sales (Week 1-2)", "Sales Revenue", "income", 6850.00, "completed"),
        (Date(2026, 1, 20), "Instagram & Pinterest Ad Campaign (Winter Collection)", "Advertising & Marketing", "expense", 1850.00, "completed"),
        (Date(2026, 1, 28), "Garment Production Contractors", "Salaries & Contractors", "expense", 3200.00, "completed"),
        (Date(2026, 1, 31), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Feb 2026
        (Date(2026, 2, 4), "Spring Preview Wholesale Order — Aurora Boutique", "Sales Revenue", "income", 7200.00, "completed"),
        (Date(2026, 2, 7), "Organic Cotton & Dye Supplies", "Cost of Goods Sold", "expense", 3100.00, "completed"),
        (Date(2026, 2, 14), "Valentine's Flash Sale D2C Revenue", "Sales Revenue", "income", 8400.00, "completed"),
        (Date(2026, 2, 18), "Influencer Styling Campaign", "Advertising & Marketing", "expense", 2200.00, "completed"),
        (Date(2026, 2, 25), "Eco-friendly Packaging & Shipping Boxes", "Cost of Goods Sold", "expense", 1450.00, "completed"),
        (Date(2026, 2, 28), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Mar 2026
        (Date(2026, 3, 5), "Spring Collection Launch D2C Sales", "Sales Revenue", "income", 12500.00, "completed"),
        (Date(2026, 3, 9), "Editorial Lookbook Photography & Model Fees", "Advertising & Marketing", "expense", 2600.00, "completed"),
        (Date(2026, 3, 15), "Custom Design Consultation — Corporate Uniforms", "Services", "income", 4500.00, "completed"),
        (Date(2026, 3, 22), "Klaviyo Email Automation & SMS Platform", "Software & Tools", "expense", 350.00, "completed"),
        (Date(2026, 3, 28), "Contract Seamstresses & Pattern Makers", "Salaries & Contractors", "expense", 3800.00, "completed"),
        (Date(2026, 3, 31), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Apr 2026
        (Date(2026, 4, 3), "Department Store Consignment Payout", "Sales Revenue", "income", 8900.00, "completed"),
        (Date(2026, 4, 10), "Summer Fabric Imports & Customs Duties", "Cost of Goods Sold", "expense", 4100.00, "completed"),
        (Date(2026, 4, 16), "Meta Performance Ads (Spring Scale-up)", "Advertising & Marketing", "expense", 3100.00, "completed"),
        (Date(2026, 4, 22), "D2C Online Sales", "Sales Revenue", "income", 9400.00, "completed"),
        (Date(2026, 4, 30), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # May 2026
        (Date(2026, 5, 6), "Resort Wear Capsule Pre-Orders", "Sales Revenue", "income", 14200.00, "completed"),
        (Date(2026, 5, 12), "Linen & Breathable Rayon Bolts", "Cost of Goods Sold", "expense", 4800.00, "completed"),
        (Date(2026, 5, 19), "Fulfillment Center & Logistics Handling", "Cost of Goods Sold", "expense", 1950.00, "completed"),
        (Date(2026, 5, 27), "Google Ads Shopping & Search", "Advertising & Marketing", "expense", 2400.00, "completed"),
        (Date(2026, 5, 31), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Jun 2026
        (Date(2026, 6, 4), "Boutique Restock Order — Solstice Living", "Sales Revenue", "income", 6300.00, "completed"),
        (Date(2026, 6, 12), "Mid-Year D2C Revenue", "Sales Revenue", "income", 11200.00, "completed"),
        (Date(2026, 6, 18), "Accounting & Quarterly Tax Filing Services", "Taxes & Licenses", "expense", 1500.00, "completed"),
        (Date(2026, 6, 25), "Contract Production & Quality Control", "Salaries & Contractors", "expense", 3600.00, "completed"),
        (Date(2026, 6, 30), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Jul 2026
        (Date(2026, 7, 7), "Summer Sale Online Surge", "Sales Revenue", "income", 13800.00, "completed"),
        (Date(2026, 7, 14), "Autumn/Winter Fabric Advance Deposits", "Cost of Goods Sold", "expense", 5500.00, "completed"),
        (Date(2026, 7, 21), "TikTok Creator Partnerships", "Advertising & Marketing", "expense", 2800.00, "completed"),
        (Date(2026, 7, 28), "Shipping Carrier Invoices (DHL & FedEx)", "Cost of Goods Sold", "expense", 1850.00, "completed"),
        (Date(2026, 7, 31), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Aug 2026 (One-time capital upgrade: Industrial embroidery machine)
        (Date(2026, 8, 5), "Pre-Fall Capsule D2C Sales", "Sales Revenue", "income", 10400.00, "completed"),
        (Date(2026, 8, 14), "Industrial Multi-Needle Embroidery & Cutting Station", "Operating", "expense", 6800.00, "completed"),
        (Date(2026, 8, 20), "Fashion Week Presentation Sponsorship & Booth", "Advertising & Marketing", "expense", 3500.00, "completed"),
        (Date(2026, 8, 26), "Corporate Apparel Delivery — Horizon Hospitality", "Services", "income", 5800.00, "completed"),
        (Date(2026, 8, 31), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Sep 2026
        (Date(2026, 9, 6), "Fall Collection Official Drop", "Sales Revenue", "income", 17500.00, "completed"),
        (Date(2026, 9, 12), "Merino Wool & Cashmere Blends", "Cost of Goods Sold", "expense", 6200.00, "completed"),
        (Date(2026, 9, 18), "Digital Marketing Scale-up", "Advertising & Marketing", "expense", 3900.00, "completed"),
        (Date(2026, 9, 25), "Contract Tailors & Studio Assistants", "Salaries & Contractors", "expense", 4200.00, "completed"),
        (Date(2026, 9, 30), "Design Studio Rent & Utilities", "Office & Rent", "expense", 2100.00, "completed"),

        # Oct 2026
        (Date(2026, 10, 5), "Boutique Multi-Store Purchase Order — Velvet Oak", "Sales Revenue", "income", 15400.00, "completed"),
        (Date(2026, 10, 11), "Holiday Season Packaging & Ribbons", "Cost of Goods Sold", "expense", 2400.00, "completed"),
        (Date(2026, 10, 18), "Online Sales (October Mid-Month)", "Sales Revenue", "income", 12100.00, "completed"),
        (Date(2026, 10, 24), "Product Catalog & Lookbook Printing", "Advertising & Marketing", "expense", 1600.00, "completed"),
        (Date(2026, 10, 27), "Pending Wholesale Shipment — Apex Retail", "Sales Revenue", "income", 4200.00, "pending"),
    ]

    for d, desc, cat, typ, amt, st in tx_data:
        db.add(
            Transaction(
                workspace_id=workspace_id,
                date=d,
                description=desc,
                category=cat,
                type=typ,
                amount=amt,
                status=st,
                notes="Seed transaction" if st == "completed" else "Awaiting client confirmation",
            )
        )

    # Seed Invoices
    inv_data = [
        (
            "INV-202601-0001", "Nord Elegance Boutiques", "billing@nordelegance.com",
            [
                {"id": str(uuid.uuid4()), "description": "Silk Evening Gown Collection (Qty 20)", "quantity": 20, "unit_price": 180.0, "amount": 3600.0},
                {"id": str(uuid.uuid4()), "description": "Embroidered Velvet Blazers (Qty 10)", "quantity": 10, "unit_price": 180.0, "amount": 1800.0},
            ],
            0.05, "paid", Date(2026, 1, 5), Date(2026, 2, 5), Date(2026, 2, 2)
        ),
        (
            "INV-202602-0002", "Aurora Boutique", "accounts@auroraboutique.com",
            [
                {"id": str(uuid.uuid4()), "description": "Spring Linen Shirts (Qty 40)", "quantity": 40, "unit_price": 95.0, "amount": 3800.0},
                {"id": str(uuid.uuid4()), "description": "Pleated Midi Skirts (Qty 25)", "quantity": 25, "unit_price": 136.0, "amount": 3400.0},
            ],
            0.05, "paid", Date(2026, 2, 4), Date(2026, 3, 4), Date(2026, 3, 1)
        ),
        (
            "INV-202603-0003", "Horizon Hospitality Corp", "ap@horizonhospitality.com",
            [
                {"id": str(uuid.uuid4()), "description": "Bespoke Concierge Uniform Design & Tailoring", "quantity": 15, "unit_price": 300.0, "amount": 4500.0},
            ],
            0.0, "paid", Date(2026, 3, 15), Date(2026, 4, 15), Date(2026, 4, 12)
        ),
        (
            "INV-202606-0004", "Solstice Living Showroom", "finance@solsticeliving.com",
            [
                {"id": str(uuid.uuid4()), "description": "Resort Wear Kimonos (Qty 30)", "quantity": 30, "unit_price": 120.0, "amount": 3600.0},
                {"id": str(uuid.uuid4()), "description": "Lounge Sets (Qty 30)", "quantity": 30, "unit_price": 90.0, "amount": 2700.0},
            ],
            0.05, "paid", Date(2026, 6, 4), Date(2026, 7, 4), Date(2026, 7, 2)
        ),
        (
            "INV-202607-0005", "Crestline Apparel Distribution", "payments@crestlineapparel.com",
            [
                {"id": str(uuid.uuid4()), "description": "Summer Wholesale Consignment Batch", "quantity": 50, "unit_price": 75.0, "amount": 3750.0},
            ],
            0.05, "overdue", Date(2026, 7, 10), Date(2026, 8, 10), None
        ),
        (
            "INV-202608-0006", "Paloma Concept Store", "accounts@palomastore.com",
            [
                {"id": str(uuid.uuid4()), "description": "Autumn Preview Trench Coats (Qty 15)", "quantity": 15, "unit_price": 240.0, "amount": 3600.0},
            ],
            0.05, "overdue", Date(2026, 8, 1), Date(2026, 9, 1), None
        ),
        (
            "INV-202609-0007", "Velvet Oak Department Stores", "vendor@velvetoak.com",
            [
                {"id": str(uuid.uuid4()), "description": "Merino Wool Sweaters (Qty 60)", "quantity": 60, "unit_price": 140.0, "amount": 8400.0},
                {"id": str(uuid.uuid4()), "description": "Tailored Wool Trousers (Qty 50)", "quantity": 50, "unit_price": 140.0, "amount": 7000.0},
            ],
            0.05, "pending", Date(2026, 9, 20), Date(2026, 11, 20), None
        ),
        (
            "INV-202610-0008", "Apex Luxury Retailers", "ap@apexretail.com",
            [
                {"id": str(uuid.uuid4()), "description": "Holiday Capsule Collection (Advance)", "quantity": 1, "unit_price": 4200.0, "amount": 4200.0},
            ],
            0.0, "sent", Date(2026, 10, 15), Date(2026, 11, 30), None
        ),
    ]

    for inv_num, client, email, items, tax_rate, status_str, issued, due, paid in inv_data:
        subtotal = round(sum(it["amount"] for it in items), 2)
        tax_amt = round(subtotal * tax_rate, 2)
        total = round(subtotal + tax_amt, 2)

        db.add(
            Invoice(
                workspace_id=workspace_id,
                invoice_number=inv_num,
                client_name=client,
                client_email=email,
                items=items,
                subtotal=subtotal,
                tax_rate=tax_rate,
                tax_amount=tax_amt,
                total=total,
                status=status_str,
                issue_date=issued,
                due_date=due,
                paid_date=paid,
                notes=f"Generated invoice for {client}",
            )
        )

    db.commit()
