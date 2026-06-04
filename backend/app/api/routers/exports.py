"""
Export endpoints — PDF and CSV generation.
PDF uses ReportLab. CSV uses pandas/custom logic.
"""
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.all_models import Execution, ExecutionResult, Problem

router = APIRouter()


@router.get("/pdf/{problem_id}")
async def export_pdf(problem_id: str, db: AsyncSession = Depends(get_db)):
    problem, execution = await _load_latest(db, problem_id)
    if not execution or not execution.result:
        raise HTTPException(status_code=404, detail="No completed execution found for this problem")

    pdf_bytes = _build_pdf(problem, execution)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="fuzzy_topsis_{problem.name}.pdf"'},
    )


@router.get("/csv/{problem_id}")
async def export_csv(problem_id: str, db: AsyncSession = Depends(get_db)):
    problem, execution = await _load_latest(db, problem_id)
    if not execution or not execution.result:
        raise HTTPException(status_code=404, detail="No completed execution found for this problem")

    csv_content = _build_csv(problem, execution)
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="fuzzy_topsis_{problem.name}.csv"'},
    )


# ──────────────────────────────────────────────────────────────────────────
# Builders
# ──────────────────────────────────────────────────────────────────────────

def _format_tfn(tfn: list) -> str:
    if not tfn or len(tfn) != 3:
        return "—"
    return f"({tfn[0]:.2f}, {tfn[1]:.2f}, {tfn[2]:.2f})"


def _build_pdf(problem: Problem, execution: Execution) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ImportError:
        raise HTTPException(status_code=500, detail="ReportLab not installed")

    buffer = io.BytesIO()
    # Using landscape to fit wider tables
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = styles["Title"]
    h2 = styles["Heading2"]
    h3 = styles["Heading3"]
    normal = styles["Normal"]
    
    explanation_style = ParagraphStyle(
        "Explanation",
        parent=styles["Normal"],
        textColor=colors.HexColor("#1e3a8a"),
        fontSize=9,
        leading=12,
        spaceBefore=5,
        spaceAfter=10
    )

    story = []

    # Title & Metadata
    story.append(Paragraph(f"Relatório Fuzzy TOPSIS: {problem.name}", title_style))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", normal))
    if problem.description:
        story.append(Paragraph(f"Descrição: {problem.description}", normal))
    story.append(Spacer(1, 0.5*cm))

    result = execution.result
    
    criteria = sorted(problem.criteria, key=lambda c: c.position)
    alternatives = sorted(problem.alternatives, key=lambda a: a.position)

    # Helper function for drawing matrices
    def _draw_matrix(title, desc, matrix_data, is_tfn=True):
        story.append(Paragraph(title, h3))
        story.append(Paragraph(desc, explanation_style))
        
        headers = ["Alternativa"] + [c.name for c in criteria]
        table_data = [headers]
        
        for alt in alternatives:
            row = [alt.name]
            for c in criteria:
                val = matrix_data.get(str(alt.id), {}).get(str(c.id))
                if val is None:
                    row.append("—")
                elif is_tfn:
                    row.append(_format_tfn(val))
                else:
                    row.append(f"{val:.4f}")
            table_data.append(row)
            
        t = Table(table_data)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.5*cm))

    # 1. Criteria List & Weights
    story.append(Paragraph("1. Critérios e Pesos", h2))
    story.append(Paragraph("Pesos fuzzy aplicados aos critérios da decisão.", explanation_style))
    crit_data = [["Critério", "Tipo", "Peso Linguístico", "TFN de Peso"]]
    for c in criteria:
        w_tfn = result.weights.get(str(c.id), [])
        crit_data.append([c.name, "Benefício" if c.criterion_type == "benefit" else "Custo", c.weight_term, _format_tfn(w_tfn)])
    
    c_table = Table(crit_data)
    c_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(c_table)
    story.append(Spacer(1, 0.5*cm))

    # 2. Decision Matrix
    _draw_matrix(
        "2. Matriz de Decisão Fuzzy",
        "Avaliações linguísticas convertidas para Números Fuzzy Triangulares (TFN).",
        result.decision_matrix
    )

    # 3. Normalized Matrix
    _draw_matrix(
        "3. Matriz Normalizada",
        "Elimina diferenças de escala entre critérios.",
        result.normalized_matrix
    )

    # 4. Weighted Matrix
    _draw_matrix(
        "4. Matriz Ponderada",
        "Aplica a importância (peso) de cada critério na matriz normalizada.",
        result.weighted_matrix
    )

    # 5. FPIS & FNIS
    story.append(Paragraph("5. Soluções Ideais Fuzzy (FPIS e FNIS)", h2))
    story.append(Paragraph("FPIS (A*) é a melhor alternativa hipotética, e FNIS (A-) é a pior alternativa hipotética.", explanation_style))
    
    ideal_data = [["Ideal"] + [c.name for c in criteria]]
    
    fpis_row = ["FPIS (A*)"]
    fnis_row = ["FNIS (A-)"]
    for c in criteria:
        fpis_row.append(_format_tfn(result.fpis.get(str(c.id), [])))
        fnis_row.append(_format_tfn(result.fnis.get(str(c.id), [])))
        
    ideal_data.append(fpis_row)
    ideal_data.append(fnis_row)
    
    i_table = Table(ideal_data)
    i_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#dcfce7")), # FPIS
        ("BACKGROUND", (0, 2), (0, 2), colors.HexColor("#fee2e2")), # FNIS
    ]))
    story.append(i_table)
    story.append(Spacer(1, 0.5*cm))

    # 6. Final Ranking & CC
    story.append(Paragraph("6. Distâncias e Ranking Final", h2))
    story.append(Paragraph("Cálculo das distâncias para as soluções ideais e o Closeness Coefficient (CC).", explanation_style))
    
    ranking_data = [["Posição", "Alternativa", "d* (FPIS)", "d- (FNIS)", "CC (Closeness Coefficient)"]]
    for item in result.ranking:
        ranking_data.append([
            str(item["rank"]),
            item["alt_name"],
            f'{item["d_pos"]:.6f}',
            f'{item["d_neg"]:.6f}',
            f'{item["cc"]:.6f}',
        ])

    table = Table(ranking_data)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f9ff")]),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.5*cm))

    doc.build(story)
    return buffer.getvalue()


