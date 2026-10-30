"""
PrepFord Project Progress & Accomplishments Report Generator
Reporting Date: 30 October 2026
Generates:
1. docs/reports/PrepFord-Project-Progress-Report-2026-10-30.html
2. docs/reports/PrepFord-Project-Progress-Report-2026-10-30.docx
3. PrepFord-Project-Progress-Report-2026-10-30.pdf
4. docs/reports/PrepFord-Project-Progress-Report-2026-10-30.pdf
"""

import os
import sys
import zlib
import struct
import base64
import zipfile
import re
from io import BytesIO

# Brand Color Constants
HEX_NAVY = "#142B4A"
HEX_TEAL = "#0D9488"
HEX_WHITE = "#FFFFFF"
HEX_LIGHT_BG = "#F8FAFC"
HEX_SEC_BG = "#F1F5F9"
HEX_SLATE = "#475569"
HEX_BORDER = "#E2E8F0"
HEX_MUTED = "#64748B"
HEX_DARK_NAVY = "#0A192F"

# Word Color Hex (without hash)
DOCX_NAVY = "142B4A"
DOCX_TEAL = "0D9488"
DOCX_WHITE = "FFFFFF"
DOCX_LIGHT_BG = "F8FAFC"
DOCX_SEC_BG = "F1F5F9"
DOCX_SLATE = "475569"
DOCX_BORDER = "E2E8F0"
DOCX_MUTED = "64748B"

# PDF Normalized RGB Colors (0.0 - 1.0)
PDF_NAVY = (0.078, 0.169, 0.290)       # #142B4A
PDF_TEAL = (0.051, 0.580, 0.533)       # #0D9488
PDF_WHITE = (1.0, 1.0, 1.0)           # #FFFFFF
PDF_LIGHT_BG = (0.973, 0.980, 0.988)   # #F8FAFC
PDF_SEC_BG = (0.945, 0.961, 0.976)     # #F1F5F9
PDF_SLATE = (0.278, 0.333, 0.412)      # #475569
PDF_BORDER = (0.886, 0.910, 0.941)     # #E2E8F0
PDF_MUTED = (0.392, 0.455, 0.545)      # #64748B
PDF_DARK_NAVY = (0.040, 0.098, 0.184)  # #0A192F
PDF_ACCENT_BG = (0.918, 0.976, 0.969)  # Light Teal Tint
PDF_WARNING_BG = (0.996, 0.973, 0.914) # Amber light
PDF_WARNING_TXT = (0.706, 0.388, 0.047)# Amber dark
PDF_SUCCESS_BG = (0.925, 0.984, 0.949) # Green light
PDF_SUCCESS_TXT = (0.086, 0.506, 0.271)# Green dark

