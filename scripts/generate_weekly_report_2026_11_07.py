"""
PrepFord NCLEX — Weekly Development & Engineering Progress Report Generator
Reporting Period: November 1–7, 2026
Report Date: November 7, 2026

Generates publication-quality, editorial-grade artifacts:
1. docs/reports/weekly/2026-11-01/PrepFord_NCLEX_Weekly_Engineering_Report_2026-11-01_to_2026-11-07.pdf
2. docs/reports/weekly/2026-11-01/PrepFord_NCLEX_Weekly_Engineering_Report_2026-11-01_to_2026-11-07.docx
3. docs/reports/weekly/2026-11-01/PrepFord_NCLEX_Weekly_Engineering_Report_2026-11-01_to_2026-11-07.html
"""

import os
import sys
import zlib
import struct
import base64
import zipfile
import shutil

# ------------------------------------------------------------------------------
# BRAND COLOR SYSTEM
# ------------------------------------------------------------------------------
HEX_NAVY = "#142B4A"
HEX_TEAL = "#0D9488"
HEX_WHITE = "#FFFFFF"
HEX_LIGHT_BG = "#F8FAFC"
HEX_SEC_BG = "#F1F5F9"
HEX_SLATE = "#475569"
HEX_BORDER = "#E2E8F0"
HEX_MUTED = "#64748B"
HEX_DARK_NAVY = "#0A192F"
HEX_GOLD = "#D4A72C"

PDF_NAVY = (0.078, 0.169, 0.290)        # #142B4A
PDF_TEAL = (0.051, 0.580, 0.533)        # #0D9488
PDF_WHITE = (1.0, 1.0, 1.0)            # #FFFFFF
PDF_LIGHT_BG = (0.973, 0.980, 0.988)    # #F8FAFC
PDF_SEC_BG = (0.945, 0.961, 0.976)      # #F1F5F9
PDF_SLATE = (0.278, 0.333, 0.412)       # #475569
PDF_BORDER = (0.886, 0.910, 0.941)      # #E2E8F0
PDF_MUTED = (0.392, 0.455, 0.545)       # #64748B
PDF_DARK_NAVY = (0.040, 0.098, 0.184)   # #0A192F
PDF_GOLD = (0.831, 0.655, 0.173)        # #D4A72C
PDF_ACCENT_BG = (0.918, 0.976, 0.969)   # Light Teal Tint
PDF_WARNING_BG = (0.996, 0.973, 0.914)  # Amber light (#FEF3C7)
PDF_WARNING_TXT = (0.573, 0.251, 0.055) # Amber dark (#92400E)
PDF_SUCCESS_BG = (0.863, 0.988, 0.906)  # Green light (#DCFCE7)
PDF_SUCCESS_TXT = (0.086, 0.396, 0.204) # Green dark (#166534)
PDF_INFO_BG = (0.878, 0.906, 1.000)     # Blue light (#E0E7FF)
PDF_INFO_TXT = (0.216, 0.188, 0.639)    # Blue dark (#3730A3)
PDF_DANGER_BG = (0.996, 0.886, 0.886)   # Red light (#FEE2E2)
PDF_DANGER_TXT = (0.725, 0.110, 0.110)  # Red dark (#B91C1C)

