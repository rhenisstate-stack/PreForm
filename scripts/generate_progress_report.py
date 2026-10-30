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
from io import BytesIO

# Colors
NAVY = "#142B4A"
TEAL = "#0D9488"
WHITE = "#FFFFFF"
LIGHT_BG = "#F8FAFC"
SEC_BG = "#F1F5F9"
SLATE = "#475569"
BORDER = "#E2E8F0"
MUTED_TEXT = "#64748B"
DARK_NAVY = "#0F172A"

# RGB Floats for PDF
PDF_NAVY = (0.078, 0.169, 0.290)
PDF_TEAL = (0.051, 0.580, 0.533)
PDF_WHITE = (1.0, 1.0, 1.0)
PDF_LIGHT_BG = (0.973, 0.980, 0.988)
PDF_SEC_BG = (0.945, 0.961, 0.976)
PDF_SLATE = (0.278, 0.333, 0.412)
PDF_BORDER = (0.886, 0.910, 0.941)
PDF_MUTED = (0.392, 0.455, 0.545)
PDF_DARK_NAVY = (0.059, 0.090, 0.165)
PDF_ACCENT_BG = (0.918, 0.976, 0.969) # light teal tint

def load_logo_png(logo_path):
    with open(logo_path, "rb") as f:
        png_bytes = f.read()
    
    # Parse PNG chunks to get width, height, decompressed RGB and Alpha
    pos = 8
    idat = bytearray()
    w, h = 0, 0
    while pos < len(png_bytes):
        length, chunk_type = struct.unpack(">I4s", png_bytes[pos:pos+8])
        chunk_data = png_bytes[pos+8:pos+8+length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            w, h, depth, ctype, _, _, _ = struct.unpack(">IIBBBBB", chunk_data)
            assert depth == 8 and ctype == 6
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

print("Loaded logo parser module successfully.")