def parse_png_asset(logo_path):
    with open(logo_path, "rb") as f:
        png_bytes = f.read()
    
    pos = 8
    idat = bytearray()
    w, h = 0, 0
    while pos < len(png_bytes):
        length, chunk_type = struct.unpack(">I4s", png_bytes[pos:pos+8])
        chunk_data = png_bytes[pos+8:pos+8+length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            w, h, depth, ctype, _, _, _ = struct.unpack(">IIBBBBB", chunk_data)
            assert depth == 8 and ctype == 6, f"Unsupported PNG: depth={depth}, ctype={ctype}"
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
        
    b64_logo = base64.b64encode(png_bytes).decode("ascii")
    return w, h, bytes(rgb), bytes(alpha), png_bytes, b64_logo

# ==============================================================================
# HTML BUILDER
# ==============================================================================
def build_html_report(b64_logo):
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PrepFord — Project Progress & Accomplishments Report</title>
  <style>
    :root {{
      --navy: #142B4A;
      --teal: #0D9488;
      --white: #FFFFFF;
      --light-bg: #F8FAFC;
      --sec-bg: #F1F5F9;
      --slate: #475569;
      --border: #E2E8F0;
      --muted: #64748B;
      --dark-navy: #0A192F;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--slate);
      background-color: #E6EBF1;
      line-height: 1.6;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }}

    .document-container {{
      max-width: 1000px;
      margin: 40px auto;
      background: var(--white);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      overflow: hidden;
    }}

    /* Cover Page */
    .cover-page {{
      background: linear-gradient(135deg, var(--navy) 0%, var(--dark-navy) 100%);
      color: var(--white);
      padding: 80px 60px 60px 60px;
      position: relative;
      border-bottom: 6px solid var(--teal);
    }}

    .cover-page::after {{
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 40%;
      background: radial-gradient(circle at 80% 20%, rgba(13, 148, 136, 0.15) 0%, transparent 60%);
      pointer-events: none;
    }}

    .cover-header {{
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 50px;
    }}

    .cover-logo {{
      width: 88px;
      height: 88px;
      background: var(--white);
      border-radius: 16px;
      padding: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    }}

    .cover-badge {{
      display: inline-block;
      background: rgba(13, 148, 136, 0.2);
      border: 1px solid rgba(13, 148, 136, 0.4);
      color: #5EEAD4;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }}

    .cover-title {{
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.5px;
      line-height: 1.2;
      color: var(--white);
      margin-bottom: 8px;
    }}

    .cover-subtitle {{
      font-size: 20px;
      font-weight: 400;
      color: #94A3B8;
      margin-bottom: 30px;
    }}

    .cover-desc-box {{
      background: rgba(255, 255, 255, 0.05);
      border-left: 4px solid var(--teal);
      padding: 20px 24px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 50px;
      font-size: 15px;
      line-height: 1.7;
      color: #CBD5E1;
    }}

    .cover-meta-grid {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 25px;
    }}

    .meta-item .meta-label {{
      font-size: 12px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      margin-bottom: 4px;
    }}

    .meta-item .meta-value {{
      font-size: 14px;
      color: var(--white);
      font-weight: 500;
    }}

    /* Main Content Sections */
    .report-body {{
      padding: 60px;
    }}

    .section-block {{
      margin-bottom: 50px;
    }}

    .section-header {{
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 24px;
    }}

    .section-num {{
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--navy);
      color: var(--white);
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
    }}

    .section-title {{
      font-size: 22px;
      font-weight: 700;
      color: var(--navy);
      letter-spacing: -0.3px;
    }}

    .lead-paragraph {{
      font-size: 16px;
      color: var(--slate);
      line-height: 1.7;
      margin-bottom: 20px;
    }}

    p {{
      margin-bottom: 16px;
      color: var(--slate);
    }}

    /* Cards & Grids */
    .card-grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 24px 0;
    }}

    .card-grid-3 {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 24px 0;
    }}

    .card-grid-4 {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin: 24px 0;
    }}

    .info-card {{
      background: var(--light-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }}

    .info-card.teal-top {{
      border-top: 3px solid var(--teal);
    }}

    .info-card.navy-top {{
      border-top: 3px solid var(--navy);
    }}

    .card-title {{
      font-size: 16px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 8px;
    }}

    .card-text {{
      font-size: 14px;
      color: var(--slate);
      line-height: 1.6;
    }}

    /* Metric Cards */
    .metric-card {{
      background: var(--light-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      transition: all 0.2s ease;
    }}

    .metric-value {{
      font-size: 32px;
      font-weight: 800;
      color: var(--teal);
      line-height: 1.1;
      margin-bottom: 6px;
    }}

    .metric-label {{
      font-size: 12px;
      font-weight: 600;
      color: var(--navy);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .metric-sub {{
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
    }}

    /* Status Badges */
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }}

    .badge-implemented {{
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #BBF7D0;
    }}

    .badge-in-progress {{
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }}

    .badge-pending {{
      background: #E0E7FF;
      color: #3730A3;
      border: 1px solid #C7D2FE;
    }}

    /* Tables */
    .report-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 14px;
    }}

    .report-table th {{
      background: var(--navy);
      color: var(--white);
      text-align: left;
      padding: 12px 16px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }}

    .report-table td {{
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--slate);
    }}

    .report-table tr:nth-child(even) td {{
      background: var(--light-bg);
    }}

    /* Diagrams */
    .diagram-container {{
      background: var(--light-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }}

    .diagram-title {{
      font-size: 14px;
      font-weight: 700;
      color: var(--navy);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }}

    /* Callout & Disclaimer */
    .callout-box {{
      background: #F0FDFA;
      border-left: 4px solid var(--teal);
      padding: 16px 20px;
      border-radius: 0 6px 6px 0;
      margin: 20px 0;
    }}

    .callout-box.warning {{
      background: #FFFBEB;
      border-left-color: #F59E0B;
    }}

    .callout-title {{
      font-weight: 700;
      font-size: 14px;
      color: var(--navy);
      margin-bottom: 6px;
    }}

    .callout-text {{
      font-size: 13px;
      color: var(--slate);
      line-height: 1.5;
    }}

    /* Footer */
    .report-footer {{
      border-top: 1px solid var(--border);
      padding: 24px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--light-bg);
      font-size: 12px;
      color: var(--muted);
    }}

    @media print {{
      body {{
        background: var(--white);
      }}
      .document-container {{
        box-shadow: none;
        margin: 0;
        max-width: 100%;
      }}
      .cover-page {{
        padding: 40px;
        page-break-after: always;
      }}
      .section-block {{
        page-break-inside: avoid;
      }}
      .page-break {{
        page-break-after: always;
      }}
    }}
  </style>
</head>
<body>