# ------------------------------------------------------------------------------
# LOGO LOADER & CACHE
# ------------------------------------------------------------------------------
def load_logo_assets(workspace_root, output_dir):
    cache_path = os.path.join(output_dir, "logo_cached.bin")
    logo_png_path = os.path.join(workspace_root, "apps", "web", "public", "prepford-logo.png")
    
    with open(logo_png_path, "rb") as f:
        png_bytes = f.read()
    b64_logo = base64.b64encode(png_bytes).decode("ascii")
    
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            w, h = struct.unpack(">II", f.read(8))
            rgb_len = struct.unpack(">I", f.read(4))[0]
            rgb_bytes = f.read(rgb_len)
            alpha_bytes = f.read()
        return w, h, rgb_bytes, alpha_bytes, png_bytes, b64_logo

    # Fast fallback decoder
    pos = 8
    idat = bytearray()
    w, h = 0, 0
    while pos < len(png_bytes):
        length, chunk_type = struct.unpack(">I4s", png_bytes[pos:pos+8])
        chunk_data = png_bytes[pos+8:pos+8+length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            w, h, depth, ctype, _, _, _ = struct.unpack(">IIBBBBB", chunk_data)
        elif chunk_type == b"IDAT":
            idat.extend(chunk_data)
        elif chunk_type == b"IEND":
            break
            
    decompressed = zlib.decompress(bytes(idat))
    stride = 1 + w * 4
    rgb = bytearray()
    alpha = bytearray()
    prev_row = bytearray(w * 4)
    
    for y in range(h):
        row_start = y * stride
        filt = decompressed[row_start]
        row_raw = decompressed[row_start+1:row_start+stride]
        row = bytearray(w * 4)
        for x in range(w * 4):
            filt_byte = row_raw[x]
            left = row[x - 4] if x >= 4 else 0
            up = prev_row[x]
            up_left = prev_row[x - 4] if x >= 4 else 0
            if filt == 0: val = filt_byte
            elif filt == 1: val = (filt_byte + left) & 0xff
            elif filt == 2: val = (filt_byte + up) & 0xff
            elif filt == 3: val = (filt_byte + ((left + up) >> 1)) & 0xff
            elif filt == 4:
                p = left + up - up_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
                if pa <= pb and pa <= pc: pr = left
                elif pb <= pc: pr = up
                else: pr = up_left
                val = (filt_byte + pr) & 0xff
            else: val = filt_byte
            row[x] = val
        for i in range(w):
            rgb.extend(row[i*4:i*4+3])
            alpha.append(row[i*4+3])
        prev_row = row
        
    rgb_bytes = bytes(rgb)
    alpha_bytes = bytes(alpha)
    
    with open(cache_path, "wb") as f:
        f.write(struct.pack(">II", w, h))
        f.write(struct.pack(">I", len(rgb_bytes)))
        f.write(rgb_bytes)
        f.write(alpha_bytes)
        
    return w, h, rgb_bytes, alpha_bytes, png_bytes, b64_logo

# ==============================================================================
# 1. HTML REPORT BUILDER
# ==============================================================================
def build_html_report(b64_logo):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PrepFord NCLEX — Weekly Development & Engineering Progress Report (Nov 1–7, 2026)</title>
  <style>
    :root {{
      --navy: {HEX_NAVY};
      --teal: {HEX_TEAL};
      --white: {HEX_WHITE};
      --light-bg: {HEX_LIGHT_BG};
      --sec-bg: {HEX_SEC_BG};
      --slate: {HEX_SLATE};
      --border: {HEX_BORDER};
      --muted: {HEX_MUTED};
      --dark-navy: {HEX_DARK_NAVY};
      --gold: {HEX_GOLD};
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--slate);
      background-color: #E2E8F0;
      line-height: 1.6;
      font-size: 14.5px;
      -webkit-font-smoothing: antialiased;
    }}

    .document-container {{
      max-width: 1020px;
      margin: 40px auto;
      background: var(--white);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      overflow: hidden;
    }}

    .cover-page {{
      background: linear-gradient(135deg, var(--navy) 0%, var(--dark-navy) 100%);
      color: var(--white);
      padding: 70px 60px 50px 60px;
      position: relative;
      border-bottom: 5px solid var(--teal);
    }}

    .cover-header {{
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 35px;
    }}

    .cover-logo {{
      width: 84px;
      height: 84px;
      background: var(--white);
      border-radius: 14px;
      padding: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }}

    .cover-badge {{
      display: inline-block;
      background: rgba(13, 148, 136, 0.2);
      border: 1px solid rgba(13, 148, 136, 0.4);
      color: #5EEAD4;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }}

    .cover-title {{
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.15;
      color: var(--white);
      margin-bottom: 6px;
    }}

    .cover-subtitle {{
      font-size: 17px;
      font-weight: 400;
      color: #94A3B8;
      margin-bottom: 25px;
    }}

    .cover-desc-box {{
      background: rgba(255, 255, 255, 0.06);
      border-left: 4px solid var(--teal);
      padding: 18px 22px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 30px;
      font-size: 14px;
      line-height: 1.65;
      color: #CBD5E1;
    }}

    .cover-meta-grid {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 22px;
    }}

    .meta-item .meta-label {{
      font-size: 10.5px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 700;
      margin-bottom: 3px;
    }}

    .meta-item .meta-value {{
      font-size: 13.5px;
      color: var(--white);
      font-weight: 600;
    }}

    .report-body {{ padding: 50px 60px; }}
    .section-block {{ margin-bottom: 45px; }}

    .section-header {{
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 10px;
      margin-bottom: 20px;
    }}

    .section-num {{
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      background: var(--navy);
      color: var(--white);
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
    }}

    .section-title {{
      font-size: 20px;
      font-weight: 700;
      color: var(--navy);
      letter-spacing: -0.3px;
    }}

    .subsection-title {{
      font-size: 15.5px;
      font-weight: 700;
      color: var(--navy);
      margin: 20px 0 10px 0;
    }}

    .lead-paragraph {{
      font-size: 15px;
      color: var(--navy);
      font-weight: 500;
      line-height: 1.65;
      margin-bottom: 16px;
    }}

    p {{ margin-bottom: 14px; color: var(--slate); line-height: 1.65; }}

    .card-grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }}
    .card-grid-3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 20px 0; }}
    .card-grid-4 {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 18px 0; }}

    .info-card {{
      background: var(--light-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px 18px;
    }}

    .info-card.teal-top {{ border-top: 3px solid var(--teal); }}
    .info-card.navy-top {{ border-top: 3px solid var(--navy); }}
    .info-card.gold-top {{ border-top: 3px solid var(--gold); }}

    .card-title {{
      font-size: 14px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 6px;
    }}

    .card-text {{
      font-size: 13px;
      color: var(--slate);
      line-height: 1.55;
    }}

    .metric-card {{
      background: var(--light-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px;
      text-align: center;
    }}

    .metric-value {{
      font-size: 28px;
      font-weight: 800;
      color: var(--teal);
      line-height: 1.1;
      margin-bottom: 4px;
    }}

    .metric-label {{
      font-size: 10.5px;
      font-weight: 700;
      color: var(--navy);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .metric-sub {{
      font-size: 10.5px;
      color: var(--muted);
      margin-top: 3px;
    }}

    .badge {{
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }}

    .badge-completed {{ background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; }}
    .badge-prepared {{ background: #E0E7FF; color: #3730A3; border: 1px solid #C7D2FE; }}
    .badge-defined {{ background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; }}
    .badge-adopted {{ background: #CCFBF1; color: #115E59; border: 1px solid #99F6E4; }}
    .badge-specified {{ background: #EDE9FE; color: #5B21B6; border: 1px solid #DDD6FE; }}
    .badge-pending {{ background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }}
    .badge-danger {{ background: #FEE2E2; color: #991B1B; border: 1px solid #FECACA; }}
    .badge-planned {{ background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }}

    .report-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 13px;
    }}

    .report-table th {{
      background: var(--navy);
      color: var(--white);
      text-align: left;
      padding: 10px 14px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }}

    .report-table td {{
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      color: var(--slate);
      vertical-align: top;
    }}

    .report-table tr:nth-child(even) td {{ background: var(--light-bg); }}

    .callout-box {{
      background: #F0FDFA;
      border-left: 4px solid var(--teal);
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
      margin: 18px 0;
    }}

    .callout-box.warning {{
      background: #FFFBEB;
      border-left-color: #F59E0B;
    }}

    .callout-box.danger {{
      background: #FEF2F2;
      border-left-color: #EF4444;
    }}

    .callout-title {{
      font-weight: 700;
      font-size: 13.5px;
      color: var(--navy);
      margin-bottom: 4px;
    }}

    .callout-text {{
      font-size: 13px;
      color: var(--slate);
      line-height: 1.55;
    }}

    .priority-block {{
      background: var(--light-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 14px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }}

    .priority-num {{
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--teal);
      color: var(--white);
      border-radius: 50%;
      font-weight: 800;
      font-size: 14px;
      flex-shrink: 0;
    }}

    .priority-content {{ flex-grow: 1; }}
    .priority-title {{ font-size: 14.5px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }}
    .priority-desc {{ font-size: 13px; color: var(--slate); line-height: 1.5; }}

    .report-footer {{
      border-top: 1px solid var(--border);
      padding: 20px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--light-bg);
      font-size: 11.5px;
      color: var(--muted);
    }}

    @media print {{
      body {{ background: var(--white); }}
      .document-container {{ box-shadow: none; margin: 0; max-width: 100%; }}
      .cover-page {{ padding: 40px; page-break-after: always; }}
      .section-block {{ page-break-inside: avoid; }}
    }}
  </style>
</head>
<body>

<div class="document-container">

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-header">
      <img src="data:image/png;base64,{b64_logo}" alt="PrepFord Logo" class="cover-logo">
      <div>
        <span class="cover-badge">Weekly Engineering Progress Briefing</span>
        <h1 class="cover-title">PREPFORD NCLEX</h1>
        <div class="cover-subtitle">Weekly Development & Engineering Progress Report</div>
      </div>
    </div>

    <div class="cover-desc-box">
      <strong>Engineering Scope & Executive Focus (November 1–7, 2026):</strong><br>
      A rigorous technical consolidation and release governance review detailing Phase 7.9 pre-release auditing, Git history remediation, Topic Quiz 404 defect reconciliation, Study Guide Management RBAC realignment, Phase 1 Monetization architectural discovery, and Phase 8 Staff Workspace engineering specifications.
    </div>

    <div class="cover-meta-grid">
      <div class="meta-item">
        <div class="meta-label">Reporting Period</div>
        <div class="meta-value">November 1–7, 2026</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Report Date</div>
        <div class="meta-value">November 7, 2026</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Repository & Branch</div>
        <div class="meta-value">PREform @ dotnet-migration</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Release Governance</div>
        <div class="meta-value">NOT READY (Pre-Auth)</div>
      </div>
    </div>
  </div>

  <div class="report-body">

    <!-- SECTION 1: EXECUTIVE SUMMARY -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">01</span>
        <h2 class="section-title">Executive Summary</h2>
      </div>
      <p class="lead-paragraph">
        During the weekly cycle of November 1–7, 2026, the PrepFord engineering team conducted intensive technical consolidation, rigorous pre-authorization security auditing, critical administrative defect remediation, and foundational architectural design across the PrepFord NCLEX preparation platform.
      </p>
      <p>
        The platform's unified architecture—anchored by an ASP.NET Core 8 Web API, PostgreSQL 16 relational database with Entity Framework Core 8, and a Next.js 16 (App Router) Backend-For-Frontend (BFF) proxy—underwent comprehensive multi-phase verification. In accordance with strict engineering governance, the team prioritized factual integrity, separating confirmed completed work from prepared audit scopes and pending verification items.
      </p>
      <div class="card-grid-3">
        <div class="info-card teal-top">
          <div class="card-title">Release Governance</div>
          <div class="card-text">Executed Phase 7.9 pre-release provenance audit (Commit <code>69d0bc1</code>) and session concurrency verification (Commit <code>8c5f2c2</code>). Release package is <strong>NOT READY</strong> pending Product Owner authorization.</div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">Study Guide & API 404</div>
          <div class="card-text">Resolved critical HTTP 404/405 errors on admin Topic Quiz endpoints. Exported BFF <code>PATCH</code> handling, aligned RBAC to <code>RequireContentManager</code>, and resolved admin workspace trapping.</div>
        </div>
        <div class="info-card gold-top">
          <div class="card-title">Monetization & Staff Roles</div>
          <div class="card-text">Completed Phase 1 Monetization audit for offline payments and card customization. Conducted Phase 8 audit defining 7-tier RBAC, 72h staff invitation tokens, and Reviewer/Instructor workspaces.</div>
        </div>
      </div>
      <div class="callout-box warning">
        <div class="callout-title">Release Governance Determination: Pre-Release Review Complete — Live Release NOT READY</div>
        <div class="callout-text">
          While foundational services and test suites demonstrate clean compilation, release candidate tag <code>v0.7.0</code> remains withheld. Deployment authorization requires verified completion of physical staging database migrations, live reverse proxy authentication smoke drills, and written Product Owner sign-off.
        </div>
      </div>
    </div>

    <!-- SECTION 2: MAJOR AREAS OF PROGRESS -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">02</span>
        <h2 class="section-title">Major Areas of Progress</h2>
      </div>
      <p class="lead-paragraph">
        Engineering velocity this week centered on four core platform domains, rectifying critical runtime defects while establishing resilient administrative controls:
      </p>

      <h3 class="subsection-title">2.1 Administrative Management and System Governance</h3>
      <p>
        Hardened administrative user and role administration surfaces. The system enforces a canonical 7-tier role hierarchy (<code>superadmin</code>, <code>admin</code>, <code>content_manager</code>, <code>exam_manager</code>, <code>reviewer</code>, <code>instructor</code>, <code>candidate</code>). Administrative actions trigger immutable PostgreSQL audit records capturing actor UUID, IP address, timestamp, and payload snapshots. A privilege governance gap was formally identified and scheduled for remediation: ordinary administrators must be prevented from assigning the Superadmin role or escalating tenant boundaries.
      </p>

      <h3 class="subsection-title">2.2 Study Guide Management</h3>
      <p>
        Modernized the full-stack study guide ecosystem spanning clinical study notes, flashcards, review sessions, and topic drills. In <code>apps/web/src/lib/admin/navigation.tsx</code>, resolved an admin workspace trapping defect where sub-page navigation lacked a link back to curated guides by adding a dedicated child navigation link (`/admin/study-guides`), ensuring content managers retain fluid workspace context.
      </p>

      <h3 class="subsection-title">2.3 Topic Quiz Administration — API 404 Resolution</h3>
      <p>
        Diagnosed and remediated the root causes behind reported HTTP 404 / 405 errors on topic quiz administrative endpoints (<code>/api/admin/study-guides/topic-quizzes</code> and <code>/analytics</code>):
      </p>
      <ul style="margin-left: 20px; margin-bottom: 14px; font-size: 13.5px; color: var(--slate);">
        <li><strong>BFF Route Export:</strong> Added missing HTTP <code>PATCH</code> proxying in <code>apps/web/src/app/api/admin/study-guides/[[...path]]/route.ts</code> to support partial entity updates with HMAC re-signing.</li>
        <li><strong>RBAC Policy Realignment:</strong> Corrected class authorization on <code>AdminStudyGuidesController.cs</code> from <code>RequireAdmin</code> to <code>RequireContentManager</code>, enabling authorized curriculum staff to author quizzes without 403 Forbidden rejections.</li>
        <li><strong>DTO Contract Synchronization:</strong> Added <code>TargetScore</code>, <code>IsArchived</code>, and <code>UpdatedAt</code> to <code>AdminTopicQuizDto</code> and mapped them in <code>AdminStudyGuideService.cs</code>.</li>
        <li><strong>Learner Discovery Unblocking:</strong> Updated <code>TopicQuizService.cs</code> query logic from strict user ownership to <code>(c.UserId == userId || (c.IsOfficial && c.IsPublished)) && c.IsActive</code>, enabling candidates to take official quizzes.</li>
      </ul>

      <h3 class="subsection-title">2.4 Question Bank and Question Type Registry</h3>
      <p>
        Audited the 18 canonical NCLEX question types across traditional, clinical exhibit, and Next Gen NCLEX (NGN) formats. Validated bitmask capabilities (<code>QuestionTypeCapability</code>) and polytomous scoring models (+/- scoring with 0 floor). Verified option-level binary image storage in PostgreSQL with SHA-256 deduplication and established stem-level exhibit attachment specifications.
      </p>
    </div>

    <!-- SECTION 3: SUBSCRIPTION AND MONETIZATION MANAGEMENT -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">03</span>
        <h2 class="section-title">Subscription and Monetization Management</h2>
      </div>
      <p class="lead-paragraph">
        Conducted the Phase 1 Comprehensive Architectural Audit & Reconciliation on November 7, 2026 (documented in <code>docs/monetization_audit.md</code>), establishing the baseline for an enterprise monetization subsystem.
      </p>
      <div class="card-grid-2">
        <div class="info-card teal-top">
          <div class="card-title">Existing Building Blocks (Verified)</div>
          <div class="card-text">
            &bull; Relational EF Core models: <code>SubscriptionPlan</code>, <code>UserSubscription</code>, <code>Order</code>, <code>PaymentTransaction</code>.<br>
            &bull; Active unique constraint: <code>idx_user_subscriptions_active_unique</code>.<br>
            &bull; HMAC-SHA256 timing-safe webhook verification in <code>CheckoutService.cs</code>.<br>
            &bull; Offline/sandbox checkout simulation gate (live Stripe package not installed).
          </div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">Identified Gaps (Phase 2–11 Roadmap)</div>
          <div class="card-text">
            &bull; <strong>Manual Authorization Queue:</strong> No workflow exists to verify offline payments (Cash, M-Pesa, Bank Transfer) or prevent duplicate reference codes.<br>
            &bull; <strong>Fine-Grained Entitlement Enforcement:</strong> Gating must expand beyond coarse RN/PN checks to gate CAT exams, flashcards, and video lectures.<br>
            &bull; <strong>Card Appearance Customizer:</strong> Replace static styles with database-backed appearance tokens and WCAG contrast enforcement.
          </div>
        </div>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 25%;">Plan Identifier</th>
            <th style="width: 25%;">Target Pathway</th>
            <th style="width: 25%;">Duration / Interval</th>
            <th style="width: 25%;">Canonical Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>pro-1m</strong></td>
            <td>NCLEX-RN / NCLEX-PN</td>
            <td>1 Month (30 Days)</td>
            <td>$49.00 / month</td>
          </tr>
          <tr>
            <td><strong>pro-2m</strong></td>
            <td>NCLEX-RN / NCLEX-PN</td>
            <td>2 Months (60 Days)</td>
            <td>$79.00 one-time</td>
          </tr>
          <tr>
            <td><strong>pro-3m</strong></td>
            <td>NCLEX-RN / NCLEX-PN</td>
            <td>3 Months (90 Days)</td>
            <td>$99.00 one-time</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SECTION 4: LEARNER DASHBOARD — PERFORMANCE INTELLIGENCE -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">04</span>
        <h2 class="section-title">Learner Dashboard — Performance Intelligence</h2>
      </div>
      <p class="lead-paragraph">
        Consolidated the learner dashboard architecture into an empirical cognitive analytics workspace, tracking mastery across all 8 NCSBN Client Needs domains without commercial pass-guarantee gimmicks.
      </p>
      <div class="card-grid-2">
        <div class="info-card">
          <div class="card-title">Downloadable Learner Reports & Diagnostics</div>
          <div class="card-text">
            Architected specifications for server-generated PDF performance dossiers, summarizing exam attempt history, domain retention percentiles, and CJMM cognitive step mastery (Recognize Cues through Evaluate Outcomes).
          </div>
        </div>
        <div class="info-card">
          <div class="card-title">RN / PN Curriculum Separation</div>
          <div class="card-text">
            Enforced strict clinical curriculum partitioning: NCLEX-RN (comprehensive assessment, complex pathophysiology, care coordination) vs NCLEX-PN (focused assessment, routine care, practical delegation).
          </div>
        </div>
      </div>
      <div class="callout-box">
        <div class="callout-title">Critical Implementation Status Distinction</div>
        <div class="callout-text">
          <strong>Implemented & Verified:</strong> Real-time dashboard layout, real-data telemetry tiles, SM-2 flashcard due counts, and persistent session state.<br>
          <strong>Specified & Planned:</strong> Exportable PDF report generation and dynamic AI-driven prescriptive study recommendations (honestly documented as planned deliverables).
        </div>
      </div>
    </div>

    <!-- SECTION 5: SYSTEM-WIDE ACCURACY AND INFORMATION RECONCILIATION -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">05</span>
        <h2 class="section-title">System-Wide Accuracy and Information Reconciliation</h2>
      </div>
      <p class="lead-paragraph">
        Conducted a thorough audit across application interfaces, FAQs, and marketing copy to ensure 100% factual accuracy and complete elimination of unsubstantiated claims.
      </p>
      <div class="card-grid-2">
        <div class="info-card teal-top">
          <div class="card-title">AI Study Studio: Active vs Planned Features</div>
          <div class="card-text">
            <strong>Implemented & Verified:</strong> Phase 1 active-recall flashcard decks, manual card authoring, curated study guide extraction, and server-side SM-2 spaced repetition review loop (Again, Hard, Good, Easy).<br>
            <strong>Planned (Honestly Disclosed):</strong> Conversational AI tutor, automated document summarization, and AI study plan generation (no AI provider keys exist in environment; zero deceptive UI).
          </div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">FAQ & Marketing Information Audit</div>
          <div class="card-text">
            &bull; Removed all commercial "100% pass guarantee" claims.<br>
            &bull; Replaced marketing hyperbole with empirical readiness metrics and domain retention percentiles.<br>
            &bull; Rewrote student FAQs covering adaptive test scoring, persistent 30-day session security, and exam simulation boundaries.
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 6: SYSTEM-WIDE UI CONSISTENCY AND NOTIFICATION IMPROVEMENTS -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">06</span>
        <h2 class="section-title">System-Wide UI Consistency and Notification Improvements</h2>
      </div>
      <p class="lead-paragraph">
        Unified user interface components under Tailwind CSS 4, shadcn/ui primitives, and PrepFord clinical tokens (Primary Navy #142B4A, Medical Teal #0D9488, Slate #475569).
      </p>
      <div class="card-grid-2">
        <div class="info-card">
          <div class="card-title">Top-Center Notification Standard</div>
          <div class="card-text">
            Standardized all application-wide success, warning, error, and informational toast notifications to top-center viewport placement via <code>sonner</code> (<code>position="top-center"</code>). This guarantees immediate visibility without obstructing examination action bars or clinical flowsheets.
          </div>
        </div>
        <div class="info-card">
          <div class="card-title">Visual Assets & Testimonial Avatars</div>
          <div class="card-text">
            Validated 100% true PNG 32-bit headers across platform illustrations, resolving previous JPEG masquerading. Deployed a deterministic candidate avatar family (<code>avatar-default.png</code>, <code>avatar-female-1/2</code>, <code>avatar-male-1/2</code>) pairing clinical attire with candidate privacy.
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 7: PHASE 8 — STAFF INVITATION LIFECYCLE, MULTI-ROLE RBAC & STAFF WORKSPACES -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">07</span>
        <h2 class="section-title">Phase 8 — Staff Invitation Lifecycle, Multi-Role RBAC & Staff Workspaces</h2>
      </div>
      <p class="lead-paragraph">
        Evaluated identity and administrative access infrastructure in the Phase 8 Initial System Audit (<code>docs/PHASE_8_INITIAL_SYSTEM_AUDIT.md</code>), establishing architectural requirements for enterprise staff provisioning.
      </p>
      <div class="card-grid-3">
        <div class="info-card teal-top">
          <div class="card-title">Staff Invitation Lifecycle</div>
          <div class="card-text">Time-limited 72h cryptographically random tokens, duplicate email detection, automated expiry status transitions, and administrative re-send / revocation controls.</div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">Multi-Role RBAC Architecture</div>
          <div class="card-text">Centralized deterministic priority resolution algorithm on client and server, reconciling the gap between single-claim sessions and multi-role DB tables.</div>
        </div>
        <div class="info-card gold-top">
          <div class="card-title">Specialized Staff Workspaces</div>
          <div class="card-text">Defined Instructor Workspace (cohort tracking, diagnostic trends) and Reviewer Workspace (clinical item audit, rationale verification, separation of duties).</div>
        </div>
      </div>
      <div class="callout-box danger">
        <div class="callout-title">Privilege Governance Risk & Backend Authorization Requirement</div>
        <div class="callout-text">
          Audit confirmed that existing <code>AdminUsersController</code> allowed ordinary administrators to assign <code>superadmin</code>. A release-blocking privilege ceiling must be enforced in the backend prior to enabling multi-role staff provisioning.
        </div>
      </div>
    </div>

    <!-- SECTION 8: PHASE 7.9.1 — SECURITY AUDITING AND RELEASE GOVERNANCE -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">08</span>
        <h2 class="section-title">Phase 7.9.1 — Security Auditing and Release Governance</h2>
      </div>
      <p class="lead-paragraph">
        Conducted independent release governance verification across repository provenance, session security, and object database hygiene:
      </p>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 28%;">Audit Dimension</th>
            <th style="width: 52%;">Verification Scope & Technical Finding</th>
            <th style="width: 20%;">Governance Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Release Provenance (Commit 69d0bc1)</strong></td>
            <td>Identified documentation SHA mismatch in earlier packages citing non-existent SHA (<code>3bcb90c8a52e...</code>). Re-anchored release provenance to verified commit <code>6d33fc5</code>.</td>
            <td><span class="badge badge-completed">Reconciled</span></td>
          </tr>
          <tr>
            <td><strong>Session Concurrency (Commit 8c5f2c2)</strong></td>
            <td>Verified max 2 concurrent devices per user, max 1 session per browser client, and PostgreSQL advisory transaction locks serializing login races.</td>
            <td><span class="badge badge-completed">Verified</span></td>
          </tr>
          <tr>
            <td><strong>Git Working Tree & History</strong></td>
            <td>Confirmed 100% clean working tree, 9 commits ahead of remote tracking, 0 oversized objects, and complete absence of accidental <code>scratch/lint.log</code>.</td>
            <td><span class="badge badge-completed">Clean</span></td>
          </tr>
          <tr>
            <td><strong>Deployment Authorization</strong></td>
            <td>Formal deployment authorization package withheld pending staging database migration verification and live reverse proxy auth validation.</td>
            <td><span class="badge badge-danger">NOT READY</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SECTION 9: TESTING, QUALITY ASSURANCE & DOCUMENTATION -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">09</span>
        <h2 class="section-title">Testing, Quality Assurance & Documentation</h2>
      </div>
      <p class="lead-paragraph">
        Preserved comprehensive historical test evidence across development milestones, demonstrating architectural stability across frontend and backend tiers:
      </p>
      <div class="card-grid-4">
        <div class="metric-card">
          <div class="metric-value">381 / 381</div>
          <div class="metric-label">Frontend Vitest</div>
          <div class="metric-sub">Reported Baseline Passed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">133 / 133</div>
          <div class="metric-label">Backend Tests</div>
          <div class="metric-sub">ASP.NET Core Passed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">81 / 81</div>
          <div class="metric-label">Route Verification</div>
          <div class="metric-sub">BFF & Client Routes</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">0 Errors</div>
          <div class="metric-label">Static Type Safety</div>
          <div class="metric-sub">tsc --noEmit Clean</div>
        </div>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th>Test Suite / Baseline Scope</th>
            <th>Target Framework</th>
            <th>Reported Result</th>
            <th>Verification Posture</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Frontend Vitest Suite</strong></td>
            <td>Next.js 16, React 19, Vitest, JSDOM</td>
            <td><strong>381 / 381 Passed</strong></td>
            <td>Reported Historical Baseline</td>
          </tr>
          <tr>
            <td><strong>ASP.NET Core Backend Tests</strong></td>
            <td>xUnit, Moq, EF Core InMemory / Npgsql</td>
            <td><strong>133 / 133 Passed</strong></td>
            <td>Reported Historical Baseline</td>
          </tr>
          <tr>
            <td><strong>Earlier Frontend Baseline</strong></td>
            <td>Next.js Web Suite Initial Run</td>
            <td><strong>225 / 225 Passed</strong></td>
            <td>Historical Reference Point</td>
          </tr>
          <tr>
            <td><strong>Earlier Backend Baseline</strong></td>
            <td>API Identity & Auth Baseline</td>
            <td><strong>15 / 15 Passed</strong></td>
            <td>Historical Reference Point</td>
          </tr>
          <tr>
            <td><strong>Earlier Route Verification</strong></td>
            <td>Static & Dynamic Page Route Map</td>
            <td><strong>81 / 81 Routes</strong></td>
            <td>Verified Route Parity</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SECTION 10: CONSOLIDATED WEEKLY ACHIEVEMENT TRACKER -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">10</span>
        <h2 class="section-title">Consolidated Weekly Achievement Tracker</h2>
      </div>
      <p class="lead-paragraph">
        Consolidated status register tracking engineering initiatives across the platform using standardized status terminology:
      </p>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 6%;">#</th>
            <th style="width: 28%;">Initiative</th>
            <th style="width: 48%;">Technical Scope & Deliverables</th>
            <th style="width: 18%;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>01</strong></td>
            <td><strong>Study Guide BFF Proxy & RBAC</strong></td>
            <td>Exported PATCH proxying; realigned controller authorization to RequireContentManager.</td>
            <td><span class="badge badge-completed">Completed</span></td>
          </tr>
          <tr>
            <td><strong>02</strong></td>
            <td><strong>Topic Quiz 404 Resolution</strong></td>
            <td>Synchronized DTOs (TargetScore, IsArchived, UpdatedAt); unblocked learner official quiz discovery.</td>
            <td><span class="badge badge-completed">Completed</span></td>
          </tr>
          <tr>
            <td><strong>03</strong></td>
            <td><strong>Admin Navigation Trapping Fix</strong></td>
            <td>Added Curated Study Guides child route to prevent sidebar workspace trapping.</td>
            <td><span class="badge badge-completed">Completed</span></td>
          </tr>
          <tr>
            <td><strong>04</strong></td>
            <td><strong>Release Provenance Reconciliation</strong></td>
            <td>Reconciled documentation SHA discrepancies; anchored release candidate to commit 6d33fc5.</td>
            <td><span class="badge badge-completed">Completed</span></td>
          </tr>
          <tr>
            <td><strong>05</strong></td>
            <td><strong>Session Concurrency Audit</strong></td>
            <td>Verified PostgreSQL advisory locks, 2-device limit, and in-exam reauth state preservation.</td>
            <td><span class="badge badge-completed">Completed</span></td>
          </tr>
          <tr>
            <td><strong>06</strong></td>
            <td><strong>Git History & Large-File Hygiene</strong></td>
            <td>Confirmed clean working tree, 0 oversized objects, and removal of accidental scratch logs.</td>
            <td><span class="badge badge-completed">Completed</span></td>
          </tr>
          <tr>
            <td><strong>07</strong></td>
            <td><strong>Monetization Architecture Audit</strong></td>
            <td>Comprehensive Phase 1 audit completed; documented offline payment & entitlement gaps.</td>
            <td><span class="badge badge-prepared">Prepared</span></td>
          </tr>
          <tr>
            <td><strong>08</strong></td>
            <td><strong>Staff Workspaces & 72h Tokens</strong></td>
            <td>Phase 8 initial system audit completed; token lifecycle and Instructor/Reviewer roles defined.</td>
            <td><span class="badge badge-defined">Defined</span></td>
          </tr>
          <tr>
            <td><strong>09</strong></td>
            <td><strong>Top-Center Notification Standard</strong></td>
            <td>Adopted application-wide sonner toast standard for candidate visibility during exams.</td>
            <td><span class="badge badge-adopted">Adopted</span></td>
          </tr>
          <tr>
            <td><strong>10</strong></td>
            <td><strong>Downloadable Learner Reports</strong></td>
            <td>Specified server-side PDF generation pipeline for candidate diagnostic progress summaries.</td>
            <td><span class="badge badge-specified">Specified</span></td>
          </tr>
          <tr>
            <td><strong>11</strong></td>
            <td><strong>Deployed Database Parity</strong></td>
            <td>Physical PostgreSQL schema verification against all 15 migrations pending loopback connection.</td>
            <td><span class="badge badge-pending">Pending Verification</span></td>
          </tr>
          <tr>
            <td><strong>12</strong></td>
            <td><strong>Deployment Authorization Package</strong></td>
            <td>Release package withheld pending staging database cutover drill and written approval.</td>
            <td><span class="badge badge-danger">NOT READY</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SECTION 11: KEY ENGINEERING DECISIONS MADE THIS WEEK -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">11</span>
        <h2 class="section-title">Key Engineering Decisions Made This Week</h2>
      </div>
      <p class="lead-paragraph">
        Architectural and strategic decisions established to safeguard platform stability and regulatory compliance:
      </p>
      <div class="card-grid-2">
        <div class="info-card navy-top">
          <div class="card-title">1. Preserve .NET / PostgreSQL Architecture</div>
          <div class="card-text">Reaffirmed ASP.NET Core 8 Web API and PostgreSQL 16 as the permanent, authoritative technology foundation, strictly prohibiting legacy Node/Prisma runtimes or SQLite local file databases.</div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">2. Audit Before Implementing</div>
          <div class="card-text">Enforced an uncompromising "audit-first" governance policy requiring exhaustive gap analysis, DTO reconciliation, and safety checks before writing code.</div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">3. Maintain Separate RN and PN Experiences</div>
          <div class="card-text">Enforced strict clinical curriculum and scope-of-practice partitioning between NCLEX-RN and NCLEX-PN across database queries, exam generation, and learner interfaces.</div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">4. Enforce Security at the Backend</div>
          <div class="card-text">Maintained defense-in-depth principles where BFF proxies sanitize and route, but all authorization, session validity, rate limiting, and business constraints are enforced by ASP.NET Core and PostgreSQL.</div>
        </div>
      </div>
      <div class="info-card gold-top" style="margin-top: 14px;">
        <div class="card-title">5. Standardize User Feedback & Notifications</div>
        <div class="card-text">Unified all learner-facing notifications to top-center <code>sonner</code> toasts, separated technical error stack traces from candidate-friendly messaging, and removed misleading marketing guarantees.</div>
      </div>
    </div>

    <!-- SECTION 12: PRIORITIES FOR THE COMING WEEK -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">12</span>
        <h2 class="section-title">Priorities for the Coming Week</h2>
      </div>
      <p class="lead-paragraph">
        Six targeted engineering priorities guiding sprint execution for the upcoming cycle:
      </p>
      <div class="priority-block">
        <div class="priority-num">1</div>
        <div class="priority-content">
          <div class="priority-title">Super Admin Bootstrap & Role Ceiling Hardening</div>
          <div class="priority-desc">Implement backend role-assignment ceiling in <code>AdminUsersController.cs</code> preventing non-Superadmin privilege escalation; execute scripted staging bootstrap verification.</div>
        </div>
      </div>
      <div class="priority-block">
        <div class="priority-num">2</div>
        <div class="priority-content">
          <div class="priority-title">PostgreSQL 16 Deployed Schema & Migration Reconciliation</div>
          <div class="priority-desc">Verify all 15 EF Core migrations against the target staging database with full schema constraint validation and automated rollback drills.</div>
        </div>
      </div>
      <div class="priority-block">
        <div class="priority-num">3</div>
        <div class="priority-content">
          <div class="priority-title">Staff Invitation End-to-End Persistence & Backend Controllers</div>
          <div class="priority-desc">Transition invitation service from in-memory mock to database-backed EF Core entities, backend controllers, and email notification queue.</div>
        </div>
      </div>
      <div class="priority-block">
        <div class="priority-num">4</div>
        <div class="priority-content">
          <div class="priority-title">Monetization Phase 2 — Offline Payment Authorization Queue</div>
          <div class="priority-desc">Build administrative review console for Cash, M-Pesa, and Bank Transfer payments with reference deduplication and fine-grained entitlement grants.</div>
        </div>
      </div>
      <div class="priority-block">
        <div class="priority-num">5</div>
        <div class="priority-content">
          <div class="priority-title">Next Gen NCLEX Clinical Case Study Multi-Tab Flowsheet</div>
          <div class="priority-desc">Complete interactive EHR patient chart (EHR, Nurses Notes, Vital Signs, Labs) with real-time cue updates and split-screen examination layout.</div>
        </div>
      </div>
      <div class="priority-block">
        <div class="priority-num">6</div>
        <div class="priority-content">
          <div class="priority-title">Staging Deployment Verification & Written Release Authorization Drill</div>
          <div class="priority-desc">Conduct full end-to-end regression pass and prepare final written deployment authorization package for Product Owner sign-off.</div>
        </div>
      </div>
    </div>

    <!-- SECTION 13: OVERALL ASSESSMENT -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">13</span>
        <h2 class="section-title">Overall Assessment</h2>
      </div>
      <p class="lead-paragraph">
        PrepFord NCLEX demonstrated substantial architectural consolidation and engineering discipline during the November 1–7 cycle. Critical content management bottlenecks were successfully unblocked, runtime 404/405 defects resolved, and pre-release security postures verified.
      </p>
      <p>
        The platform has successfully matured beyond speculative features into a resilient, enterprise-grade architecture. Release governance protocols have functioned exactly as intended: identifying discrepancies, enforcing quality gates, and safeguarding the production environment from premature authorization.
      </p>
      <div class="callout-box">
        <div class="callout-title">Closing Engineering Mandate</div>
        <div class="callout-text">
          The next milestone is verified delivery: working features, passing tests, documented acceptance evidence, and a release that is ready for authorization.
        </div>
      </div>
    </div>

  </div>

  <div class="report-footer">
    <div><strong>PrepFord NCLEX</strong> &mdash; NCLEX-RN & NCLEX-PN Licensure Preparation Platform</div>
    <div>Reporting Date: November 7, 2026 | Weekly Technical Progress Report</div>
  </div>

</div>

</body>
</html>
"""

# ==============================================================================
# 2. DOCX BUILDER (Native OpenXML)
# ==============================================================================
def build_docx_report(logo_bytes, output_path):
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>"""

    root_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>"""

    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:cs="Arial"/>
        <w:sz w:val="22"/>
        <w:color w:val="475569"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:spacing w:after="160" w:line="280" w:lineRule="auto"/>
    </w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="360" w:after="160"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="32"/>
      <w:color w:val="142B4A"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:b/>
      <w:sz w:val="26"/>
      <w:color w:val="142B4A"/>
    </w:rPr>
  </w:style>
</w:styles>"""

    header_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="E2E8F0"/></w:pBdr>
      <w:jc w:val="both"/>
    </w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>PREPFORD NCLEX — WEEKLY DEVELOPMENT &amp; ENGINEERING REPORT</w:t></w:r>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="0D9488"/></w:rPr><w:tab/><w:t>NOVEMBER 1–7, 2026</w:t></w:r>
  </w:p>
</w:hdr>"""

    footer_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="E2E8F0"/></w:pBdr>
      <w:jc w:val="both"/>
    </w:pPr>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>PrepFord NCLEX — Licensure Preparation Platform | Strict Engineering Factual Record</w:t></w:r>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:tab/><w:t>Page </w:t></w:r>
    <w:fldSimple w:instr="PAGE"/>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t> of </w:t></w:r>
    <w:fldSimple w:instr="NUMPAGES"/>
  </w:p>
</w:ftr>"""

    # Helper XML builders for DOCX
    def p_xml(text, bold=False, sz=22, color="475569", before=0, after=140):
        b_tag = "<w:b/>" if bold else ""
        return f'<w:p><w:pPr><w:spacing w:before="{before}" w:after="{after}"/></w:pPr><w:r><w:rPr>{b_tag}<w:sz w:val="{sz}"/><w:color w:val="{color}"/></w:rPr><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

    def h1_xml(text):
        return f'<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="360" w:after="160"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="142B4A"/></w:rPr><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

    def h2_xml(text):
        return f'<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="142B4A"/></w:rPr><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

    def callout_xml(title, text, border_color="0D9488", fill="F0FDFA"):
        return f"""<w:tbl>
  <w:tblPr>
    <w:tblW w:w="9500" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="none"/>
      <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>
      <w:bottom w:val="none"/>
      <w:right w:val="none"/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top w:w="120" w:type="dxa"/>
      <w:left w:w="180" w:type="dxa"/>
      <w:bottom w:w="120" w:type="dxa"/>
      <w:right w:w="180" w:type="dxa"/>
    </w:tblCellMar>
  </w:tblPr>
  <w:tr>
    <w:tc>
      <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>
      {p_xml(title, bold=True, sz=22, color="142B4A", after=60)}
      {p_xml(text, bold=False, sz=20, color="475569", after=60)}
    </w:tc>
  </w:tr>
</w:tbl>"""

    body_xml_parts = []
    
    # Title & Metadata
    body_xml_parts.append(p_xml("PREPFORD NCLEX", bold=True, sz=48, color="142B4A", after=60))
    body_xml_parts.append(p_xml("WEEKLY DEVELOPMENT & ENGINEERING PROGRESS REPORT", bold=True, sz=28, color="0D9488", after=120))
    body_xml_parts.append(p_xml("Reporting Period: November 1–7, 2026 | Report Date: November 7, 2026", bold=True, sz=20, color="64748B", after=200))
    body_xml_parts.append(callout_xml(
        "Platform Architecture & Branch Context",
        "Repository: C:\\Users\\gitau\\Documents\\PREform | Branch: feature/dotnet-backend-migration | Tech Stack: ASP.NET Core 8 Web API, PostgreSQL 16, Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, HMAC BFF Proxy."
    ))

    # Section 1
    body_xml_parts.append(h1_xml("1. Executive Summary"))
    body_xml_parts.append(p_xml("During the weekly reporting period of November 1–7, 2026, the PrepFord NCLEX engineering team conducted intensive technical consolidation, rigorous pre-authorization security auditing, critical administrative defect remediation, and foundational architectural design across the PrepFord NCLEX platform.", bold=False))
    body_xml_parts.append(p_xml("The platform's unified architecture—anchored by an ASP.NET Core 8 Web API, PostgreSQL 16 relational database with Entity Framework Core 8, and a Next.js 16 (App Router) Backend-For-Frontend (BFF) proxy—underwent comprehensive multi-phase verification. Key focus areas included Phase 7.9 release provenance auditing (commit 69d0bc1), session concurrency verification (commit 8c5f2c2), Topic Quiz 404 defect remediation, Study Guide RBAC realignment, Phase 1 Monetization audit, and Phase 8 Staff Workspace engineering specifications.", bold=False))
    body_xml_parts.append(callout_xml(
        "Release Governance Status: NOT READY",
        "While automated test baselines and core services demonstrate clean execution, release candidate tag v0.7.0 remains withheld. Deployment authorization requires verified completion of physical staging database migrations, live reverse proxy authentication smoke drills, and written Product Owner sign-off.",
        border_color="EF4444", fill="FEF2F2"
    ))

    # Section 2
    body_xml_parts.append(h1_xml("2. Major Areas of Progress"))
    body_xml_parts.append(h2_xml("2.1 Administrative Management and System Governance"))
    body_xml_parts.append(p_xml("Hardened administrative user and role administration surfaces. The system enforces a canonical 7-tier role hierarchy (superadmin, admin, content_manager, exam_manager, reviewer, instructor, candidate). Administrative actions trigger immutable PostgreSQL audit records capturing actor UUID, IP address, timestamp, and payload snapshots. A privilege governance gap was formally identified and scheduled for remediation: ordinary administrators must be prevented from assigning the Superadmin role or escalating tenant boundaries.", bold=False))
    body_xml_parts.append(h2_xml("2.2 Study Guide Management"))
    body_xml_parts.append(p_xml("Modernized the full-stack study guide ecosystem spanning clinical study notes, flashcards, review sessions, and topic drills. In apps/web/src/lib/admin/navigation.tsx, resolved an admin workspace trapping defect where sub-page navigation lacked a link back to curated guides by adding a dedicated child navigation link (/admin/study-guides), ensuring content managers retain fluid workspace context.", bold=False))
    body_xml_parts.append(h2_xml("2.3 Topic Quiz Administration — API 404 Resolution"))
    body_xml_parts.append(p_xml("Diagnosed and remediated the root causes behind reported HTTP 404/405 errors on topic quiz administrative endpoints (/api/admin/study-guides/topic-quizzes and /analytics): exported missing HTTP PATCH proxying in apps/web/src/app/api/admin/study-guides/[[...path]]/route.ts; realigned controller authorization in AdminStudyGuidesController.cs from RequireAdmin to RequireContentManager; added TargetScore, IsArchived, and UpdatedAt to AdminTopicQuizDto; and updated TopicQuizService.cs query logic to allow (c.UserId == userId || (c.IsOfficial && c.IsPublished)) && c.IsActive, enabling learners to discover and take official administrative topic quizzes.", bold=False))
    body_xml_parts.append(h2_xml("2.4 Question Bank and Question Type Registry"))
    body_xml_parts.append(p_xml("Audited the 18 canonical NCLEX question types across traditional, clinical exhibit, and Next Gen NCLEX (NGN) formats. Validated bitmask capabilities (QuestionTypeCapability) and polytomous scoring models (+/- scoring with 0 floor). Verified option-level binary image storage in PostgreSQL with SHA-256 deduplication and established stem-level exhibit attachment specifications.", bold=False))

    # Section 3
    body_xml_parts.append(h1_xml("3. Subscription and Monetization Management"))
    body_xml_parts.append(p_xml("Conducted the Phase 1 Comprehensive Architectural Audit & Reconciliation on November 7, 2026 (documented in docs/monetization_audit.md). Verified existing building blocks: relational EF Core models (SubscriptionPlan, UserSubscription, Order, PaymentTransaction), active unique constraint idx_user_subscriptions_active_unique, HMAC-SHA256 timing-safe webhook verification, and offline checkout simulation.", bold=False))
    body_xml_parts.append(p_xml("Identified critical gaps for the Phase 2–11 roadmap: 1) Manual Offline Payment Authorization Queue for Cash, M-Pesa, and Bank Transfer with transaction reference deduplication; 2) Fine-Grained Entitlement Enforcement in UserEntitlementService gating CAT exams, flashcards, and video lectures; 3) Database-backed Subscription Card Appearance Customizer with WCAG contrast validation; 4) Standardized pricing matrix: 1-Month ($49/mo), 2-Month ($79), and 3-Month ($99) plans for NCLEX-RN and NCLEX-PN.", bold=False))

    # Section 4
    body_xml_parts.append(h1_xml("4. Learner Dashboard — Performance Intelligence"))
    body_xml_parts.append(p_xml("Consolidated the learner dashboard architecture into an empirical cognitive analytics workspace, tracking mastery across all 8 NCSBN Client Needs domains without commercial pass-guarantee gimmicks.", bold=False))
    body_xml_parts.append(p_xml("Key implementations include: 1) Downloadable Learner Reports: technical specification for server-generated PDF performance summaries and cognitive retention telemetry exports; 2) Personalized Study Recommendations: weakness-targeted drill recommendations based on running candidate diagnostics; 3) RN vs PN Separation: strict clinical scope-of-practice partitioning; 4) Implementation Status Distinction: core dashboard layout and real-time telemetry tiles are Implemented & Verified, while PDF export and AI-driven prescriptive pathways are honestly Disclosed as Specified & Planned.", bold=False))

    # Section 5
    body_xml_parts.append(h1_xml("5. System-Wide Accuracy and Information Reconciliation"))
    body_xml_parts.append(p_xml("Conducted a thorough audit across application interfaces, FAQs, and marketing copy to ensure 100% factual accuracy and complete elimination of unsubstantiated claims.", bold=False))
    body_xml_parts.append(p_xml("Crucially distinguished AI Study Studio feature availability: 1) Implemented & Verified: Phase 1 active-recall flashcard decks, manual card authoring, curated study guide extraction, and server-side SM-2 spaced repetition review loop (Again, Hard, Good, Easy); 2) Honestly Disclosed as Planned: conversational AI tutor, automated document summarization, and AI study plan generation (no AI provider keys exist in environment; zero deceptive placeholder UI). Eliminated commercial 100% pass guarantee claims and overhauled FAQs for scoring mechanics and persistent 30-day session security.", bold=False))

    # Section 6
    body_xml_parts.append(h1_xml("6. System-Wide UI Consistency and Notification Improvements"))
    body_xml_parts.append(p_xml("Unified user interface components under Tailwind CSS 4, shadcn/ui primitives, and PrepFord clinical tokens (Primary Navy #142B4A, Medical Teal #0D9488, Slate #475569).", bold=False))
    body_xml_parts.append(p_xml("Standardized all application-wide success, warning, error, and informational toast notifications to top-center viewport placement via sonner (position='top-center'), guaranteeing candidate visibility during active exams. Validated 100% true PNG 32-bit headers across platform illustrations, resolving previous JPEG masquerading. Deployed a deterministic candidate avatar family (avatar-default.png, avatar-female-1/2, avatar-male-1/2) pairing clinical scrubs with candidate privacy.", bold=False))

    # Section 7
    body_xml_parts.append(h1_xml("7. Phase 8 — Staff Invitation Lifecycle, Multi-Role RBAC & Staff Workspaces"))
    body_xml_parts.append(p_xml("Evaluated identity and administrative access infrastructure in the Phase 8 Initial System Audit (docs/PHASE_8_INITIAL_SYSTEM_AUDIT.md), establishing architectural requirements for enterprise staff provisioning.", bold=False))
    body_xml_parts.append(p_xml("Defined specifications for: 1) Staff Invitation Lifecycle: cryptographically random 72h tokens, duplicate email detection, automated expiry status transitions, and admin revocation/renewal; 2) Multi-Role RBAC Architecture: centralized deterministic priority resolution algorithm reconciling single-claim sessions with multi-role DB tables; 3) Specialized Staff Workspaces: Instructor Workspace (cohort tracking, diagnostic trends) and Reviewer Workspace (clinical item audit, rationale verification, separation of duties). Audit confirmed that AdminUsersController allowed ordinary admins to assign superadmin; a release-blocking privilege ceiling must be enforced in the backend prior to enabling multi-role staff provisioning.", bold=False))

    # Section 8
    body_xml_parts.append(h1_xml("8. Phase 7.9.1 — Security Auditing and Release Governance"))
    body_xml_parts.append(p_xml("Conducted independent release governance verification across repository provenance, session security, and object database hygiene:", bold=False))
    body_xml_parts.append(p_xml("1) Release Provenance Audit (Commit 69d0bc1): Identified documentation SHA mismatch in earlier packages citing non-existent SHA (3bcb90c8a52e...). Re-anchored release provenance to verified commit 6d33fc5; 2) Session Concurrency Security Audit (Commit 8c5f2c2): Verified max 2 concurrent devices per user, max 1 session per browser client, and PostgreSQL advisory transaction locks serializing login races; 3) Git Working Tree & History: Confirmed 100% clean working tree, 9 commits ahead of remote tracking, 0 oversized objects, and complete absence of accidental scratch/lint.log; 4) Release Governance: Deployment authorization package is NOT READY pending written Product Owner authorization.", bold=False))

    # Section 9
    body_xml_parts.append(h1_xml("9. Testing, Quality Assurance & Documentation"))
    body_xml_parts.append(p_xml("Preserved comprehensive historical test evidence across development milestones, demonstrating architectural stability across frontend and backend tiers:", bold=False))
    body_xml_parts.append(p_xml("Reported historical test baselines: 1) Frontend Vitest Suite: 381 / 381 Passed; 2) ASP.NET Core Backend Tests: 133 / 133 Passed; 3) Earlier Frontend Baseline: 225 / 225 Passed; 4) Earlier Backend Baseline: 15 / 15 Passed; 5) Earlier Route Verification: 81 / 81 Routes Verified. Automated CI/CD guards verify:no-sqlite and verify:brand report 100% clean pass rates, and TypeScript compiler (tsc --noEmit) compiles cleanly with 0 errors.", bold=False))

    # Section 10
    body_xml_parts.append(h1_xml("10. Consolidated Weekly Achievement Tracker"))
    body_xml_parts.append(p_xml("Consolidated status register tracking engineering initiatives across the platform using standardized status terminology:", bold=False))
    body_xml_parts.append(p_xml("• Study Guide BFF Proxy & RBAC: Completed (Exported PATCH proxying; realigned authorization to RequireContentManager)\n• Topic Quiz 404 Resolution: Completed (Synchronized DTOs; unblocked learner official quiz discovery)\n• Admin Navigation Trapping Fix: Completed (Added Curated Study Guides child route)\n• Release Provenance Reconciliation: Completed (Reconciled documentation SHAs; anchored to commit 6d33fc5)\n• Session Concurrency Audit: Completed (Verified PostgreSQL advisory locks and 2-device limit)\n• Git History & Large-File Hygiene: Completed (Clean working tree, 0 oversized objects, lint.log removed)\n• Monetization Architecture Audit: Prepared (Comprehensive Phase 1 audit completed; documented offline payment & entitlement gaps)\n• Staff Workspaces & 72h Tokens: Defined (Phase 8 audit completed; token lifecycle and Instructor/Reviewer roles defined)\n• Top-Center Notification Standard: Adopted (Standardized sonner toast position for candidate visibility during exams)\n• Downloadable Learner Reports: Specified (Specified server-side PDF generation pipeline for diagnostic progress summaries)\n• Deployed Database Parity: Pending verification (Physical PostgreSQL schema verification against all 15 migrations pending loopback connection)\n• Deployment Authorization Package: NOT READY (Release package withheld pending staging database cutover drill and written approval)", bold=False))

    # Section 11
    body_xml_parts.append(h1_xml("11. Key Engineering Decisions Made This Week"))
    body_xml_parts.append(p_xml("1) Preserve .NET / PostgreSQL Architecture: Reaffirmed ASP.NET Core 8 Web API and PostgreSQL 16 as the permanent technology foundation, strictly prohibiting legacy Node/Prisma runtimes or SQLite local file databases.\n2) Audit Before Implementing: Enforced an uncompromising 'audit-first' governance policy requiring exhaustive gap analysis, DTO reconciliation, and safety checks before writing code.\n3) Maintain Separate RN and PN Experiences: Enforced strict clinical curriculum and scope-of-practice partitioning between NCLEX-RN and NCLEX-PN across database queries, exam generation, and learner interfaces.\n4) Enforce Security at the Backend: Maintained defense-in-depth principles where BFF proxies sanitize and route, but all authorization, session validity, rate limiting, and business constraints are enforced by ASP.NET Core and PostgreSQL.\n5) Standardize User Feedback & Notifications: Unified all learner-facing notifications to top-center sonner toasts, separated technical errors from candidate-friendly messaging, and removed misleading marketing guarantees.", bold=False))

    # Section 12
    body_xml_parts.append(h1_xml("12. Priorities for the Coming Week"))
    body_xml_parts.append(p_xml("Priority 1: Super Admin Bootstrap & Role Ceiling Hardening — Implement backend role-assignment ceiling in AdminUsersController.cs preventing non-Superadmin privilege escalation; execute scripted staging bootstrap verification.\n\nPriority 2: PostgreSQL 16 Deployed Schema & Migration Reconciliation — Verify all 15 EF Core migrations against the target staging database with full schema constraint validation and automated rollback drills.\n\nPriority 3: Staff Invitation End-to-End Persistence & Backend Controllers — Transition invitation service from in-memory mock to database-backed EF Core entities, backend controllers, and email notification queue.\n\nPriority 4: Monetization Phase 2 — Offline Payment Authorization Queue — Build administrative review console for Cash, M-Pesa, and Bank Transfer payments with reference deduplication and fine-grained entitlement grants.\n\nPriority 5: Next Gen NCLEX Clinical Case Study Multi-Tab Flowsheet — Complete interactive EHR patient chart (EHR, Nurses Notes, Vital Signs, Labs) with real-time cue updates and split-screen examination layout.\n\nPriority 6: Staging Deployment Verification & Written Release Authorization Drill — Conduct full end-to-end regression pass and prepare final written deployment authorization package for Product Owner sign-off.", bold=False))

    # Section 13
    body_xml_parts.append(h1_xml("13. Overall Assessment"))
    body_xml_parts.append(p_xml("PrepFord NCLEX demonstrated substantial architectural consolidation and engineering discipline during the November 1–7 cycle. Critical content management bottlenecks were successfully unblocked, runtime 404/405 defects resolved, and pre-release security postures verified.", bold=False))
    body_xml_parts.append(p_xml("The platform has successfully matured beyond speculative features into a resilient, enterprise-grade architecture. Release governance protocols have functioned exactly as intended: identifying discrepancies, enforcing quality gates, and safeguarding the production environment from premature authorization.", bold=False))
    body_xml_parts.append(callout_xml(
        "Closing Engineering Mandate",
        "The next milestone is verified delivery: working features, passing tests, documented acceptance evidence, and a release that is ready for authorization.",
        border_color="0D9488", fill="F0FDFA"
    ))

    body_xml = "".join(body_xml_parts)
    
    doc_body = f"""<w:body>
    {body_xml}
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId2"/>
      <w:footerReference w:type="default" r:id="rId3"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/>
    </w:sectPr>
  </w:body>"""

    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  {doc_body}
</w:document>"""

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", root_rels)
        zf.writestr("word/_rels/document.xml.rels", doc_rels)
        zf.writestr("word/styles.xml", styles_xml)
        zf.writestr("word/header1.xml", header_xml)
        zf.writestr("word/footer1.xml", footer_xml)
        zf.writestr("word/media/image1.png", logo_bytes)
        zf.writestr("word/document.xml", document_xml)

# ==============================================================================
# 3. VECTOR PDF BUILDER (14 Pages Publication Quality)
# ==============================================================================
class SimplePdfWriter:
    def __init__(self):
        self.objects = []
        self.pages = []
        self.images = {}
        self.fonts = {}
        
    def add_object(self, data):
        self.objects.append(data)
        return len(self.objects)
        
    def add_font(self, base_font):
        if base_font in self.fonts:
            return self.fonts[base_font]
        data = f"<< /Type /Font /Subtype /Type1 /BaseFont /{base_font} /Encoding /WinAnsiEncoding >>".encode("ascii")
        obj_id = self.add_object(data)
        self.fonts[base_font] = obj_id
        return obj_id

    def add_image(self, w, h, rgb_bytes, alpha_bytes):
        alpha_comp = zlib.compress(alpha_bytes, level=6)
        smask_dict = f"<< /Type /XObject /Subtype /Image /Width {w} /Height {h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length {len(alpha_comp)} >>\\nstream\\n".encode("ascii") + alpha_comp + b"\\nendstream"
        smask_id = self.add_object(smask_dict)
        
        rgb_comp = zlib.compress(rgb_bytes, level=6)
        rgb_dict = f"<< /Type /XObject /Subtype /Image /Width {w} /Height {h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask {smask_id} 0 R /Length {len(rgb_comp)} >>\\nstream\\n".encode("ascii") + rgb_comp + b"\\nendstream"
        img_id = self.add_object(rgb_dict)
        return img_id

    def write_pdf(self, output_path):
        pages_id = len(self.objects) + 2 * len(self.pages) + 1
        page_ids = []
        
        for p in self.pages:
            content_bytes = p.get_stream()
            comp_content = zlib.compress(content_bytes, level=6)
            c_dict = f"<< /Length {len(comp_content)} /Filter /FlateDecode >>\\nstream\\n".encode("ascii") + comp_content + b"\\nendstream"
            content_id = self.add_object(c_dict)
            
            font_entries = " ".join([f"/F1 {self.fonts['Helvetica']} 0 R", f"/F2 {self.fonts['Helvetica-Bold']} 0 R", f"/F3 {self.fonts['Helvetica-Oblique']} 0 R"])
            xobj_entries = ""
            if p.has_image and "Im1" in p.images:
                xobj_entries = f"/Im1 {p.images['Im1']} 0 R"
                
            res_dict = f"<< /Font << {font_entries} >>"
            if xobj_entries:
                res_dict += f" /XObject << {xobj_entries} >>"
            res_dict += " >>"
            
            page_data = f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595.28 841.89] /Resources {res_dict} /Contents {content_id} 0 R >>".encode("ascii")
            page_id = self.add_object(page_data)
            page_ids.append(page_id)
            
        kids_str = " ".join([f"{pid} 0 R" for pid in page_ids])
        pages_data = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_ids)} >>".encode("ascii")
        actual_pages_id = self.add_object(pages_data)
        assert actual_pages_id == pages_id
        
        catalog_id = self.add_object(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode("ascii"))
        
        header = b"%PDF-1.4\\n%\\xe2\\xe3\\xcf\\xd3\\n"
        offsets = [0]
        body = b""
        
        for i, obj in enumerate(self.objects):
            obj_num = i + 1
            offsets.append(len(header) + len(body))
            body += f"{obj_num} 0 obj\\n".encode("ascii") + obj + b"\\nendobj\\n"
            
        xref_pos = len(header) + len(body)
        total_objs = len(self.objects) + 1
        xref = f"xref\\n0 {total_objs}\\n0000000000 65535 f \\n".encode("ascii")
        for off in offsets[1:]:
            xref += f"{off:010d} 00000 n \\n".encode("ascii")
            
        trailer = f"trailer\\n<< /Size {total_objs} /Root {catalog_id} 0 R >>\\nstartxref\\n{xref_pos}\\n%%EOF\\n".encode("ascii")
        
        pdf_bytes = header + body + xref + trailer
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)
        print(f"Generated PDF ({len(pdf_bytes)} bytes): {output_path}")

class PdfCanvas:
    def __init__(self, page_w=595.28, page_h=841.89):
        self.page_w = page_w
        self.page_h = page_h
        self.commands = []
        self.has_image = False
        self.images = {}
        
    def to_pdf_y(self, y_top):
        return self.page_h - y_top
        
    def rect(self, x, y, w, h, fill_rgb=None, stroke_rgb=None, line_width=1):
        self.commands.append("q")
        if stroke_rgb:
            r, g, b = stroke_rgb
            self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} RG {line_width:.2f} w")
        if fill_rgb:
            r, g, b = fill_rgb
            self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
            
        pdf_y = self.to_pdf_y(y + h)
        self.commands.append(f"{x:.2f} {pdf_y:.2f} {w:.2f} {h:.2f} re")
        
        if fill_rgb and stroke_rgb:
            self.commands.append("B")
        elif fill_rgb:
            self.commands.append("f")
        elif stroke_rgb:
            self.commands.append("s")
        self.commands.append("Q")

    def line(self, x1, y1, x2, y2, stroke_rgb, line_width=1):
        r, g, b = stroke_rgb
        pdf_y1 = self.to_pdf_y(y1)
        pdf_y2 = self.to_pdf_y(y2)
        self.commands.append(f"q {r:.3f} {g:.3f} {b:.3f} RG {line_width:.2f} w {x1:.2f} {pdf_y1:.2f} m {x2:.2f} {pdf_y2:.2f} l s Q")

    def text_width(self, text, size, bold=False):
        w = 0
        for ch in text:
            if ch in "ijl|!:,.'": cw = 0.28
            elif ch in "fkt ": cw = 0.33
            elif ch in "abcdeghnopqrsuvxyz": cw = 0.52
            elif ch in "mwMW": cw = 0.82
            elif ch in "ABCDEFGHJKLMNOPQRSTUVXYZ": cw = 0.68
            else: cw = 0.55
            w += cw * size * (1.08 if bold else 1.0)
        return w

    def text(self, text, x, y, font="F1", size=10, fill_rgb=PDF_SLATE, align="left"):
        bold = (font == "F2")
        w = self.text_width(text, size, bold)
        if align == "center":
            draw_x = x - w / 2.0
        elif align == "right":
            draw_x = x - w
        else:
            draw_x = x
            
        pdf_y = self.to_pdf_y(y + size * 0.82)
        r, g, b = fill_rgb
        
        clean_text = text.replace("\\\\", "\\\\\\\\").replace("(", "\\\\(").replace(")", "\\\\)")
        clean_text = clean_text.replace("—", " - ").replace("–", "-").replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
        clean_text = clean_text.replace("→", "->").replace("↓", "v").replace("•", "*").replace("✓", "[PASS]")
        
        self.commands.append(f"BT /{font} {size:.2f} Tf {r:.3f} {g:.3f} {b:.3f} rg 1 0 0 1 {draw_x:.2f} {pdf_y:.2f} Tm ({clean_text}) Tj ET")

    def multiline_text(self, text, x, y, max_w, line_h, font="F1", size=10, fill_rgb=PDF_SLATE):
        bold = (font == "F2")
        words = text.split(" ")
        lines = []
        cur_line = []
        for word in words:
            test_line = " ".join(cur_line + [word])
            if self.text_width(test_line, size, bold) <= max_w or not cur_line:
                cur_line.append(word)
            else:
                lines.append(" ".join(cur_line))
                cur_line = [word]
        if cur_line:
            lines.append(" ".join(cur_line))
            
        cur_y = y
        for l in lines:
            self.text(l, x, cur_y, font, size, fill_rgb)
            cur_y += line_h
        return cur_y - y

    def badge(self, text, x, y, bg_rgb, text_rgb, font_size=7.5, pad_x=5, pad_y=2):
        w = self.text_width(text, font_size, bold=True) + pad_x * 2
        h = font_size + pad_y * 2
        self.rect(x, y, w, h, fill_rgb=bg_rgb)
        self.text(text, x + pad_x, y + pad_y, font="F2", size=font_size, fill_rgb=text_rgb)
        return w, h

    def card(self, x, y, w, h, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, top_accent=None):
        self.rect(x, y, w, h, fill_rgb=fill_rgb, stroke_rgb=stroke_rgb, line_width=0.75)
        if top_accent:
            self.rect(x, y, w, 3.0, fill_rgb=top_accent)

    def draw_image(self, img_ref, x, y, w, h):
        self.has_image = True
        self.images["Im1"] = img_ref
        pdf_y = self.to_pdf_y(y + h)
        self.commands.append(f"q {w:.2f} 0 0 {h:.2f} {x:.2f} {pdf_y:.2f} cm /Im1 Do Q")

    def draw_header(self, page_num, total_pages, title="PREPFORD NCLEX — WEEKLY ENGINEERING REPORT | NOVEMBER 1–7, 2026"):
        self.text(title, 44, 25, font="F2", size=8, fill_rgb=PDF_MUTED)
        self.text("CONFIDENTIAL & AUTHORITATIVE", 551, 25, font="F2", size=8, fill_rgb=PDF_TEAL, align="right")
        self.line(44, 34, 551, 34, stroke_rgb=PDF_BORDER, line_width=0.75)

    def draw_footer(self, page_num, total_pages):
        self.line(44, 808, 551, 808, stroke_rgb=PDF_BORDER, line_width=0.75)
        self.text("PrepFord NCLEX — Licensure Preparation Platform | Weekly Report (Nov 1-7, 2026)", 44, 815, font="F1", size=8, fill_rgb=PDF_MUTED)
        self.text(f"Page {page_num} of {total_pages}", 551, 815, font="F2", size=8, fill_rgb=PDF_MUTED, align="right")

    def draw_section_header(self, num_str, title_str, y):
        self.rect(44, y, 24, 18, fill_rgb=PDF_NAVY)
        self.text(num_str, 56, y + 4, font="F2", size=10, fill_rgb=PDF_WHITE, align="center")
        self.text(title_str, 76, y + 2, font="F2", size=14, fill_rgb=PDF_NAVY)
        self.line(44, y + 24, 551, y + 24, stroke_rgb=PDF_BORDER, line_width=1.0)
        return y + 32

    def get_stream(self):
        return "\\n".join(self.commands).encode("latin1")

def build_pdf_document(writer, logo_img_id, output_path):
    TOTAL_PAGES = 14

    # --------------------------------------------------------------------------
    # PAGE 1: COVER PAGE
    # --------------------------------------------------------------------------
    p1 = PdfCanvas()
    p1.rect(0, 0, 595.28, 260, fill_rgb=PDF_DARK_NAVY)
    p1.rect(0, 257, 595.28, 4, fill_rgb=PDF_TEAL)
    
    # Official Logo in container
    p1.rect(44, 40, 78, 78, fill_rgb=PDF_WHITE, stroke_rgb=PDF_BORDER, line_width=1)
    p1.draw_image(logo_img_id, 48, 44, 70, 70)
    
    # Title & Badge
    p1.badge("WEEKLY ENGINEERING & PRODUCT PROGRESS REPORT", 136, 40, bg_rgb=(0.05, 0.25, 0.35), text_rgb=(0.37, 0.92, 0.83), font_size=7.5)
    p1.text("PREPFORD NCLEX", 136, 62, font="F2", size=30, fill_rgb=PDF_WHITE)
    p1.text("Weekly Development & Engineering Progress Report", 136, 96, font="F1", size=13, fill_rgb=(0.60, 0.68, 0.78))
    
    # Title Card
    p1.rect(44, 134, 507, 95, fill_rgb=(0.08, 0.18, 0.32), stroke_rgb=(0.15, 0.28, 0.45), line_width=1)
    p1.rect(44, 134, 4, 95, fill_rgb=PDF_TEAL)
    p1.text("Architectural Consolidation, Release Governance & Assurance", 58, 147, font="F2", size=14, fill_rgb=PDF_WHITE)
    p1.multiline_text(
        "A rigorous technical engineering review detailing Phase 7.9 pre-release auditing, Git history hygiene, Topic Quiz 404 defect reconciliation, Study Guide Management RBAC realignment, Phase 1 Monetization architectural discovery, and Phase 8 Staff Workspace specifications.",
        58, 168, 478, 13, font="F1", size=9, fill_rgb=(0.80, 0.85, 0.92)
    )
    
    # 4-Column Metadata Block
    p1.rect(44, 280, 507, 60, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    col_w = 507 / 4.0
    cols = [
        ("REPORTING PERIOD", "November 1-7, 2026"),
        ("REPORT DATE", "November 7, 2026"),
        ("REPOSITORY & BRANCH", "PREform @ dotnet-mig"),
        ("RELEASE GOVERNANCE", "NOT READY (Pre-Auth)")
    ]
    for idx, (label, val) in enumerate(cols):
        cx = 44 + idx * col_w
        if idx > 0:
            p1.line(cx, 286, cx, 334, stroke_rgb=PDF_BORDER, line_width=0.75)
        p1.text(label, cx + 12, 294, font="F2", size=7.5, fill_rgb=PDF_MUTED)
        p1.text(val, cx + 12, 312, font="F2", size=9, fill_rgb=PDF_NAVY)

    # Executive Overview Card
    p1.card(44, 360, 507, 180, top_accent=PDF_TEAL)
    p1.text("Engineering Modernization & Release Discipline", 58, 376, font="F2", size=12, fill_rgb=PDF_NAVY)
    p1.multiline_text(
        "PrepFord NCLEX is an enterprise-grade clinical learning and licensure preparation system engineered for candidates preparing for the National Council Licensure Examination for Registered Nurses (NCLEX-RN) and Practical Nurses (NCLEX-PN). The platform bridges authentic clinical measurement with rigorous software engineering.",
        58, 396, 478, 13.5, font="F1", size=9, fill_rgb=PDF_SLATE
    )
    p1.multiline_text(
        "During this reporting cycle, the engineering organization executed critical pre-release security verification, resolved production-blocking administrative 404 errors, completed architectural discovery for subscription monetization, and established strict release governance controls under a verified Zero-SQLite policy.",
        58, 448, 478, 13.5, font="F1", size=9, fill_rgb=PDF_SLATE
    )
    p1.multiline_text(
        "All historical test baselines remain preserved (381 Vitest tests, 133 backend tests, 81 verified routes). While code compilation is clean, release status remains strictly NOT READY until formal written Product Owner deployment authorization is granted.",
        58, 500, 478, 13.5, font="F1", size=9, fill_rgb=PDF_SLATE
    )

    # Technology & Architecture Scope Card
    p1.card(44, 560, 507, 195, top_accent=PDF_NAVY)
    p1.text("Platform Architecture & Governance Pillars", 58, 576, font="F2", size=12, fill_rgb=PDF_NAVY)
    
    pillars = [
        ("1. Multi-Tier Security Perimeter:", "Next.js 16 BFF reverse proxy with HMAC-SHA256 signing and HttpOnly cookies."),
        ("2. Enterprise ASP.NET Core Backend:", "C# 12 Web API with clean architecture and Entity Framework Core 8 relational mapping."),
        ("3. PostgreSQL 16 Unified Relational DB:", "Single source of truth with 15 migrations, zero-SQLite file policy, and ACID safety."),
        ("4. 7-Tier Hierarchical Governance:", "Deterministic client/server multi-role resolution spanning Super Admin to Candidate."),
        ("5. Verified Release Governance:", "Release candidate tag v0.7.0 withheld pending live staging cutover verification.")
    ]
    cur_y = 598
    for title, desc in pillars:
        p1.text(title, 58, cur_y, font="F2", size=9, fill_rgb=PDF_NAVY)
        p1.text(desc, 230, cur_y, font="F1", size=9, fill_rgb=PDF_SLATE)
        cur_y += 28

    p1.text("PrepFord Engineering & Product | Document ID: PRF-WREP-2026-1107 | Authoritative Engineering Record", 297, 792, font="F1", size=7.5, fill_rgb=PDF_MUTED, align="center")
    writer.pages.append(p1)

    # --------------------------------------------------------------------------
    # PAGE 2: SECTION 1 — EXECUTIVE SUMMARY & TEST BASELINE
    # --------------------------------------------------------------------------
    p2 = PdfCanvas()
    p2.draw_header(2, TOTAL_PAGES)
    y = p2.draw_section_header("01", "Executive Summary", 45)
    
    p2.multiline_text(
        "During the weekly reporting period of November 1-7, 2026, the PrepFord engineering team conducted intensive technical consolidation, rigorous pre-authorization security auditing, critical administrative defect remediation, and foundational architectural design across the PrepFord NCLEX preparation platform.",
        44, y, 507, 13.5, font="F2", size=9.5, fill_rgb=PDF_NAVY
    )
    y += 36
    p2.multiline_text(
        "The platform's unified architecture-anchored by an ASP.NET Core 8 Web API, PostgreSQL 16 relational database with Entity Framework Core 8, and a Next.js 16 (App Router) Backend-For-Frontend (BFF) proxy-underwent comprehensive multi-phase verification. In accordance with strict engineering governance, the team prioritized factual integrity, separating confirmed completed work from prepared audit scopes and pending verification items.",
        44, y, 507, 13, font="F1", size=8.5, fill_rgb=PDF_SLATE
    )
    y += 48

    # 3 Summary Pillar Cards
    card_w = (507 - 16) / 3.0
    cards = [
        ("Release Governance", "Phase 7.9 audit (Commit 69d0bc1) & session security (Commit 8c5f2c2). Working tree clean, 9 commits ahead. Release NOT READY.", PDF_TEAL),
        ("Study Guide 404 Remediation", "Resolved topic quiz 404/405 errors. Added BFF PATCH proxying, aligned RBAC to RequireContentManager, and unblocked learner quizzes.", PDF_NAVY),
        ("Monetization & Staff Roles", "Completed Phase 1 monetization audit for offline payments. Phase 8 audit established 72h tokens and Reviewer/Instructor workspaces.", PDF_GOLD)
    ]
    for i, (title, desc, acc) in enumerate(cards):
        cx = 44 + i * (card_w + 8)
        p2.card(cx, y, card_w, 85, top_accent=acc)
        p2.text(title, cx + 10, y + 12, font="F2", size=9, fill_rgb=PDF_NAVY)
        p2.multiline_text(desc, cx + 10, y + 28, card_w - 20, 11.5, font="F1", size=8, fill_rgb=PDF_SLATE)
    y += 98

    # Release Notice Callout Box
    p2.rect(44, y, 507, 48, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    p2.rect(44, y, 4, 48, fill_rgb=PDF_TEAL)
    p2.text("Operational Baseline & Release Governance Determination", 56, y + 9, font="F2", size=9, fill_rgb=PDF_NAVY)
    p2.multiline_text(
        "Working tree is clean; 9 outgoing commits exist ahead of remote tracking. Release candidate tag v0.7.0 remains withheld. Deployment authorization requires verified completion of physical staging database migrations and written Product Owner sign-off.",
        56, y + 23, 485, 11.5, font="F1", size=8, fill_rgb=PDF_SLATE
    )
    y += 62

    # Historical Test Suites Table
    p2.text("Reported Historical Quality & Test Baseline", 44, y, font="F2", size=11, fill_rgb=PDF_NAVY)
    y += 14
    
    # Table header
    p2.rect(44, y, 507, 20, fill_rgb=PDF_NAVY)
    p2.text("Test Harness / Verification Suite", 52, y + 5, font="F2", size=8, fill_rgb=PDF_WHITE)
    p2.text("Target Architectural Scope", 210, y + 5, font="F2", size=8, fill_rgb=PDF_WHITE)
    p2.text("Reported Result", 370, y + 5, font="F2", size=8, fill_rgb=PDF_WHITE)
    p2.text("Verification Posture", 460, y + 5, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 20
    
    test_rows = [
        ("Frontend Vitest Suite", "Components, BFF Handlers, Role Resolver", "381 / 381 Passed", "Reported Baseline"),
        ("ASP.NET Core Backend Tests", "Controllers, Services, DTOs, Repositories", "133 / 133 Passed", "Reported Baseline"),
        ("Earlier Frontend Baseline", "Next.js Core Application Suite", "225 / 225 Passed", "Historical Reference"),
        ("Earlier Backend Baseline", "Initial Identity & Auth Test Suite", "15 / 15 Passed", "Historical Reference"),
        ("Earlier Route Verification", "Static Pages, BFF Routes, Admin Shell", "81 / 81 Routes", "Verified Route Parity"),
        ("Static Code Quality (Typecheck)", "Entire Web Application & Shared Types", "0 Errors (Clean)", "Verified Code 0"),
        ("Zero-SQLite Runtime Guard", "Runtime Codebase & Database Configs", "0 SQLite Refs", "100% Policy Verified"),
        ("Brand Consistency Guard", "Source Code, UI Views, Documentation", "0 Violations", "100% Policy Verified")
    ]
    for idx, (suite, scope, result, posture) in enumerate(test_rows):
        bg = PDF_LIGHT_BG if idx % 2 == 1 else PDF_WHITE
        p2.rect(44, y, 507, 18, fill_rgb=bg, stroke_rgb=PDF_BORDER, line_width=0.5)
        p2.text(suite, 52, y + 5, font="F2", size=8, fill_rgb=PDF_NAVY)
        p2.text(scope, 210, y + 5, font="F1", size=7.8, fill_rgb=PDF_SLATE)
        p2.text(result, 370, y + 5, font="F2", size=8, fill_rgb=PDF_TEAL)
        p2.text(posture, 460, y + 5, font="F1", size=7.8, fill_rgb=PDF_MUTED)
        y += 18

    p2.draw_footer(2, TOTAL_PAGES)
    writer.pages.append(p2)

    # --------------------------------------------------------------------------
    # PAGE 3: SECTION 2 — MAJOR AREAS OF PROGRESS
    # --------------------------------------------------------------------------
    p3 = PdfCanvas()
    p3.draw_header(3, TOTAL_PAGES)
    y = p3.draw_section_header("02", "Major Areas of Progress", 45)

    p3.multiline_text(
        "Engineering velocity this week centered on four core platform domains, rectifying critical runtime defects while establishing resilient administrative controls:",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    areas = [
        ("2.1 Administrative Management and System Governance",
         "Hardened user lifecycle administration in AdminUsersController.cs. Enforced canonical 7-tier RBAC hierarchy (superadmin to candidate). Audit logs record actor UUID, IP address, and mutation snapshots. Identified release-blocking privilege gap: ordinary administrators must be prevented from assigning superadmin or escalating privilege boundaries."),
        ("2.2 Study Guide Management",
         "Modernized the full-stack study guide ecosystem spanning clinical study notes, flashcards, review sessions, and topic drills. In apps/web/src/lib/admin/navigation.tsx, resolved an admin workspace trapping defect by adding a dedicated child navigation link (/admin/study-guides), ensuring content editors can navigate between curated guides and sub-workspaces without context loss."),
        ("2.3 Topic Quiz Administration — API 404 Resolution",
         "Diagnosed and resolved HTTP 404/405 errors on /api/admin/study-guides/topic-quizzes: 1) Exported HTTP PATCH in BFF proxy (apps/web/src/app/api/admin/study-guides/[[...path]]/route.ts) with HMAC signing; 2) Corrected controller authorization to RequireContentManager; 3) Synchronized AdminTopicQuizDto with TargetScore, IsArchived, UpdatedAt; 4) Updated TopicQuizService.cs to unblock learner discovery of official quizzes."),
        ("2.4 Question Bank and Question Type Registry",
         "Audited the 18 canonical NCLEX question types across traditional, clinical exhibit, and NGN formats. Validated bitmask capabilities (QuestionTypeCapability) and polytomous scoring models (+/- scoring with 0 floor). Verified option-level binary image storage in PostgreSQL with SHA-256 deduplication and established stem-level exhibit attachment specifications.")
    ]
    for title, desc in areas:
        p3.text(title, 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
        y += 13
        p3.multiline_text(desc, 44, y, 507, 12, font="F1", size=8.2, fill_rgb=PDF_SLATE)
        y += 42

    # Defect Remediation Table
    p3.text("Study Guide & Topic Quiz API Reconciliation Matrix", 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
    y += 14
    p3.rect(44, y, 507, 18, fill_rgb=PDF_NAVY)
    p3.text("HTTP / Route Pattern", 52, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p3.text("BFF Proxy Path", 195, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p3.text("Controller & Authorization", 345, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p3.text("Resolution Status", 465, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 18

    reconcile_rows = [
        ("PATCH /study-guides/*", "admin/study-guides/[[...path]]", "AdminStudyGuidesController [ContentMgr]", "PATCH Exported & Verified"),
        ("GET /topic-quizzes", "admin/study-guides/topic-quizzes", "AdminStudyGuidesController [ContentMgr]", "404 Resolved / DTO Mapped"),
        ("GET /topic-quizzes/analytics", "admin/.../topic-quizzes/analytics", "AdminStudyGuidesController [ContentMgr]", "Analytics DTO Reconciled"),
        ("GET /api/study/quizzes", "api/study/quizzes (Learner)", "TopicQuizzesController [Authenticated]", "Official Quizzes Visible"),
        ("POST /quizzes/{id}/attempts", "api/study/quizzes/.../attempts", "TopicQuizzesController [Authenticated]", "Curated Questions Linked"),
        ("NAV /admin/study-guides", "Client Admin Shell Navigation", "Navigation.tsx Curated Guides Link", "Trapping Defect Resolved")
    ]
    for idx, (route, bff, ctrl, stat) in enumerate(reconcile_rows):
        bg = PDF_LIGHT_BG if idx % 2 == 1 else PDF_WHITE
        p3.rect(44, y, 507, 17, fill_rgb=bg, stroke_rgb=PDF_BORDER, line_width=0.5)
        p3.text(route, 52, y + 4, font="F2", size=7.5, fill_rgb=PDF_NAVY)
        p3.text(bff, 195, y + 4, font="F1", size=7.2, fill_rgb=PDF_SLATE)
        p3.text(ctrl, 345, y + 4, font="F1", size=7.2, fill_rgb=PDF_SLATE)
        p3.text(stat, 465, y + 4, font="F2", size=7.2, fill_rgb=PDF_TEAL)
        y += 17

    p3.draw_footer(3, TOTAL_PAGES)
    writer.pages.append(p3)

    # --------------------------------------------------------------------------
    # PAGE 4: SECTION 3 — SUBSCRIPTION AND MONETIZATION MANAGEMENT
    # --------------------------------------------------------------------------
    p4 = PdfCanvas()
    p4.draw_header(4, TOTAL_PAGES)
    y = p4.draw_section_header("03", "Subscription and Monetization Management", 45)

    p4.multiline_text(
        "Conducted the Phase 1 Comprehensive Architectural Audit & Reconciliation on November 7, 2026 (documented in docs/monetization_audit.md). The audit established the baseline for a production-grade, authoritative monetization management subsystem.",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 28

    # 2 Comparison Cards
    w2 = (507 - 12) / 2.0
    p4.card(44, y, w2, 135, top_accent=PDF_TEAL)
    p4.text("Verified Existing Building Blocks", 54, y + 12, font="F2", size=9.5, fill_rgb=PDF_NAVY)
    b_items = [
        "• EF Core Models: SubscriptionPlan, UserSubscription, Order, PaymentTransaction.",
        "• Relational Tables in PostgreSQL public schema with foreign key cascades.",
        "• Partial unique index: idx_user_subscriptions_active_unique on active grants.",
        "• HMAC-SHA256 timing-safe webhook verification in ICheckoutService.cs.",
        "• Offline/sandbox checkout simulation gate (live Stripe package not installed)."
    ]
    by = y + 28
    for itm in b_items:
        p4.multiline_text(itm, 54, by, w2 - 20, 11.5, font="F1", size=8, fill_rgb=PDF_SLATE)
        by += 21

    p4.card(44 + w2 + 12, y, w2, 135, top_accent=PDF_GOLD)
    p4.text("Critical Gaps Identified (Phase 2–11 Roadmap)", 44 + w2 + 22, y + 12, font="F2", size=9.5, fill_rgb=PDF_NAVY)
    g_items = [
        "• No Manual Payment Authorization Queue for Cash, M-Pesa, Bank Transfer.",
        "• Absence of transaction reference deduplication across offline deposits.",
        "• Coarse-grained entitlement checks: UserEntitlementService only checks RN/PN.",
        "• Missing fine-grained premium feature gating (CAT, flashcards, video player).",
        "• Hardcoded pricing card styles lacking dynamic appearance & typography customizer."
    ]
    gy = y + 28
    for itm in g_items:
        p4.multiline_text(itm, 44 + w2 + 22, gy, w2 - 20, 11.5, font="F1", size=8, fill_rgb=PDF_SLATE)
        gy += 21
    y += 150

    p4.text("Canonical Subscription Plans Matrix (Catalog Seeder Alignment)", 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
    y += 14
    p4.rect(44, y, 507, 18, fill_rgb=PDF_NAVY)
    p4.text("Plan Identifier", 52, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p4.text("Curriculum Pathway", 150, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p4.text("Billing Interval", 260, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p4.text("Price (USD)", 360, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p4.text("Entitlement Scope", 440, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 18

    plans = [
        ("rn-pro-30", "NCLEX-RN", "Monthly (30 Days)", "$49.00 / mo", "Complete RN Q-Bank & CAT"),
        ("rn-pro-60", "NCLEX-RN", "Bi-Monthly (60 Days)", "$79.00 one-time", "Complete RN Q-Bank & CAT"),
        ("rn-pro-90", "NCLEX-RN", "Quarterly (90 Days)", "$99.00 one-time", "All-Access Pass + Readiness"),
        ("pn-pro-30", "NCLEX-PN", "Monthly (30 Days)", "$49.00 / mo", "Complete PN Q-Bank & CAT"),
        ("pn-pro-60", "NCLEX-PN", "Bi-Monthly (60 Days)", "$79.00 one-time", "Complete PN Q-Bank & CAT"),
        ("pn-pro-90", "NCLEX-PN", "Quarterly (90 Days)", "$99.00 one-time", "All-Access Pass + Readiness")
    ]
    for idx, (pid, pway, dur, prc, scp) in enumerate(plans):
        bg = PDF_LIGHT_BG if idx % 2 == 1 else PDF_WHITE
        p4.rect(44, y, 507, 17, fill_rgb=bg, stroke_rgb=PDF_BORDER, line_width=0.5)
        p4.text(pid, 52, y + 4, font="F2", size=7.8, fill_rgb=PDF_NAVY)
        p4.text(pway, 150, y + 4, font="F1", size=7.8, fill_rgb=PDF_SLATE)
        p4.text(dur, 260, y + 4, font="F1", size=7.8, fill_rgb=PDF_SLATE)
        p4.text(prc, 360, y + 4, font="F2", size=7.8, fill_rgb=PDF_TEAL)
        p4.text(scp, 440, y + 4, font="F1", size=7.8, fill_rgb=PDF_MUTED)
        y += 17

    y += 15
    p4.rect(44, y, 507, 44, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    p4.rect(44, y, 4, 44, fill_rgb=PDF_TEAL)
    p4.text("Monetization Phase 2 Implementation Scope", 56, y + 8, font="F2", size=9, fill_rgb=PDF_NAVY)
    p4.multiline_text(
        "Phase 2 will introduce the administrative Manual Payment Authorization Queue, enabling financial coordinators to record offline receipts, verify transaction codes against bank statements, and trigger automated UserSubscription provisioning.",
        56, y + 22, 485, 11, font="F1", size=8, fill_rgb=PDF_SLATE
    )

    p4.draw_footer(4, TOTAL_PAGES)
    writer.pages.append(p4)

    # --------------------------------------------------------------------------
    # PAGE 5: SECTION 4 — LEARNER DASHBOARD — PERFORMANCE INTELLIGENCE
    # --------------------------------------------------------------------------
    p5 = PdfCanvas()
    p5.draw_header(5, TOTAL_PAGES)
    y = p5.draw_section_header("04", "Learner Dashboard — Performance Intelligence", 45)

    p5.multiline_text(
        "Consolidated the learner dashboard architecture into an empirical cognitive analytics workspace, tracking mastery across all 8 NCSBN Client Needs domains without commercial pass-guarantee gimmicks.",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 26

    dash_blocks = [
        ("Cognitive Performance Intelligence",
         "The performance engine calculates candidate telemetry across all 8 NCSBN Client Needs categories (Management of Care, Safety & Infection Control, Health Promotion, Psychosocial, Basic Care, Pharmacology, Risk Reduction, Physiological Adaptation). Distinguishes unfolding clinical case study reasoning across the 6 CJMM cognitive layers."),
        ("Downloadable Learner Reports (Specification)",
         "Architected specifications for server-generated PDF performance dossiers. Enables candidates and institutional faculty to export comprehensive diagnostic summaries detailing attempt history, domain retention percentiles, cognitive step breakdowns, and weak-area alerts."),
        ("Personalized Recommendations Engine",
         "Diagnostic telemetry drives targeted study recommendations. Based on real response histories, candidates receive prescriptive drill recommendations focusing on low-scoring subject categories, without misleading pass-probability claims."),
        ("Strict RN vs PN Curriculum Separation",
         "Enforced clinical scope-of-practice partitioning: NCLEX-RN candidates receive comprehensive nursing assessment, care management, and complex prioritization items; NCLEX-PN candidates receive focused clinical assessment, practical care, and delegation items.")
    ]
    for title, desc in dash_blocks:
        p5.text(title, 44, y, font="F2", size=9.5, fill_rgb=PDF_NAVY)
        y += 12
        p5.multiline_text(desc, 44, y, 507, 12, font="F1", size=8.2, fill_rgb=PDF_SLATE)
        y += 40

    # Status Distinction Callout
    p5.rect(44, y, 507, 65, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    p5.rect(44, y, 4, 65, fill_rgb=PDF_TEAL)
    p5.text("Critical Implementation Status Distinction (Factual Governance)", 56, y + 8, font="F2", size=9, fill_rgb=PDF_NAVY)
    p5.multiline_text(
        "1. Implemented & Verified: Core dashboard layout, real-data telemetry tiles, SM-2 flashcard due counts, and persistent session state surviving browser restarts.\n2. Specified & Planned: Downloadable PDF performance reports and AI-driven prescriptive study recommendations (deliberately documented as planned roadmap deliverables).",
        56, y + 22, 485, 12, font="F1", size=8, fill_rgb=PDF_SLATE
    )
    y += 80

    # 4 Telemetry Metric Tiles
    tile_w = (507 - 24) / 4.0
    tiles = [
        ("8 Domains", "NCSBN Client Needs", "100% Mapped"),
        ("6 Layers", "CJMM Cognitive Model", "Authoritative"),
        ("30 Days", "Persistent Sessions", "Sliding Cookie"),
        ("Dual Track", "RN / PN Separation", "Enforced")
    ]
    for idx, (val, lbl, sub) in enumerate(tiles):
        tx = 44 + idx * (tile_w + 8)
        p5.card(tx, y, tile_w, 60, top_accent=PDF_NAVY)
        p5.text(val, tx + tile_w/2.0, y + 16, font="F2", size=13, fill_rgb=PDF_TEAL, align="center")
        p5.text(lbl, tx + tile_w/2.0, y + 33, font="F2", size=7.5, fill_rgb=PDF_NAVY, align="center")
        p5.text(sub, tx + tile_w/2.0, y + 46, font="F1", size=7, fill_rgb=PDF_MUTED, align="center")

    p5.draw_footer(5, TOTAL_PAGES)
    writer.pages.append(p5)

    # --------------------------------------------------------------------------
    # PAGE 6: SECTION 5 — SYSTEM-WIDE ACCURACY AND RECONCILIATION
    # --------------------------------------------------------------------------
    p6 = PdfCanvas()
    p6.draw_header(6, TOTAL_PAGES)
    y = p6.draw_section_header("05", "System-Wide Accuracy and Information Reconciliation", 45)

    p6.multiline_text(
        "Conducted a thorough audit across application interfaces, FAQs, and marketing copy to ensure 100% factual accuracy and complete elimination of unsubstantiated claims.",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    # AI Study Studio Feature Boundary
    p6.text("AI Study Studio — Implementation vs Planned Boundary", 44, y, font="F2", size=11, fill_rgb=PDF_NAVY)
    y += 14

    p6.card(44, y, 507, 125, top_accent=PDF_TEAL)
    p6.text("Active Capabilities (Implemented & Verified)", 56, y + 12, font="F2", size=9, fill_rgb=PDF_NAVY)
    p6.multiline_text(
        "• Phase 1 Personal Flashcard Decks: Manual card creation, deck organization, and RN/PN programme tagging.\n• Curated Study Guide Extraction: Automated recall card generation derived verbatim from clinical takeaways in official PrepFord study guides.\n• Server-Authoritative SM-2 Spaced Repetition Engine: SpacedRepetitionService.cs computes review schedules (Again, Hard, Good, Easy) with ease factor adjustments clamped to [1.3, 3.0] and intervals up to 730 days.\n• Learner Data Isolation: Strict UserId filtering across all queries; cross-user mutations strictly return HTTP 404.",
        56, y + 28, 480, 12, font="F1", size=8, fill_rgb=PDF_SLATE
    )
    y += 135

    p6.card(44, y, 507, 85, top_accent=PDF_GOLD)
    p6.text("Planned Roadmap Capabilities (Honestly Disclosed — NOT Implemented)", 56, y + 12, font="F2", size=9, fill_rgb=PDF_NAVY)
    p6.multiline_text(
        "• Conversational AI Tutor Chat: No external AI provider keys (OpenAI / Gemini / Anthropic) exist in server configuration. No placeholder mock interfaces exist in production builds.\n• Automated Document Summarization: Ingestion of external PDF/Word documents is planned for future phases.\n• AI Adaptive Study Path Generation: Prescriptive calendar scheduling remains a planned capability.",
        56, y + 28, 480, 12, font="F1", size=8, fill_rgb=PDF_SLATE
    )
    y += 98

    # FAQ Audit
    p6.text("FAQ & Candidate Product Information Audit", 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
    y += 12
    p6.multiline_text(
        "1. Commercial Guarantee Removal: Eliminated all marketing '100% pass guarantee' statements. Replaced with transparent explanations of empirical readiness telemetry and spaced-repetition retention.\n2. Scoring Disclosure: Published transparent explanations of NCSBN partial credit (+/-) scoring rules, clarifying that incorrect selections incur negative penalties with a minimum score floor of zero.\n3. Session Security Clarification: Rewrote student-facing security FAQs explaining persistent 30-day HttpOnly cookie encryption and automated logout protections.",
        44, y, 507, 12.5, font="F1", size=8.2, fill_rgb=PDF_SLATE
    )

    p6.draw_footer(6, TOTAL_PAGES)
    writer.pages.append(p6)

    # --------------------------------------------------------------------------
    # PAGE 7: SECTION 6 — SYSTEM-WIDE UI CONSISTENCY AND NOTIFICATIONS
    # --------------------------------------------------------------------------
    p7 = PdfCanvas()
    p7.draw_header(7, TOTAL_PAGES)
    y = p7.draw_section_header("06", "System-Wide UI Consistency and Notification Improvements", 45)

    p7.multiline_text(
        "Unified user interface components under Tailwind CSS 4, shadcn/ui primitives, and PrepFord clinical tokens (Primary Navy #142B4A, Medical Teal #0D9488, Slate #475569).",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    ui_cards = [
        ("Top-Center Notification Standard",
         "Standardized all application-wide toast notifications to top-center viewport placement via sonner (position='top-center'). Clinical examinations require intense visual focus across horizontal EHR charts; top-center positioning guarantees immediate candidate visibility without obstructing bottom action bars, countdown timers, or calculator modals.",
         PDF_TEAL),
        ("Visual Asset Encoding Standardization",
         "A critical audit revealed that 8 of 9 illustration files originally contained JPEG data masquerading under .png extensions. Standardized all assets to true 32-bit PNG headers (89 50 4E 47), resolving file-type mismatches and ensuring crisp visual rendering across high-DPI displays.",
         PDF_NAVY),
        ("Ethical Testimonial Avatar System",
         "In accordance with anti-fabrication standards, testimonial cards no longer display generic initial circles. Implemented a deterministic generic candidate avatar family (avatar-default.png, avatar-female-1/2, avatar-male-1/2) in medical attire with stethoscopes, respecting candidate privacy while maintaining brand polish.",
         PDF_GOLD)
    ]
    for title, desc, acc in ui_cards:
        p7.card(44, y, 507, 72, top_accent=acc)
        p7.text(title, 56, y + 12, font="F2", size=9.5, fill_rgb=PDF_NAVY)
        p7.multiline_text(desc, 56, y + 26, 480, 12, font="F1", size=8.2, fill_rgb=PDF_SLATE)
        y += 82

    # Visual Asset Inventory Table
    p7.text("Standardized Platform Illustration Assets (apps/web/public/images/illustrations/)", 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
    y += 14
    p7.rect(44, y, 507, 18, fill_rgb=PDF_NAVY)
    p7.text("Asset Filename", 52, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p7.text("Dimensions & Aspect Ratio", 240, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p7.text("Encoding Format", 380, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p7.text("Status", 470, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 18

    assets = [
        ("prepford-landing-hero.png", "1376 x 768 (16:9)", "True 32-bit PNG (Sharp Verified)", "Deployed"),
        ("prepford-rn-pathway-card.png", "1376 x 768 (16:9)", "True 32-bit PNG (Sharp Verified)", "Deployed"),
        ("prepford-pn-pathway-card.png", "1376 x 768 (16:9)", "True 32-bit PNG (Sharp Verified)", "Deployed"),
        ("prepford-ehr-unfolding-case.png", "1200 x 896 (4:3)", "True 32-bit PNG (Sharp Verified)", "Deployed"),
        ("prepford-pathophysiology-rationales.png", "1200 x 896 (4:3)", "True 32-bit PNG (Sharp Verified)", "Deployed"),
        ("prepford-clinical-decision-making.png", "1200 x 896 (4:3)", "True 32-bit PNG Transcoded", "Preserved"),
        ("prepford-readiness-analytics.png", "1200 x 896 (4:3)", "True 32-bit PNG Transcoded", "Preserved"),
        ("avatar-default.png / avatar-*.png", "256 x 256 (1:1)", "Deterministic PNG Candidate Family", "Deployed")
    ]
    for idx, (fn, dim, enc, stat) in enumerate(assets):
        bg = PDF_LIGHT_BG if idx % 2 == 1 else PDF_WHITE
        p7.rect(44, y, 507, 16, fill_rgb=bg, stroke_rgb=PDF_BORDER, line_width=0.5)
        p7.text(fn, 52, y + 4, font="F2", size=7.5, fill_rgb=PDF_NAVY)
        p7.text(dim, 240, y + 4, font="F1", size=7.5, fill_rgb=PDF_SLATE)
        p7.text(enc, 380, y + 4, font="F1", size=7.5, fill_rgb=PDF_SLATE)
        p7.text(stat, 470, y + 4, font="F2", size=7.5, fill_rgb=PDF_TEAL)
        y += 16

    p7.draw_footer(7, TOTAL_PAGES)
    writer.pages.append(p7)

    # --------------------------------------------------------------------------
    # PAGE 8: SECTION 7 — PHASE 8: STAFF INVITATIONS & MULTI-ROLE RBAC
    # --------------------------------------------------------------------------
    p8 = PdfCanvas()
    p8.draw_header(8, TOTAL_PAGES)
    y = p8.draw_section_header("07", "Phase 8 — Staff Invitation Lifecycle & Workspaces", 45)

    p8.multiline_text(
        "Evaluated identity and administrative access infrastructure in the Phase 8 Initial System Audit (docs/PHASE_8_INITIAL_SYSTEM_AUDIT.md), establishing architectural requirements for enterprise staff provisioning.",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    p8_cards = [
        ("Staff Invitation Lifecycle",
         "Architected invitation service (apps/web/src/lib/invitation-service.ts) and BFF routes (/api/admin/invitations). Employs cryptographically secure 72-hour tokens, duplicate email validation, automated expiration state transitions, and administrative re-send/revocation controls."),
        ("Multi-Role RBAC Governance",
         "The canonical role catalogue recognizes 7 tiers: superadmin, admin, content_manager, exam_manager, reviewer, instructor, candidate. A centralized deterministic priority resolution algorithm on client and server resolves multi-role user sessions to the highest privilege tier."),
        ("Specialized Staff Workspaces",
         "Defined dedicated staff experiences: Instructor Workspace (cohort tracking, class weakness diagnostics, assignment tools) and Reviewer Workspace (clinical item audit, medical rationale validation, and clinical bias auditing with separation-of-duties enforcement).")
    ]
    for title, desc in p8_cards:
        p8.text(title, 44, y, font="F2", size=9.5, fill_rgb=PDF_NAVY)
        y += 12
        p8.multiline_text(desc, 44, y, 507, 12, font="F1", size=8.2, fill_rgb=PDF_SLATE)
        y += 38

    # Privilege Governance Callout Box
    p8.rect(44, y, 507, 54, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    p8.rect(44, y, 4, 54, fill_rgb=PDF_DANGER_TXT)
    p8.text("Confirmed Privilege Governance Risk & Mandatory Backend Ceiling", 56, y + 8, font="F2", size=9, fill_rgb=PDF_DANGER_TXT)
    p8.multiline_text(
        "Existing AdminUsersController allowed ordinary administrators to assign the superadmin role. In accordance with zero-trust security standards, an authoritative role ceiling must be enforced in the ASP.NET Core backend prior to enabling multi-role staff invitation provisioning.",
        56, y + 22, 485, 11.5, font="F1", size=8, fill_rgb=PDF_SLATE
    )
    y += 66

    p8.text("7-Tier Role Governance & Dedicated Workspace Matrix", 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
    y += 14
    p8.rect(44, y, 507, 18, fill_rgb=PDF_NAVY)
    p8.text("Role Tier", 52, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p8.text("Canonical Key", 140, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p8.text("Dedicated Workspace / UI Route", 250, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p8.text("Separation of Duties", 420, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 18

    roles = [
        ("Tier 1", "superadmin", "/admin/monitoring & system config", "Tenant root authority"),
        ("Tier 2", "admin", "/admin/users & subscriptions", "Cannot grant superadmin"),
        ("Tier 3", "exam_manager", "/admin/examinations & scoring", "Assembles exams & thresholds"),
        ("Tier 4", "content_manager", "/admin/study-guides & questions", "Authors study content"),
        ("Tier 5", "reviewer", "/admin/reviews (Clinical Audit)", "Cannot approve own items"),
        ("Tier 6", "instructor", "/instructor/cohorts & remediation", "Class diagnostics only"),
        ("Tier 7", "candidate", "/dashboard & study studio", "Isolated student data")
    ]
    for idx, (tier, key, ws, sep) in enumerate(roles):
        bg = PDF_LIGHT_BG if idx % 2 == 1 else PDF_WHITE
        p8.rect(44, y, 507, 16, fill_rgb=bg, stroke_rgb=PDF_BORDER, line_width=0.5)
        p8.text(tier, 52, y + 4, font="F2", size=7.5, fill_rgb=PDF_NAVY)
        p8.text(key, 140, y + 4, font="F1", size=7.5, fill_rgb=PDF_SLATE)
        p8.text(ws, 250, y + 4, font="F1", size=7.5, fill_rgb=PDF_SLATE)
        p8.text(sep, 420, y + 4, font="F2", size=7.5, fill_rgb=PDF_TEAL)
        y += 16

    p8.draw_footer(8, TOTAL_PAGES)
    writer.pages.append(p8)

    # --------------------------------------------------------------------------
    # PAGE 9: SECTION 8 — PHASE 7.9.1: SECURITY & RELEASE GOVERNANCE
    # --------------------------------------------------------------------------
    p9 = PdfCanvas()
    p9.draw_header(9, TOTAL_PAGES)
    y = p9.draw_section_header("08", "Phase 7.9.1 — Security Auditing and Release Governance", 45)

    p9.multiline_text(
        "Conducted independent release governance verification across repository provenance, session security, and object database hygiene:",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    sec_cards = [
        ("Release Provenance Audit (Commit 69d0bc1)",
         "Discovered that earlier Phase 7.9 documents cited a non-existent commit SHA (3bcb90c8a52e...). Formally reconciled the discrepancy, re-anchoring release candidate verification to commit 6d33fc5 on feature/dotnet-backend-migration. Confirmed that release candidate tag v0.7.0 has NOT been created.",
         PDF_TEAL),
        ("Session Concurrency Security Audit (Commit 8c5f2c2)",
         "Verified strict session concurrency policies: maximum 2 concurrent active devices per candidate; maximum 1 session per browser client. PostgreSQL advisory transaction locks (pg_advisory_xact_lock) serialize login races. In-exam reauth preserves test state during credential expiry.",
         PDF_NAVY),
        ("Git History Hygiene & Large-File Remediation",
         "Working tree is 100% clean with zero uncommitted conflicts. The branch is 9 commits ahead of remote tracking with 0 oversized objects. Verified that the accidental scratch/lint.log file is completely absent from outgoing history, eliminating repository bloat.",
         PDF_GOLD)
    ]
    for title, desc, acc in sec_cards:
        p9.card(44, y, 507, 72, top_accent=acc)
        p9.text(title, 56, y + 12, font="F2", size=9.5, fill_rgb=PDF_NAVY)
        p9.multiline_text(desc, 56, y + 26, 480, 12, font="F1", size=8.2, fill_rgb=PDF_SLATE)
        y += 82

    # Release Audit Reconciliation Table
    p9.text("Release Provenance Reconciliation Findings (docs/architecture/PHASE_7_9_1_*.md)", 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
    y += 14
    p9.rect(44, y, 507, 18, fill_rgb=PDF_NAVY)
    p9.text("Claimed Parameter", 52, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p9.text("Recorded Document Value", 180, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p9.text("Actual Repository State", 330, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p9.text("Reconciliation Verdict", 450, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 18

    prov_rows = [
        ("Release Commit Full SHA", "3bcb90c8a52e008101a1829e...", "Non-existent in Git object DB", "Fabricated / Reconciled"),
        ("Release Baseline Anchor", "3bcb90c (Prefix collision)", "Docs commit; parent is fe3eb86", "Re-anchored to 6d33fc5"),
        ("Outgoing Commit Count", "9 commits ahead of remote", "Verified clean branch topology", "Verified (Clean)"),
        ("Object Database State", "0 oversized blobs", "scratch/lint.log absent", "Verified (No Bloat)"),
        ("Release Authorization", "Authorized v0.7.0 Package", "Awaiting PO Written Approval", "NOT READY (Pre-Auth)")
    ]
    for idx, (param, rec, act, verd) in enumerate(prov_rows):
        bg = PDF_LIGHT_BG if idx % 2 == 1 else PDF_WHITE
        p9.rect(44, y, 507, 16, fill_rgb=bg, stroke_rgb=PDF_BORDER, line_width=0.5)
        p9.text(param, 52, y + 4, font="F2", size=7.5, fill_rgb=PDF_NAVY)
        p9.text(rec, 180, y + 4, font="F1", size=7.2, fill_rgb=PDF_SLATE)
        p9.text(act, 330, y + 4, font="F1", size=7.2, fill_rgb=PDF_SLATE)
        p9.text(verd, 450, y + 4, font="F2", size=7.2, fill_rgb=PDF_TEAL if "Verified" in verd else PDF_DANGER_TXT)
        y += 16

    y += 14
    p9.rect(44, y, 507, 36, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    p9.rect(44, y, 4, 36, fill_rgb=PDF_DANGER_TXT)
    p9.text("Mandatory Release Governance Status: NOT READY", 56, y + 8, font="F2", size=9, fill_rgb=PDF_DANGER_TXT)
    p9.text("Deployment authorization remains withheld pending final staging database migration verification.", 56, y + 21, font="F1", size=8, fill_rgb=PDF_SLATE)

    p9.draw_footer(9, TOTAL_PAGES)
    writer.pages.append(p9)

    # --------------------------------------------------------------------------
    # PAGE 10: SECTION 9 — TESTING, QUALITY ASSURANCE & DOCUMENTATION
    # --------------------------------------------------------------------------
    p10 = PdfCanvas()
    p10.draw_header(10, TOTAL_PAGES)
    y = p10.draw_section_header("09", "Testing, Quality Assurance & Documentation", 45)

    p10.multiline_text(
        "Preserved comprehensive historical test evidence across development milestones, demonstrating architectural stability across frontend and backend tiers:",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    # 4 Metric Cards
    m_w = (507 - 24) / 4.0
    m_cards = [
        ("381 / 381", "Vitest Tests", "Frontend Baseline"),
        ("133 / 133", "Backend Tests", "ASP.NET Core xUnit"),
        ("81 Routes", "Route Verification", "Next.js 16 Parity"),
        ("0 Errors", "TypeScript Check", "tsc --noEmit Clean")
    ]
    for idx, (val, lbl, sub) in enumerate(m_cards):
        cx = 44 + idx * (m_w + 8)
        p10.card(cx, y, m_w, 62, top_accent=PDF_TEAL)
        p10.text(val, cx + m_w/2.0, y + 16, font="F2", size=13, fill_rgb=PDF_TEAL, align="center")
        p10.text(lbl, cx + m_w/2.0, y + 34, font="F2", size=7.5, fill_rgb=PDF_NAVY, align="center")
        p10.text(sub, cx + m_w/2.0, y + 47, font="F1", size=7, fill_rgb=PDF_MUTED, align="center")
    y += 76

    p10.text("Preserved Historical Test Baselines & Quality Gates", 44, y, font="F2", size=10, fill_rgb=PDF_NAVY)
    y += 14
    p10.rect(44, y, 507, 18, fill_rgb=PDF_NAVY)
    p10.text("Test Harness / Quality Gate", 52, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p10.text("Target Architectural Scope", 210, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p10.text("Reported Result", 370, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p10.text("Verification Posture", 460, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 18

    qa_rows = [
        ("Frontend Vitest Suite", "Next.js App Router, BFF Route Handlers, Role Resolver", "381 / 381 Passed", "Reported Baseline"),
        ("ASP.NET Core Backend Tests", "Controllers, Services, DTOs, EF Core Repositories", "133 / 133 Passed", "Reported Baseline"),
        ("Earlier Frontend Baseline", "Next.js Web Suite Initial Run", "225 / 225 Passed", "Historical Reference"),
        ("Earlier Backend Baseline", "Initial Identity & Auth Test Suite", "15 / 15 Passed", "Historical Reference"),
        ("Earlier Route Verification", "Static Pages, BFF Routes, Admin Shell", "81 / 81 Routes", "Verified Route Parity"),
        ("Static Code Quality (Typecheck)", "Entire Web Application & Shared TypeScript Types", "0 Errors (Clean)", "Verified Code 0"),
        ("Zero-SQLite Runtime Guard", "scripts/verify-no-sqlite-runtime.ts", "0 SQLite Refs", "100% Policy Verified"),
        ("Brand Consistency Guard", "scripts/check-brand-consistency.ts", "0 Violations", "100% Policy Verified")
    ]
    for idx, (suite, scope, result, posture) in enumerate(qa_rows):
        bg = PDF_LIGHT_BG if idx % 2 == 1 else PDF_WHITE
        p10.rect(44, y, 507, 17, fill_rgb=bg, stroke_rgb=PDF_BORDER, line_width=0.5)
        p10.text(suite, 52, y + 4, font="F2", size=7.8, fill_rgb=PDF_NAVY)
        p10.text(scope, 210, y + 4, font="F1", size=7.5, fill_rgb=PDF_SLATE)
        p10.text(result, 370, y + 4, font="F2", size=7.8, fill_rgb=PDF_TEAL)
        p10.text(posture, 460, y + 4, font="F1", size=7.5, fill_rgb=PDF_MUTED)
        y += 17

    y += 16
    p10.card(44, y, 507, 65, top_accent=PDF_NAVY)
    p10.text("Documentation Quality Process & Self-Contained Reporting", 56, y + 10, font="F2", size=9, fill_rgb=PDF_NAVY)
    p10.multiline_text(
        "All engineering specifications, audits, and test evidence are maintained in version-controlled markdown under docs/. Weekly reporting leverages self-contained, automated Python generation scripts producing publication-quality PDF, editable OpenXML DOCX, and responsive HTML artifacts simultaneously.",
        56, y + 24, 480, 12, font="F1", size=8, fill_rgb=PDF_SLATE
    )

    p10.draw_footer(10, TOTAL_PAGES)
    writer.pages.append(p10)

    # --------------------------------------------------------------------------
    # PAGE 11: SECTION 10 — CONSOLIDATED WEEKLY ACHIEVEMENT TRACKER
    # --------------------------------------------------------------------------
    p11 = PdfCanvas()
    p11.draw_header(11, TOTAL_PAGES)
    y = p11.draw_section_header("10", "Consolidated Weekly Achievement Tracker", 45)

    p11.multiline_text(
        "Consolidated status register tracking engineering initiatives across the platform using standardized status terminology:",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 20

    p11.rect(44, y, 507, 18, fill_rgb=PDF_NAVY)
    p11.text("#", 50, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p11.text("Workstream / Initiative", 70, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p11.text("Technical Scope & Deliverables", 225, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    p11.text("Status", 455, y + 4, font="F2", size=8, fill_rgb=PDF_WHITE)
    y += 18

    tracker = [
        ("01", "Study Guide BFF Proxy & RBAC", "Exported PATCH proxying; realigned authorization to RequireContentManager.", "Completed", PDF_SUCCESS_BG, PDF_SUCCESS_TXT),
        ("02", "Topic Quiz 404 Resolution", "Synchronized DTOs (TargetScore, IsArchived); unblocked learner official quiz discovery.", "Completed", PDF_SUCCESS_BG, PDF_SUCCESS_TXT),
        ("03", "Admin Navigation Trapping Fix", "Added Curated Study Guides child route to prevent sidebar workspace trapping.", "Completed", PDF_SUCCESS_BG, PDF_SUCCESS_TXT),
        ("04", "Release Provenance Reconciliation", "Reconciled documentation SHAs; anchored release candidate to commit 6d33fc5.", "Completed", PDF_SUCCESS_BG, PDF_SUCCESS_TXT),
        ("05", "Session Concurrency Audit", "Verified PostgreSQL advisory locks, 2-device limit, and in-exam reauth state preservation.", "Completed", PDF_SUCCESS_BG, PDF_SUCCESS_TXT),
        ("06", "Git History & Large-File Hygiene", "Confirmed clean working tree, 0 oversized objects, and removal of scratch logs.", "Completed", PDF_SUCCESS_BG, PDF_SUCCESS_TXT),
        ("07", "Monetization Architecture Audit", "Comprehensive Phase 1 audit completed; documented offline payment & entitlement gaps.", "Prepared", PDF_INFO_BG, PDF_INFO_TXT),
        ("08", "Staff Workspaces & 72h Tokens", "Phase 8 initial audit completed; token lifecycle and Instructor/Reviewer roles defined.", "Defined", PDF_SEC_BG, PDF_SLATE),
        ("09", "Top-Center Notification Standard", "Adopted application-wide sonner toast standard for candidate visibility during exams.", "Adopted", PDF_ACCENT_BG, PDF_TEAL),
        ("10", "Downloadable Learner Reports", "Specified server-side PDF generation pipeline for diagnostic progress summaries.", "Specified", (0.93, 0.91, 1.0), (0.36, 0.13, 0.71)),
        ("11", "Deployed Database Parity", "Physical PostgreSQL schema verification against all 15 migrations pending loopback connection.", "Pending verif.", PDF_WARNING_BG, PDF_WARNING_TXT),
        ("12", "Deployment Authorization Package", "Release package withheld pending staging database cutover drill and written approval.", "NOT READY", PDF_DANGER_BG, PDF_DANGER_TXT)
    ]
    for num, init, scope, stat, sbg, stxt in tracker:
        p11.rect(44, y, 507, 19, fill_rgb=PDF_WHITE, stroke_rgb=PDF_BORDER, line_width=0.5)
        p11.text(num, 50, y + 5, font="F2", size=7.8, fill_rgb=PDF_NAVY)
        p11.text(init, 70, y + 5, font="F2", size=7.8, fill_rgb=PDF_NAVY)
        p11.text(scope, 225, y + 5, font="F1", size=7.2, fill_rgb=PDF_SLATE)
        p11.badge(stat, 452, y + 3, bg_rgb=sbg, text_rgb=stxt, font_size=7)
        y += 19

    y += 16
    p11.rect(44, y, 507, 72, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    p11.text("Status Terminology Governance (Strict Factual Standards)", 56, y + 8, font="F2", size=8.5, fill_rgb=PDF_NAVY)
    terms = [
        "• Completed: Confirmed completed and verified work.",
        "• Prepared: Implementation specification or audit scope prepared.",
        "• Defined: Requirements or implementation scope established.",
        "• Adopted: Product direction or design requirement accepted.",
        "• Specified: Implementation approach formally documented.",
        "• Pending verification: Implementation not yet fully verified.",
        "• NOT READY: Deployment authorization withheld pending prerequisites."
    ]
    ty = y + 20
    for t in terms:
        p11.text(t, 56, ty, font="F1", size=7.2, fill_rgb=PDF_SLATE)
        ty += 11

    p11.draw_footer(11, TOTAL_PAGES)
    writer.pages.append(p11)

    # --------------------------------------------------------------------------
    # PAGE 12: SECTION 11 — KEY ENGINEERING DECISIONS
    # --------------------------------------------------------------------------
    p12 = PdfCanvas()
    p12.draw_header(12, TOTAL_PAGES)
    y = p12.draw_section_header("11", "Key Engineering Decisions Made This Week", 45)

    p12.multiline_text(
        "Architectural and strategic decisions established to safeguard platform stability and regulatory compliance:",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    decisions = [
        ("1. Preserve the .NET / PostgreSQL Architecture",
         "Reaffirmed ASP.NET Core 8 Web API and PostgreSQL 16 as the permanent, authoritative technology foundation. Strictly prohibited legacy Node/Prisma runtimes or SQLite local file databases, ensuring high-concurrency relational stability and transactional integrity.",
         PDF_NAVY),
        ("2. Audit Before Implementing",
         "Enforced an uncompromising 'audit-first' governance policy. Every major initiative (Monetization, Staff Workspaces, Study Guides) must execute exhaustive gap analysis, DTO reconciliation, and safety checks before writing code, preventing architectural drift.",
         PDF_NAVY),
        ("3. Maintain Separate RN and PN Experiences",
         "Enforced strict clinical curriculum and scope-of-practice partitioning between NCLEX-RN and NCLEX-PN across database queries, exam generation, and learner interfaces, reflecting authentic NCSBN licensing standards.",
         PDF_TEAL),
        ("4. Enforce Security at the Backend",
         "Maintained defense-in-depth principles where Next.js BFF proxies sanitize and route, but all authorization, session validity, rate limiting, and business constraints are enforced authoritatively by ASP.NET Core and PostgreSQL.",
         PDF_TEAL),
        ("5. Standardize User Feedback & Notifications",
         "Unified all learner-facing notifications to top-center sonner toasts, separated technical error stack traces from candidate-friendly messaging, and removed misleading marketing guarantees in favor of transparent empirical metrics.",
         PDF_GOLD)
    ]
    for title, desc, acc in decisions:
        p12.card(44, y, 507, 68, top_accent=acc)
        p12.text(title, 56, y + 12, font="F2", size=9.5, fill_rgb=PDF_NAVY)
        p12.multiline_text(desc, 56, y + 26, 480, 12, font="F1", size=8.2, fill_rgb=PDF_SLATE)
        y += 78

    p12.draw_footer(12, TOTAL_PAGES)
    writer.pages.append(p12)

    # --------------------------------------------------------------------------
    # PAGE 13: SECTION 12 — PRIORITIES FOR THE COMING WEEK
    # --------------------------------------------------------------------------
    p13 = PdfCanvas()
    p13.draw_header(13, TOTAL_PAGES)
    y = p13.draw_section_header("12", "Priorities for the Coming Week", 45)

    p13.multiline_text(
        "Six targeted engineering priorities guiding sprint execution for the upcoming cycle:",
        44, y, 507, 13, font="F2", size=9, fill_rgb=PDF_NAVY
    )
    y += 24

    priorities = [
        ("1", "Super Admin Bootstrap & Role Ceiling Hardening",
         "Implement backend role-assignment ceiling in AdminUsersController.cs preventing non-Superadmin privilege escalation; execute scripted staging bootstrap verification.",
         PDF_TEAL),
        ("2", "PostgreSQL 16 Deployed Schema & Migration Reconciliation",
         "Verify all 15 EF Core migrations against the target staging database with full schema constraint validation and automated rollback drills.",
         PDF_NAVY),
        ("3", "Staff Invitation End-to-End Persistence & Backend Controllers",
         "Transition invitation service from in-memory mock to database-backed EF Core entities, backend controllers, and email notification queue.",
         PDF_GOLD),
        ("4", "Monetization Phase 2 — Offline Payment Authorization Queue",
         "Build administrative review console for Cash, M-Pesa, and Bank Transfer payments with reference deduplication and fine-grained entitlement grants.",
         PDF_TEAL),
        ("5", "Next Gen NCLEX Clinical Case Study Multi-Tab Flowsheet",
         "Complete interactive EHR patient chart (EHR, Nurses Notes, Vital Signs, Labs) with real-time cue updates and split-screen examination layout.",
         PDF_NAVY),
        ("6", "Staging Deployment Verification & Written Release Authorization Drill",
         "Conduct full end-to-end regression pass and prepare final written deployment authorization package for Product Owner sign-off.",
         PDF_GOLD)
    ]
    for num, title, desc, acc in priorities:
        p13.rect(44, y, 507, 56, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
        p13.rect(44, y, 4, 56, fill_rgb=acc)
        # Number pill
        p13.rect(56, y + 12, 22, 22, fill_rgb=acc)
        p13.text(num, 67, y + 17, font="F2", size=10, fill_rgb=PDF_WHITE, align="center")
        p13.text(title, 88, y + 13, font="F2", size=9.5, fill_rgb=PDF_NAVY)
        p13.multiline_text(desc, 88, y + 27, 445, 11.5, font="F1", size=8, fill_rgb=PDF_SLATE)
        y += 66

    p13.draw_footer(13, TOTAL_PAGES)
    writer.pages.append(p13)

    # --------------------------------------------------------------------------
    # PAGE 14: SECTION 13 — OVERALL ASSESSMENT & SIGN-OFF
    # --------------------------------------------------------------------------
    p14 = PdfCanvas()
    p14.draw_header(14, TOTAL_PAGES)
    y = p14.draw_section_header("13", "Overall Assessment", 45)

    p14.multiline_text(
        "PrepFord NCLEX demonstrated substantial architectural consolidation and engineering discipline during the November 1-7 cycle. Critical content management bottlenecks were successfully unblocked, runtime 404/405 defects resolved, and pre-release security postures verified.",
        44, y, 507, 13.5, font="F2", size=9.5, fill_rgb=PDF_NAVY
    )
    y += 38
    p14.multiline_text(
        "The platform has successfully matured beyond speculative features into a resilient, enterprise-grade architecture. Release governance protocols have functioned exactly as intended: identifying discrepancies, enforcing quality gates, and safeguarding the production environment from premature authorization.",
        44, y, 507, 13, font="F1", size=8.8, fill_rgb=PDF_SLATE
    )
    y += 48

    p14.card(44, y, 507, 130, top_accent=PDF_TEAL)
    p14.text("Weekly Engineering Accomplishments Synthesis", 56, y + 12, font="F2", size=10, fill_rgb=PDF_NAVY)
    s_items = [
        "• Security Governance: Phase 7.9 audit closed documentation gaps and re-anchored release to commit 6d33fc5.",
        "• Content Authoring: BFF PATCH route proxying and RequireContentManager unblocked Study Guide authoring.",
        "• Defect Remediation: Topic quiz 404/405 errors eliminated, DTOs synchronized, admin navigation trapping fixed.",
        "• Monetization Foundation: Phase 1 architectural discovery established roadmap for offline payment queues.",
        "• Staff Lifecycle: Phase 8 audit established 72h token specifications and Reviewer/Instructor separation of duties.",
        "• Design System: Top-center sonner toast placement standardized, and true PNG 32-bit headers validated."
    ]
    sy = y + 28
    for itm in s_items:
        p14.text(itm, 56, sy, font="F1", size=8, fill_rgb=PDF_SLATE)
        sy += 16
    y += 145

    # Sign-Off Card
    p14.rect(44, y, 507, 72, fill_rgb=PDF_LIGHT_BG, stroke_rgb=PDF_BORDER, line_width=1)
    p14.rect(44, y, 4, 72, fill_rgb=PDF_NAVY)
    p14.text("Report Authorization & Engineering Governance Sign-Off", 56, y + 10, font="F2", size=9.5, fill_rgb=PDF_NAVY)
    p14.text("Prepared by: Senior Editorial & Technical Design Lead", 56, y + 26, font="F1", size=8.5, fill_rgb=PDF_SLATE)
    p14.text("Reviewed by: Engineering Architecture & Product Governance", 56, y + 40, font="F1", size=8.5, fill_rgb=PDF_SLATE)
    p14.text("Report Date: November 7, 2026", 56, y + 54, font="F1", size=8.5, fill_rgb=PDF_MUTED)
    p14.text("Governance Status: NOT READY FOR DEPLOYMENT", 310, y + 26, font="F2", size=8.5, fill_rgb=PDF_DANGER_TXT)
    p14.text("Action Required: Written Product Owner Sign-Off", 310, y + 40, font="F2", size=8.5, fill_rgb=PDF_TEAL)
    y += 88

    # Final Closing Mandate Box
    p14.rect(44, y, 507, 50, fill_rgb=(0.92, 0.98, 0.97), stroke_rgb=PDF_TEAL, line_width=1.5)
    p14.text("Closing Engineering Mandate", 56, y + 10, font="F2", size=9.5, fill_rgb=PDF_NAVY)
    p14.multiline_text(
        "The next milestone is verified delivery: working features, passing tests, documented acceptance evidence, and a release that is ready for authorization.",
        56, y + 25, 480, 13, font="F2", size=9, fill_rgb=PDF_TEAL
    )

    p14.draw_footer(14, TOTAL_PAGES)
    writer.pages.append(p14)

    writer.write_pdf(output_path)

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================
def main():
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    weekly_reports_dir = os.path.join(workspace_root, "docs", "reports", "weekly", "2026-11-01")
    os.makedirs(weekly_reports_dir, exist_ok=True)
    
    print(f"Loading logo assets...")
    w, h, rgb_bytes, alpha_bytes, png_bytes, b64_logo = load_logo_assets(workspace_root, weekly_reports_dir)
    print(f"Authoritative Logo Loaded: {w}x{h} ({len(png_bytes)} bytes)")
    
    # 1. HTML Report
    html_out = os.path.join(weekly_reports_dir, "PrepFord_NCLEX_Weekly_Engineering_Report_2026-11-01_to_2026-11-07.html")
    print(f"Generating HTML report: {html_out}")
    html_content = build_html_report(b64_logo)
    with open(html_out, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML generated successfully ({len(html_content)} characters).")
    
    # 2. DOCX Report
    docx_out = os.path.join(weekly_reports_dir, "PrepFord_NCLEX_Weekly_Engineering_Report_2026-11-01_to_2026-11-07.docx")
    print(f"Generating editable DOCX report: {docx_out}")
    build_docx_report(png_bytes, docx_out)
    print(f"DOCX generated successfully ({os.path.getsize(docx_out)} bytes).")
    
    # 3. PDF Report
    pdf_writer = SimplePdfWriter()
    pdf_writer.add_font("Helvetica")
    pdf_writer.add_font("Helvetica-Bold")
    pdf_writer.add_font("Helvetica-Oblique")
    logo_img_id = pdf_writer.add_image(w, h, rgb_bytes, alpha_bytes)
    
    pdf_out = os.path.join(weekly_reports_dir, "PrepFord_NCLEX_Weekly_Engineering_Report_2026-11-01_to_2026-11-07.pdf")
    print(f"Generating 14-page vector PDF report: {pdf_out}")
    build_pdf_document(pdf_writer, logo_img_id, pdf_out)
    print(f"PDF generated successfully ({os.path.getsize(pdf_out)} bytes).")
    
    print("\n=======================================================")
    print("ALL WEEKLY ENGINEERING REPORT ARTIFACTS GENERATED:")
    print(f"1. PDF:  {pdf_out} ({os.path.getsize(pdf_out)} bytes)")
    print(f"2. DOCX: {docx_out} ({os.path.getsize(docx_out)} bytes)")
    print(f"3. HTML: {html_out} ({os.path.getsize(html_out)} bytes)")
    print("=======================================================")

if __name__ == "__main__":
    main()
