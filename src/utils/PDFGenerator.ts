import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HealthReport } from './SystemHealthService';

export const generateIntegrityPDF = (report: HealthReport, adminName: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Background
    doc.setFillColor(10, 10, 11); // Dark background
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Logo/Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BOLÃO APP', 15, 20);

    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text('RELATÓRIO DE INTEGRIDADE E AUDITORIA', 15, 30);

    // Metadata
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 15, 15, { align: 'right' });
    doc.text(`Solicitante: ${adminName}`, pageWidth - 15, 25, { align: 'right' });

    // Status Banner
    const startY = 50;
    const isHealthy = report.status === 'healthy';
    const isCritical = report.status === 'critical';

    doc.setFillColor(isHealthy ? 16 : (isCritical ? 239 : 234), isHealthy ? 185 : (isCritical ? 68 : 179), isHealthy ? 129 : (isCritical ? 68 : 8));
    // Colors: Emerald, Red, or Yellow (Warning not implemented in logic perfectly yet, assuming critical/healthy binary for banner color base)

    if (report.status === 'healthy') doc.setFillColor(209, 250, 229); // Light Green
    else if (report.status === 'warning') doc.setFillColor(254, 252, 232); // Light Yellow
    else doc.setFillColor(254, 226, 226); // Light Red

    doc.rect(15, startY, pageWidth - 30, 25, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    if (report.status === 'healthy') {
        doc.setTextColor(6, 95, 70); // Dark Green
        doc.text('✅ SISTEMA ÍNTEGRO E OPERACIONAL', pageWidth / 2, startY + 17, { align: 'center' });
    } else if (report.status === 'warning') {
        doc.setTextColor(133, 77, 14); // Dark Yellow
        doc.text('⚠️ ATENÇÃO: INCONSISTÊNCIAS DETECTADAS', pageWidth / 2, startY + 17, { align: 'center' });
    } else {
        doc.setTextColor(153, 27, 27); // Dark Red
        doc.text('❌ ERRO CRÍTICO: AÇÃO IMEDIATA NECESSÁRIA', pageWidth / 2, startY + 17, { align: 'center' });
    }

    // Summary Metrics
    let metricsY = startY + 40;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('Resumo de Métricas:', 15, metricsY);

    const metricsData = [
        ['Saldos Negativos', report.metrics?.negative_balances || 0],
        ['Apostas Órfãs', report.metrics?.orphan_bets || 0],
        ['Depósitos Travados (>24h)', report.metrics?.stuck_deposits || 0],
        ['Saques Travados (>48h)', report.metrics?.stuck_withdraws || 0],
        ['Duplicidade PIX', report.metrics?.duplicate_deposits || 0]
    ];

    autoTable(doc, {
        startY: metricsY + 5,
        head: [['Métrica', 'Quantidade']],
        body: metricsData,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 50, fontStyle: 'bold' }
        },
        margin: { left: 15 }
    });

    // Issues List
    let issuesY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Detalhamento das Ocorrências:', 15, issuesY);

    const issuesBody = report.issues.map(issue => [issue]);

    autoTable(doc, {
        startY: issuesY + 5,
        head: [['Descrição do Problema']],
        body: issuesBody,
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] }, // Red header for issues
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Bolão App Security & Integrity Module v2.0', pageWidth / 2, pageHeight - 12, { align: 'center' });
    doc.text('Confidencial - Uso Interno', pageWidth / 2, pageHeight - 7, { align: 'center' });

    // Save
    doc.save(`relatorio_integridade_${new Date().toISOString().slice(0, 10)}.pdf`);
};