<div class="document-container">

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-page">
    <div class="cover-header">
      <img src="data:image/png;base64,{b64_logo}" alt="PrepFord Logo" class="cover-logo">
      <div>
        <span class="cover-badge">Confidential Technical Progress Briefing</span>
        <h1 class="cover-title">PREPFORD</h1>
        <div class="cover-subtitle">NCLEX-RN & NCLEX-PN Preparation Platform</div>
      </div>
    </div>

    <div class="cover-desc-box">
      <strong>Project Progress & Accomplishments Report</strong><br>
      An editorial and technical review of architectural modernization, Next Generation NCLEX (NGN) clinical judgment foundations, enterprise authentication, role-based access governance, quality assurance validation, and roadmap execution.
    </div>

    <div class="cover-meta-grid">
      <div class="meta-item">
        <div class="meta-label">Reporting Date</div>
        <div class="meta-value">30 October 2026</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Document Version</div>
        <div class="meta-value">Version 1.0 (Final)</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Target Audience</div>
        <div class="meta-value">Stakeholders & Reviewers</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Classification</div>
        <div class="meta-value">Engineering & Product</div>
      </div>
    </div>
  </div>

  <div class="report-body">

    <!-- ==================== SECTION 2: EXECUTIVE SUMMARY ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">02</span>
        <h2 class="section-title">Executive Summary</h2>
      </div>
      <p class="lead-paragraph">
        PrepFord is an advanced, enterprise-grade clinical learning and examination preparation platform specifically engineered for candidates preparing for the National Council Licensure Examination for Registered Nurses (NCLEX-RN) and Practical Nurses (NCLEX-PN).
      </p>
      <p>
        During the current development cycle, the engineering team executed a comprehensive architectural migration, eliminating prototype technical debt by retiring legacy NestJS and Prisma runtimes in favor of a robust, strongly-typed ASP.NET Core 8 Web API and PostgreSQL 16 relational database. Simultaneously, the frontend was completely modernized onto Next.js 16 (App Router), React 19, TypeScript 5, and Tailwind CSS.
      </p>
      <div class="card-grid-3">
        <div class="info-card teal-top">
          <div class="card-title">Zero-SQLite Policy</div>
          <div class="card-text">Eliminated local file-based SQLite databases across all environments, establishing unified PostgreSQL schemas for development, testing, and production.</div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">BFF & Mutual HMAC</div>
          <div class="card-text">Deployed a Next.js Backend-for-Frontend (BFF) proxy architecture with mutual HMAC-SHA256 cryptographic request signing and HttpOnly session cookies.</div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">NGN CJMM Alignment</div>
          <div class="card-text">Implemented authentic clinical judgment measurement covering all 6 NCSBN cognitive layers across 7 core nursing examination domains.</div>
        </div>
      </div>
      <div class="callout-box">
        <div class="callout-title">Current Operational Baseline</div>
        <div class="callout-text">
          Core architectural layers, database models, API controllers, and frontend workflows are fully implemented with 109 backend tests and 324 frontend tests passing in the development suite. Super Admin provisioning scripts and endpoint routing corrections are staged and under final staging observation.
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 3: PROJECT OVERVIEW & OBJECTIVES ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">03</span>
        <h2 class="section-title">Project Overview & Objectives</h2>
      </div>
      <p class="lead-paragraph">
        The primary objective of PrepFord is to provide nursing candidates with an uncompromising, high-fidelity simulation of the Next Generation NCLEX (NGN) exam environment, cultivating sound clinical judgment through structured cognitive measurement.
      </p>
      <div class="card-grid-2">
        <div class="info-card navy-top">
          <div class="card-title">1. Clinical Judgment Model (CJMM)</div>
          <div class="card-text">
            Aligns question authoring and scoring with the NCSBN 6-layer model:
            <strong>Recognize Cues</strong> &rarr; <strong>Analyze Cues</strong> &rarr; <strong>Prioritize Hypotheses</strong> &rarr; <strong>Generate Solutions</strong> &rarr; <strong>Take Actions</strong> &rarr; <strong>Evaluate Outcomes</strong>.
          </div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">2. Dual-Pathway Curriculum</div>
          <div class="card-text">
            Provides differentiated scope-of-practice learning paths:
            <strong>NCLEX-RN:</strong> Comprehensive nursing assessment, complex pathophysiological prioritization, care coordination.<br>
            <strong>NCLEX-PN:</strong> Focused clinical assessment, routine care management, practical nursing delegation.
          </div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">3. Enterprise Security & Governance</div>
          <div class="card-text">
            Enforces strict role-based access control (RBAC), multi-role resolution, immutable audit trails, and session invalidation to safeguard sensitive candidate and institutional data.
          </div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">4. Transparent Candidate Telemetry</div>
          <div class="card-text">
            Replaces misleading commercial "100% pass guarantees" with empirical competency metrics, spaced-repetition retention analytics, and cognitive deficit heatmaps.
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 4: TECHNOLOGY ARCHITECTURE ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">04</span>
        <h2 class="section-title">Technology Architecture</h2>
      </div>
      <p class="lead-paragraph">
        PrepFord is architected as a decoupled, multi-tiered enterprise application designed for high security, horizontal scalability, and maintainability.
      </p>

      <!-- Architecture SVG Diagram -->
      <div class="diagram-container">
        <div class="diagram-title">PrepFord Multi-Tier System Architecture</div>
        <svg viewBox="0 0 800 240" width="100%" height="240" xmlns="http://www.w3.org/2000/svg">
          <!-- Client Layer -->
          <rect x="20" y="30" width="180" height="180" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
          <rect x="20" y="30" width="180" height="36" rx="8" fill="#142B4A"/>
          <text x="110" y="53" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">CLIENT / BROWSER</text>
          <text x="110" y="90" fill="#475569" font-size="11" font-weight="600" text-anchor="middle">Next.js 16 (App Router)</text>
          <text x="110" y="110" fill="#64748B" font-size="10" text-anchor="middle">React 19 &bull; TypeScript 5</text>
          <text x="110" y="130" fill="#64748B" font-size="10" text-anchor="middle">Tailwind CSS &bull; shadcn/ui</text>
          <rect x="35" y="150" width="150" height="42" rx="4" fill="#0D9488" opacity="0.1"/>
          <text x="110" y="168" fill="#0D9488" font-size="10" font-weight="700" text-anchor="middle">BFF Proxy Layer</text>
          <text x="110" y="182" fill="#0D9488" font-size="9" text-anchor="middle">HttpOnly Cookie Auth</text>

          <!-- Connector 1 -->
          <line x1="200" y1="120" x2="300" y2="120" stroke="#0D9488" stroke-width="2" stroke-dasharray="4,4"/>
          <polygon points="295,116 305,120 295,124" fill="#0D9488"/>
          <rect x="215" y="102" width="70" height="18" rx="4" fill="#E0F2FE"/>
          <text x="250" y="114" fill="#0369A1" font-size="8" font-weight="700" text-anchor="middle">HMAC SIGNED</text>

          <!-- API Layer -->
          <rect x="310" y="30" width="200" height="180" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
          <rect x="310" y="30" width="200" height="36" rx="8" fill="#142B4A"/>
          <text x="410" y="53" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">APPLICATION BACKEND</text>
          <text x="410" y="90" fill="#475569" font-size="11" font-weight="600" text-anchor="middle">ASP.NET Core 8 Web API</text>
          <text x="410" y="110" fill="#64748B" font-size="10" text-anchor="middle">C# &bull; Clean Architecture</text>
          <text x="410" y="130" fill="#64748B" font-size="10" text-anchor="middle">EF Core 8 (Npgsql)</text>
          <rect x="325" y="150" width="170" height="42" rx="4" fill="#142B4A" opacity="0.08"/>
          <text x="410" y="168" fill="#142B4A" font-size="10" font-weight="700" text-anchor="middle">Security & Services</text>
          <text x="410" y="182" fill="#475569" font-size="9" text-anchor="middle">PBKDF2 &bull; RBAC &bull; Rate Limiting</text>

          <!-- Connector 2 -->
          <line x1="510" y1="120" x2="600" y2="120" stroke="#142B4A" stroke-width="2"/>
          <polygon points="595,116 605,120 595,124" fill="#142B4A"/>
          <rect x="525" y="102" width="60" height="18" rx="4" fill="#F1F5F9"/>
          <text x="555" y="114" fill="#475569" font-size="8" font-weight="700" text-anchor="middle">TLS / SQL</text>

          <!-- Database Layer -->
          <rect x="610" y="30" width="170" height="180" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
          <rect x="610" y="30" width="170" height="36" rx="8" fill="#142B4A"/>
          <text x="695" y="53" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">DATA PERSISTENCE</text>
          <text x="695" y="90" fill="#475569" font-size="11" font-weight="600" text-anchor="middle">PostgreSQL 16</text>
          <text x="695" y="110" fill="#64748B" font-size="10" text-anchor="middle">Relational Schema</text>
          <text x="695" y="130" fill="#64748B" font-size="10" text-anchor="middle">27 Production Tables</text>
          <rect x="625" y="150" width="140" height="42" rx="4" fill="#0D9488" opacity="0.1"/>
          <text x="695" y="168" fill="#0D9488" font-size="10" font-weight="700" text-anchor="middle">Data Integrity</text>
          <text x="695" y="182" fill="#0D9488" font-size="9" text-anchor="middle">ACID &bull; Audit Logging</text>
        </svg>
      </div>

      <div class="card-grid-3">
        <div class="info-card">
          <div class="card-title">Frontend BFF Proxy</div>
          <div class="card-text">Next.js API route handlers forward requests from client forms to backend services, managing HttpOnly session cookies without browser exposure.</div>
        </div>
        <div class="info-card">
          <div class="card-title">Mutual HMAC Security</div>
          <div class="card-text">Inter-service communication is secured via shared-secret HMAC-SHA256 headers with 300-second timestamp drift protection.</div>
        </div>
        <div class="info-card">
          <div class="card-title">PostgreSQL Unified Engine</div>
          <div class="card-text">PostgreSQL 16 serves as the single source of truth for all transactional, assessment, and audit data, eliminating schema fragmentation.</div>
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 5: MAJOR DEVELOPMENT ACCOMPLISHMENTS ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">05</span>
        <h2 class="section-title">Major Development Accomplishments</h2>
      </div>
      <p class="lead-paragraph">
        Key engineering milestones achieved across the platform architecture and user experience during this phase:
      </p>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 28%;">Accomplishment</th>
            <th style="width: 54%;">Technical Implementation Details</th>
            <th style="width: 18%;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>ASP.NET Core 8 Migration</strong></td>
            <td>Retired legacy NestJS/Prisma services; established strongly typed C# domain controllers, services, and repositories using EF Core 8.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
          <tr>
            <td><strong>Zero-SQLite Runtime</strong></td>
            <td>Removed all SQLite file dependencies; standardized on PostgreSQL 16 containerized instances with verified connection sanitization.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
          <tr>
            <td><strong>BFF Authentication Proxy</strong></td>
            <td>Engineered dedicated Next.js route handlers (/api/auth/*) forwarding requests to backend endpoints with mutual HMAC signing.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
          <tr>
            <td><strong>7 Clinical Domains</strong></td>
            <td>Curated and indexed study modules covering Cardiovascular, Respiratory, Neuro, Pharmacology, Pediatrics, Maternal-Newborn, and Mental Health.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
          <tr>
            <td><strong>Full-Screen Auth UI/UX</strong></td>
            <td>Redesigned sign-in and sign-up pages into standalone, two-column layouts with animated ECG pulse lines, light/dark modes, and WCAG AA compliance.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
          <tr>
            <td><strong>Multi-Role Resolver</strong></td>
            <td>Implemented unified client/server deterministic role resolution algorithm, thoroughly validated by 37 automated test cases.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== SECTION 6: AUTHENTICATION & SECURITY FOUNDATION ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">06</span>
        <h2 class="section-title">Authentication & Security Foundation</h2>
      </div>
      <p class="lead-paragraph">
        PrepFord employs a defense-in-depth security model designed to safeguard healthcare educational records and administrative controls against common web vulnerabilities.
      </p>
      <div class="card-grid-2">
        <div class="info-card teal-top">
          <div class="card-title">Edge Input Validation & BFF Isolation</div>
          <div class="card-text">
            Client requests never connect directly to the database or internal microservices. The Next.js BFF acts as a reverse proxy, sanitizing inputs, validating schema constraints, and shielding backend ports.
          </div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">Cryptographic Password Hashing</div>
          <div class="card-text">
            Candidate and staff credentials are hashed using PBKDF2 with HMAC-SHA512, 100,000 iterations, and a cryptographically random 32-byte salt per user record.
          </div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">HttpOnly Session Management</div>
          <div class="card-text">
            Authentication sessions utilize HttpOnly, Secure, SameSite=Strict cookies to eliminate cross-site scripting (XSS) token exfiltration risks, coupled with automated session expiration.
          </div>
        </div>
        <div class="info-card navy-top">
          <div class="card-title">Human-Centric Error Normalization</div>
          <div class="card-text">
            Raw stack traces and generic 404/500 errors are mapped into actionable, context-sensitive user feedback (e.g., 401: "The email or password is incorrect", 429: "Too many attempts").
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 7: ROLE-BASED ACCESS CONTROL (RBAC) ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">07</span>
        <h2 class="section-title">Role-Based Access Control (RBAC) & Hierarchy</h2>
      </div>
      <p class="lead-paragraph">
        The platform enforces a strict 7-tier hierarchical role structure, ensuring that administrative privileges, curriculum authoring rights, and student access boundaries are strictly isolated.
      </p>

      <!-- RBAC SVG Diagram -->
      <div class="diagram-container">
        <div class="diagram-title">PrepFord 7-Tier RBAC Governance Hierarchy</div>
        <svg viewBox="0 0 760 160" width="100%" height="160" xmlns="http://www.w3.org/2000/svg">
          <!-- Tier 1: Super Admin -->
          <g transform="translate(10, 20)">
            <rect width="95" height="110" rx="6" fill="#142B4A"/>
            <text x="47" y="32" fill="#5EEAD4" font-size="9" font-weight="700" text-anchor="middle">TIER 1</text>
            <text x="47" y="55" fill="#FFFFFF" font-size="11" font-weight="700" text-anchor="middle">Super Admin</text>
            <text x="47" y="75" fill="#CBD5E1" font-size="8" text-anchor="middle">Root Governance</text>
            <text x="47" y="88" fill="#CBD5E1" font-size="8" text-anchor="middle">System Audit</text>
            <text x="47" y="101" fill="#CBD5E1" font-size="8" text-anchor="middle">Tenant Config</text>
          </g>

          <!-- Arrow 1 -->
          <line x1="105" y1="75" x2="117" y2="75" stroke="#0D9488" stroke-width="2"/>
          <polygon points="115,71 121,75 115,79" fill="#0D9488"/>

          <!-- Tier 2: Admin -->
          <g transform="translate(118, 20)">
            <rect width="95" height="110" rx="6" fill="#F8FAFC" stroke="#0D9488" stroke-width="1.5"/>
            <text x="47" y="32" fill="#0D9488" font-size="9" font-weight="700" text-anchor="middle">TIER 2</text>
            <text x="47" y="55" fill="#142B4A" font-size="11" font-weight="700" text-anchor="middle">Administrator</text>
            <text x="47" y="75" fill="#475569" font-size="8" text-anchor="middle">User Lifecycle</text>
            <text x="47" y="88" fill="#475569" font-size="8" text-anchor="middle">Role Granting</text>
            <text x="47" y="101" fill="#475569" font-size="8" text-anchor="middle">Operations</text>
          </g>

          <!-- Arrow 2 -->
          <line x1="213" y1="75" x2="225" y2="75" stroke="#CBD5E1" stroke-width="2"/>
          <polygon points="223,71 229,75 223,79" fill="#CBD5E1"/>

          <!-- Tier 3: Exam Manager -->
          <g transform="translate(226, 20)">
            <rect width="95" height="110" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
            <text x="47" y="32" fill="#64748B" font-size="9" font-weight="700" text-anchor="middle">TIER 3</text>
            <text x="47" y="55" fill="#142B4A" font-size="10" font-weight="700" text-anchor="middle">Exam Manager</text>
            <text x="47" y="75" fill="#475569" font-size="8" text-anchor="middle">Test Assembly</text>
            <text x="47" y="88" fill="#475569" font-size="8" text-anchor="middle">Scoring Rules</text>
            <text x="47" y="101" fill="#475569" font-size="8" text-anchor="middle">Passing Bar</text>
          </g>

          <!-- Arrow 3 -->
          <line x1="321" y1="75" x2="333" y2="75" stroke="#CBD5E1" stroke-width="2"/>
          <polygon points="331,71 337,75 331,79" fill="#CBD5E1"/>

          <!-- Tier 4: Content Manager -->
          <g transform="translate(334, 20)">
            <rect width="95" height="110" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
            <text x="47" y="32" fill="#64748B" font-size="9" font-weight="700" text-anchor="middle">TIER 4</text>
            <text x="47" y="55" fill="#142B4A" font-size="10" font-weight="700" text-anchor="middle">Content Mgr</text>
            <text x="47" y="75" fill="#475569" font-size="8" text-anchor="middle">Item Pools</text>
            <text x="47" y="88" fill="#475569" font-size="8" text-anchor="middle">Domain Mapping</text>
            <text x="47" y="101" fill="#475569" font-size="8" text-anchor="middle">Study Guides</text>
          </g>

          <!-- Arrow 4 -->
          <line x1="429" y1="75" x2="441" y2="75" stroke="#CBD5E1" stroke-width="2"/>
          <polygon points="439,71 445,75 439,79" fill="#CBD5E1"/>

          <!-- Tier 5: Reviewer -->
          <g transform="translate(442, 20)">
            <rect width="95" height="110" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
            <text x="47" y="32" fill="#64748B" font-size="9" font-weight="700" text-anchor="middle">TIER 5</text>
            <text x="47" y="55" fill="#142B4A" font-size="11" font-weight="700" text-anchor="middle">Reviewer</text>
            <text x="47" y="75" fill="#475569" font-size="8" text-anchor="middle">Clinical Audit</text>
            <text x="47" y="88" fill="#475569" font-size="8" text-anchor="middle">Rationale Verify</text>
            <text x="47" y="101" fill="#475569" font-size="8" text-anchor="middle">Bias Detection</text>
          </g>

          <!-- Arrow 5 -->
          <line x1="537" y1="75" x2="549" y2="75" stroke="#CBD5E1" stroke-width="2"/>
          <polygon points="547,71 553,75 547,79" fill="#CBD5E1"/>

          <!-- Tier 6: Instructor -->
          <g transform="translate(550, 20)">
            <rect width="95" height="110" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
            <text x="47" y="32" fill="#64748B" font-size="9" font-weight="700" text-anchor="middle">TIER 6</text>
            <text x="47" y="55" fill="#142B4A" font-size="11" font-weight="700" text-anchor="middle">Instructor</text>
            <text x="47" y="75" fill="#475569" font-size="8" text-anchor="middle">Cohort Tracking</text>
            <text x="47" y="88" fill="#475569" font-size="8" text-anchor="middle">Remediation</text>
            <text x="47" y="101" fill="#475569" font-size="8" text-anchor="middle">Diagnostics</text>
          </g>

          <!-- Arrow 6 -->
          <line x1="645" y1="75" x2="657" y2="75" stroke="#0D9488" stroke-width="2"/>
          <polygon points="655,71 661,75 655,79" fill="#0D9488"/>

          <!-- Tier 7: Candidate -->
          <g transform="translate(658, 20)">
            <rect width="95" height="110" rx="6" fill="#0D9488"/>
            <text x="47" y="32" fill="#E0F2FE" font-size="9" font-weight="700" text-anchor="middle">TIER 7</text>
            <text x="47" y="55" fill="#FFFFFF" font-size="11" font-weight="700" text-anchor="middle">Candidate</text>
            <text x="47" y="75" fill="#E6FFFA" font-size="8" text-anchor="middle">Practice Tests</text>
            <text x="47" y="88" fill="#E6FFFA" font-size="8" text-anchor="middle">Case Studies</text>
            <text x="47" y="101" fill="#E6FFFA" font-size="8" text-anchor="middle">Telemetry</text>
          </g>
        </svg>
      </div>

      <p>
        <strong>Multi-Role Priority Resolution:</strong> Users possessing multiple assigned roles are evaluated through a centralized deterministic priority algorithm (implemented identically in <code>lib/auth/role-resolution.ts</code> on the frontend and <code>RoleResolutionService.cs</code> on the backend). The active persona resolves to the highest privilege tier, verified against 37 automated test scenarios.
      </p>
    </div>

    <!-- ==================== SECTION 8: LEARNING & EXAMINATION FOUNDATIONS ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">08</span>
        <h2 class="section-title">Learning & Examination Platform Foundations</h2>
      </div>
      <p class="lead-paragraph">
        PrepFord's assessment engine is built from the ground up around the Next Generation NCLEX (NGN) standard, accommodating both standalone items and complex clinical unfolding case studies.
      </p>
      <div class="card-grid-3">
        <div class="info-card">
          <div class="card-title">Advanced NGN Item Types</div>
          <div class="card-text">
            Supports Extended Multiple Response (Select N / Select All), Extended Drag-and-Drop, Matrix/Grid clinical judgment, Drop-Down Cloze in tables/rationales, Highlight/Hotspot, and Bowtie items.
          </div>
        </div>
        <div class="info-card">
          <div class="card-title">Polytomous & +/- Scoring</div>
          <div class="card-text">
            Implements polytomous scoring models: 0/1 credit, partial credit scoring, and +/- scoring with negative penalty clamping to accurately reflect modern NCSBN evaluation standards.
          </div>
        </div>
        <div class="info-card">
          <div class="card-title">Empirical Readiness Analytics</div>
          <div class="card-text">
            Replaces commercial "guaranteed pass" gimmicks with objective candidate telemetry: domain retention rates, cognitive step breakdown, and personalized review recommendations.
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 9: ADMINISTRATIVE MANAGEMENT ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">09</span>
        <h2 class="section-title">Administrative Management</h2>
      </div>
      <p class="lead-paragraph">
        The administrative tier provides institutional coordinators with full operational visibility, auditability, and emergency control mechanisms.
      </p>
      <div class="card-grid-2">
        <div class="info-card">
          <div class="card-title">Canonical Role Catalogue Synchronization</div>
          <div class="card-text">
            All system roles are defined in a canonical, database-backed catalogue that synchronizes frontend routing, BFF token claims, and EF Core entity constraints, preventing role name drift.
          </div>
        </div>
        <div class="info-card">
          <div class="card-title">Immutable Audit Trail</div>
          <div class="card-text">
            Administrative actions (role grants, user revocations, exam parameter modifications) are recorded in dedicated PostgreSQL audit tables with actor ID, IP address, timestamp, and payload snapshots.
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 10: UI/UX TRANSFORMATION ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">10</span>
        <h2 class="section-title">UI/UX Transformation</h2>
      </div>
      <p class="lead-paragraph">
        The user interface has undergone a substantial redesign, transforming standard transactional pages into high-impact, clinical-grade digital experiences.
      </p>
      <div class="card-grid-2">
        <div class="info-card teal-top">
          <div class="card-title">Full-Screen Clinical Sign-In / Sign-Up</div>
          <div class="card-text">
            Authentication pages were detached from the global navigation shell into focused, standalone viewports. The left panel showcases brand storytelling, an animated normal sinus rhythm ECG pulse line, and rotating testimonials; the right panel delivers accessible, high-contrast form controls.
          </div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">Design System & Accessibility (WCAG 2.1 AA)</div>
          <div class="card-text">
            Engineered using a clinical-technology palette (Primary Navy #142B4A, Medical Teal #0D9488, Slate #475569). Built with full keyboard navigation, ARIA live regions, semantic labels, and light/dark theme adaptability.
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 11: QUALITY ASSURANCE & REPORTED TEST RESULTS ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">11</span>
        <h2 class="section-title">Quality Assurance & Reported Test Results</h2>
      </div>
      <p class="lead-paragraph">
        Comprehensive automated test suites validate code health, security boundaries, and runtime integrity across frontend and backend tiers.
      </p>

      <!-- QA Metrics Cards -->
      <div class="card-grid-4">
        <div class="metric-card">
          <div class="metric-value">109</div>
          <div class="metric-label">Backend Tests</div>
          <div class="metric-sub">xUnit / Moq Passed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">324</div>
          <div class="metric-label">Frontend Tests</div>
          <div class="metric-sub">Vitest Suite Passed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">41</div>
          <div class="metric-label">Test Files</div>
          <div class="metric-sub">Web Workspace</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">0</div>
          <div class="metric-label">Type Errors</div>
          <div class="metric-sub">TypeScript Compiler</div>
        </div>
      </div>

      <div class="card-grid-4">
        <div class="metric-card">
          <div class="metric-value">37</div>
          <div class="metric-label">Role Tests</div>
          <div class="metric-sub">Resolution Matrix</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">3</div>
          <div class="metric-label">DB URI Tests</div>
          <div class="metric-sub">Sanitizer Passed</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">27</div>
          <div class="metric-label">DB Tables</div>
          <div class="metric-sub">PostgreSQL Schema</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">7</div>
          <div class="metric-label">Catalogue Roles</div>
          <div class="metric-sub">Synchronized</div>
        </div>
      </div>

      <div class="callout-box warning">
        <div class="callout-title">Formal Verification Notice</div>
        <div class="callout-text">
          <em>Important Note on Reported Metrics:</em> All test metrics presented above reflect results executed and reported by the implementation agent during development validation cycles. Formal independent reverification by dedicated QA engineers is scheduled as a prerequisite for staging gate sign-off.
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th>Test Harness</th>
            <th>Target Scope</th>
            <th>Test Framework</th>
            <th>Reported Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>ASP.NET Core API Test Suite</strong></td>
            <td>Controllers, Auth Services, DTOs, EF Core Repositories</td>
            <td>xUnit, Moq, FluentAssertions</td>
            <td><strong>109 / 109 Passed</strong></td>
          </tr>
          <tr>
            <td><strong>Next.js Web Test Suite</strong></td>
            <td>Components, Auth Context, BFF Route Handlers, Role Resolver</td>
            <td>Vitest, Testing Library, JSDOM</td>
            <td><strong>324 / 324 Passed</strong> (41 Files)</td>
          </tr>
          <tr>
            <td><strong>Static Type Safety</strong></td>
            <td>Entire Web Application & Shared TypeScript Types</td>
            <td>TypeScript Compiler (tsc v5.x)</td>
            <td><strong>0 Errors</strong> (Clean Compile)</td>
          </tr>
          <tr>
            <td><strong>Database Connection Validation</strong></td>
            <td>Npgsql Connection String Parsing & Parameter Handling</td>
            <td>Unit Harness</td>
            <td><strong>3 / 3 Passed</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== SECTION 12: RECENT TECHNICAL CORRECTIONS ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">12</span>
        <h2 class="section-title">Recent Technical Corrections & Outstanding Issues</h2>
      </div>
      <p class="lead-paragraph">
        During the authentication and runtime integration phase, several critical technical issues were diagnosed, addressed, and categorized for ongoing observation:
      </p>
      <div class="card-grid-3">
        <div class="info-card teal-top">
          <div class="card-title">1. PWA Manifest Collision</div>
          <div class="card-text">
            <strong>Resolved:</strong> Fixed an HTTP 500 error triggered by route collision between static files and dynamic handlers by establishing a standardized <code>/manifest.webmanifest</code> route handler.
          </div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">2. Login Route 404 & Port Collision</div>
          <div class="card-text">
            <strong>Resolved:</strong> Addressed a 404 failure where client forms targeted mismatched ports. Harmonized frontend <code>/api/auth/login</code> to proxy directly to backend <code>/api/v1/auth/login</code> on port 5000.
          </div>
        </div>
        <div class="info-card teal-top">
          <div class="card-title">3. PostgreSQL URI Parsing</div>
          <div class="card-text">
            <strong>Resolved:</strong> Corrected connection string parsing logic in <code>ConnectionStrings.cs</code> to properly sanitize URI query parameters (e.g. <code>?schema=public</code>).
          </div>
        </div>
      </div>
      <div class="callout-box warning">
        <div class="callout-title">Outstanding Technical Issues Under Ongoing Observation</div>
        <div class="callout-text">
          <strong>1. Local Development Cold-Start Port Latency:</strong> Intermittent proxy latency observed during simultaneous cold restarts of Next.js and Kestrel dev servers.<br>
          <strong>2. Turbopack Build Cache Invalidation:</strong> Occasional cache inconsistencies in local developer tooling requiring periodic manual <code>--clean</code> rebuilds.
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 13: SUPER ADMIN PROVISIONING STATUS ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">13</span>
        <h2 class="section-title">Super Admin Provisioning Status</h2>
      </div>
      <p class="lead-paragraph">
        A rigorous pre-bootstrap audit was conducted to verify that the root administrative tier can be initialized securely without compromising database integrity.
      </p>
      <div class="callout-box">
        <div class="callout-title">Explicit Provisioning Status: Pre-Bootstrap Complete & Awaiting Execution</div>
        <div class="callout-text">
          <strong>Status: Audit Complete & Bootstrap Scripts Staged — Account NOT Yet Confirmed as Provisioned in Production/Live DB.</strong><br>
          The schema has been audited, role catalogue synchronized, and bootstrap scripts prepared (<code>scripts/seed-superadmin.sql</code> and C# seeding utilities). The physical provisioning step is scheduled to execute during deployment initialization using secure environment variable injection.
        </div>
      </div>
      <div class="card-grid-2">
        <div class="info-card">
          <div class="card-title">Completed Audit Verifications</div>
          <div class="card-text">
            &bull; Database <code>Roles</code> table verified with unique GUID for Super Admin.<br>
            &bull; PBKDF2 hash generator tested with 100,000 iteration compatibility.<br>
            &bull; Audit log triggers confirmed to capture the initial bootstrap event.<br>
            &bull; Session creation pipeline tested with mock credentials.
          </div>
        </div>
        <div class="info-card">
          <div class="card-title">Pending Deployment Gate</div>
          <div class="card-text">
            &bull; Injection of <code>SUPERADMIN_INITIAL_PASSWORD</code> secret via deployment vault.<br>
            &bull; One-time execution of bootstrap command against the target staging database.<br>
            &bull; Verification of first-time login and mandatory credential rotation prompt.<br>
            &bull; Multi-factor authentication (MFA) enrollment verification.
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SECTION 14: IMMEDIATE DEVELOPMENT PRIORITIES ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">14</span>
        <h2 class="section-title">Immediate Development Priorities (Roadmap)</h2>
      </div>
      <p class="lead-paragraph">
        A structured, numbered development roadmap outlines active engineering tasks, distinguishing completed implementations from ongoing efforts and pending verifications:
      </p>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 8%;">#</th>
            <th style="width: 32%;">Priority Milestone</th>
            <th style="width: 42%;">Target Scope & Deliverables</th>
            <th style="width: 18%;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>01</strong></td>
            <td><strong>Super Admin Bootstrap Execution</strong></td>
            <td>Execute staged provisioning script in staging database environment; confirm role assignment and privileged session creation.</td>
            <td><span class="badge badge-pending">Pending Verification</span></td>
          </tr>
          <tr>
            <td><strong>02</strong></td>
            <td><strong>End-to-End Live Auth Verification</strong></td>
            <td>Validate live cookie transmission, session renewal, and role-based route guards through deployed reverse proxy.</td>
            <td><span class="badge badge-in-progress">In Progress</span></td>
          </tr>
          <tr>
            <td><strong>03</strong></td>
            <td><strong>Clinical Case Study Multi-Tab Interface</strong></td>
            <td>Finalize unfolding clinical patient chart interface (EHR, Nurses Notes, Vital Signs, Labs) with real-time cue updates.</td>
            <td><span class="badge badge-in-progress">In Progress</span></td>
          </tr>
          <tr>
            <td><strong>04</strong></td>
            <td><strong>7 Clinical Domain Content Population</strong></td>
            <td>Complete baseline question item pools and clinical rationales across all 7 nursing subject categories.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
          <tr>
            <td><strong>05</strong></td>
            <td><strong>Staging CI/CD Pipeline Automation</strong></td>
            <td>Establish automated GitHub Actions / GitLab CI workflows executing backend xUnit and frontend Vitest suites on PRs.</td>
            <td><span class="badge badge-pending">Pending Verification</span></td>
          </tr>
          <tr>
            <td><strong>06</strong></td>
            <td><strong>RBAC Client/Server Role Resolver</strong></td>
            <td>Deploy and verify unified role resolution matrix across both frontend and backend controllers.</td>
            <td><span class="badge badge-implemented">Implemented / Reported</span></td>
          </tr>
          <tr>
            <td><strong>07</strong></td>
            <td><strong>WCAG 2.1 AA Accessibility Audit</strong></td>
            <td>Conduct full automated and screen-reader accessibility audit of candidate examination and study interfaces.</td>
            <td><span class="badge badge-in-progress">In Progress</span></td>
          </tr>
          <tr>
            <td><strong>08</strong></td>
            <td><strong>PostgreSQL Concurrency Telemetry</strong></td>
            <td>Perform simulated concurrent candidate exam submissions to validate connection pool stability and response latency.</td>
            <td><span class="badge badge-pending">Pending Verification</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== SECTION 15: OVERALL ASSESSMENT & CONCLUSION ==================== -->
    <div class="section-block">
      <div class="section-header">
        <span class="section-num">15</span>
        <h2 class="section-title">Overall Project Assessment & Conclusion</h2>
      </div>
      <p class="lead-paragraph">
        PrepFord has achieved a critical engineering inflection point, successfully transitioning from early experimental prototypes into a technologically mature, secure, and resilient clinical preparation platform.
      </p>
      <p>
        The decision to consolidate the backend onto ASP.NET Core 8 Web API and PostgreSQL 16 has established a rock-solid foundation for enterprise reliability, transactional integrity, and maintainability. The integration of Next.js 16 with a dedicated BFF security perimeter, mutual HMAC signing, and HttpOnly session cookies provides robust protection against modern web threats.
      </p>
      <p>
        Furthermore, the platform's uncompromising commitment to authentic NCSBN Clinical Judgment Measurement Model (CJMM) evaluation and transparent candidate feedback positions PrepFord as a premier educational tool for nursing candidates and institutional nursing programs alike.
      </p>
      <div class="callout-box">
        <div class="callout-title">Conclusion & Next Milestones</div>
        <div class="callout-text">
          With foundational development substantially complete and automated test suites reporting clean status across both stacks, the immediate operational focus centers on live staging deployment, Super Admin bootstrap execution, and end-to-end integration verification.
        </div>
      </div>
    </div>

  </div> <!-- /report-body -->

  <!-- Report Footer -->
  <div class="report-footer">
    <div><strong>PrepFord</strong> &mdash; NCLEX-RN & NCLEX-PN Preparation Platform</div>
    <div>Reporting Date: 30 October 2026 | Technical Progress Report</div>
  </div>

</div> <!-- /document-container -->

</body>
</html>
"""
    return html

print("Loaded HTML Builder module.")
