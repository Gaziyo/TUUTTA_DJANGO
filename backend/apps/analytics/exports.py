from io import BytesIO, StringIO
import csv
import json
import zipfile
from typing import Iterable, List, Dict, Any

def _pdf_tools():
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except Exception as exc:
        raise RuntimeError(f"ReportLab unavailable: {exc}") from exc
    return A4, canvas


def build_csv(columns: List[Dict[str, str]], data: Iterable[Dict[str, Any]]) -> str:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([col['label'] for col in columns])
    for row in data:
        writer.writerow([row.get(col['id'], '') for col in columns])
    return output.getvalue()


def create_summary_pdf(payload: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    A4, canvas = _pdf_tools()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 72

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(width / 2, y, "Compliance Evidence Summary")
    y -= 36

    pdf.setFont("Helvetica", 12)
    pdf.drawString(72, y, f"Organization: {payload.get('orgName', 'Organization')}")
    y -= 18
    pdf.drawString(72, y, f"Generated: {payload.get('generatedAt', '')}")
    y -= 18
    date_range = payload.get('dateRange')
    if date_range:
        pdf.drawString(72, y, f"Period: {date_range}")
        y -= 18
    pdf.drawString(72, y, f"Records: {payload.get('recordCount', 0)}")
    y -= 24
    pdf.setFont("Helvetica-Oblique", 10)
    pdf.drawString(72, y, "This summary is part of the Tuutta compliance export package.")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def create_certificate_pdf(payload: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    A4, canvas = _pdf_tools()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 72

    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawCentredString(width / 2, y, "Certificate of Completion")
    y -= 42

    pdf.setFont("Helvetica", 12)
    pdf.drawString(72, y, f"Organization: {payload.get('orgName', '')}")
    y -= 18
    pdf.drawString(72, y, f"Learner: {payload.get('learnerName', '')}")
    y -= 18
    pdf.drawString(72, y, f"Course: {payload.get('courseTitle', '')}")
    y -= 18
    pdf.drawString(72, y, f"Issued: {payload.get('issuedAt', '')}")
    y -= 24
    pdf.drawString(72, y, f"Certificate ID: {payload.get('certificateNumber', '')}")
    y -= 18
    verification = payload.get('verificationUrl')
    if verification:
        pdf.drawString(72, y, f"Verify: {verification}")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def build_evidence_zip(payload: Dict[str, Any]) -> bytes:
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('summary.pdf', payload['summary_pdf'])
        zf.writestr('completion_records.csv', payload['completion_csv'])
        zf.writestr('assessment_scores.csv', payload['assessment_csv'])
        zf.writestr('audit_log.json', json.dumps(payload['audit_logs'], indent=2))

        for cert in payload.get('certificates', []):
            filename = f"certificates/{cert['file_name']}.pdf"
            zf.writestr(filename, cert['pdf'])

    zip_buffer.seek(0)
    return zip_buffer.read()