def _build_csv(problem: Problem, execution: Execution) -> str:
    result = execution.result
    criteria = sorted(problem.criteria, key=lambda c: c.position)
    alternatives = sorted(problem.alternatives, key=lambda a: a.position)
    
    lines = [
        f"Fuzzy TOPSIS Export — {problem.name}",
        f"Data,{datetime.now().strftime('%d/%m/%Y %H:%M')}",
        ""
    ]
    
    # 1. Ranking
    lines += ["RANKING FINAL"]
    lines.append("Posição,Alternativa,CC,d* (FPIS),d- (FNIS)")
    for item in result.ranking:
        lines.append(f"{item['rank']},{item['alt_name']},{item['cc']:.6f},{item['d_pos']:.6f},{item['d_neg']:.6f}")
    lines.append("")

    # Helper function for CSV matrices
    def _append_matrix_csv(title, matrix_data):
        lines.append(title)
        headers = ["Alternativa"] + [c.name for c in criteria]
        lines.append(",".join(headers))
        for alt in alternatives:
            row = [alt.name]
            for c in criteria:
                val = matrix_data.get(str(alt.id), {}).get(str(c.id))
                if val:
                    # Enclose in quotes to avoid breaking CSV columns
                    row.append(f'"{val[0]:.3f}, {val[1]:.3f}, {val[2]:.3f}"')
                else:
                    row.append("")
            lines.append(",".join(row))
        lines.append("")

    # 2. Decision Matrix
    _append_matrix_csv("MATRIZ DE DECISAO FUZZY", result.decision_matrix)

    # 3. Normalized Matrix
    _append_matrix_csv("MATRIZ NORMALIZADA", result.normalized_matrix)

    # 4. Weighted Matrix
    _append_matrix_csv("MATRIZ PONDERADA", result.weighted_matrix)

    # 5. FPIS and FNIS
    lines.append("SOLUCOES IDEAIS FUZZY (FPIS e FNIS)")
    headers = ["Ideal"] + [c.name for c in criteria]
    lines.append(",".join(headers))
    
    fpis_row = ["FPIS (A*)"]
    fnis_row = ["FNIS (A-)"]
    for c in criteria:
        fpis = result.fpis.get(str(c.id), [])
        fnis = result.fnis.get(str(c.id), [])
        fpis_row.append(f'"{fpis[0]:.3f}, {fpis[1]:.3f}, {fpis[2]:.3f}"' if fpis else "")
        fnis_row.append(f'"{fnis[0]:.3f}, {fnis[1]:.3f}, {fnis[2]:.3f}"' if fnis else "")
        
    lines.append(",".join(fpis_row))
    lines.append(",".join(fnis_row))

    return "\n".join(lines)


async def _load_latest(db: AsyncSession, problem_id: str):
    result_q = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result_q.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    exec_q = await db.execute(
        select(Execution)
        .options(selectinload(Execution.result))
        .where(Execution.problem_id == problem_id, Execution.status == "done")
        .order_by(Execution.executed_at.desc())
        .limit(1)
    )
    execution = exec_q.scalar_one_or_none()
    return problem, execution
