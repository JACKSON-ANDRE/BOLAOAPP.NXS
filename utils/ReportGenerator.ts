import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TransactionItem {
    created_at: string;
    type: string;
    amount: number;
    category: 'credit' | 'debit';
    status: string;
}

export const generateMonthlyReport = (
    userName: string,
    month: number,
    year: number,
    items: TransactionItem[],
    stats: { totalDeposited: number; totalBet: number; totalWon: number; totalWithdrawn: number }
) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório Financeiro Mensal', 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Usuário: ${userName}`, 14, 32);
    doc.text(`Período: ${month + 1}/${year}`, 14, 38);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 44);

    // Stats Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 50, 180, 30, 'F');

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    doc.text('Total Apostado', 20, 60);
    doc.setFontSize(14);
    doc.setTextColor(220, 50, 50); // Red
    doc.text(`R$ ${stats.totalBet.toFixed(2)}`, 20, 68);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Total Ganho (Prêmios)', 80, 60);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`R$ ${stats.totalWon.toFixed(2)}`, 80, 68);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Saldo do Mês', 140, 60);
    doc.setFontSize(14);
    const balance = stats.totalWon - stats.totalBet;
    doc.setTextColor(balance >= 0 ? 16 : 220, balance >= 0 ? 185 : 50, balance >= 0 ? 129 : 50);
    doc.text(`R$ ${balance.toFixed(2)}`, 140, 68);

    // Transactions Table
    const tableData = items.map(item => [
        new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString().slice(0, 5),
        translateType(item.type),
        (item.category === 'credit' ? '+ ' : '- ') + item.amount.toFixed(2),
        translateStatus(item.status)
    ]);

    autoTable(doc, {
        head: [['Data', 'Tipo', 'Valor (R$)', 'Status']],
        body: tableData,
        startY: 90,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [20, 20, 23] }, // Dark theme header (like app)
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Save
    doc.save(`extrato_${userName.replace(/\s+/g, '_').toLowerCase()}_${month + 1}_${year}.pdf`);
};


export interface PoolReportItem {
    name: string;
    created_at: string;
    status: string;
    entry_fee: number;
    participants_count: number;
    total_amount: number; // Total pot (entry * participants)
    house_fee: number; // 10% usually
    net_prize: number;
}

export const generateAdminPoolsReport = (
    month: number,
    year: number,
    items: PoolReportItem[],
    stats: { totalPools: number; totalVolume: number; totalHouseEarnings: number; totalPayouts: number }
) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Relatório Mensal de Bolões', 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período de Referência: ${month + 1}/${year}`, 14, 32);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 38);

    // Stats Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 45, 180, 25, 'F');

    // Row 1 Stats
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Bolões Realizados', 20, 52);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(stats.totalPools.toString(), 20, 60);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Volume Total (Entradas)', 70, 52);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`R$ ${stats.totalVolume.toFixed(2)}`, 70, 60);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Lucro da Casa', 130, 52);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`R$ ${stats.totalHouseEarnings.toFixed(2)}`, 130, 60);

    // Pools Table
    const tableData = items.map(item => [
        new Date(item.created_at).toLocaleDateString(),
        item.name,
        `R$ ${item.entry_fee.toFixed(2)}`,
        item.participants_count.toString(),
        `R$ ${item.total_amount.toFixed(2)}`,
        `R$ ${item.house_fee.toFixed(2)}`
    ]);

    autoTable(doc, {
        head: [['Data', 'Bolão', 'Entrada', 'Part.', 'Total', 'Taxa Casa']],
        body: tableData,
        startY: 80,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [20, 20, 23] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        foot: [[
            'TOTAL',
            '',
            '',
            stats.totalPools.toString(),
            `R$ ${stats.totalVolume.toFixed(2)}`,
            `R$ ${stats.totalHouseEarnings.toFixed(2)}`
        ]],
        footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Save
    doc.save(`relatorio_boloes_${month + 1}_${year}.pdf`);
};

export const generateFinancialListReport = (
    type: 'deposits' | 'withdraws',
    period: string, // "Janeiro/2026" or "23/01/2026"
    items: any[],
    stats: { totalCount: number; approvedCount: number; pendingCount: number; totalVolume: number }
) => {
    const doc = new jsPDF();
    const title = type === 'deposits' ? 'Relatório de Depósitos' : 'Relatório de Saques';
    const color = type === 'deposits' ? [16, 185, 129] : [239, 68, 68]; // Green or Red

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${period}`, 14, 32);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 38);

    // Stats Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 45, 180, 25, 'F');

    // Stats
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Total Registros', 20, 52);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(stats.totalCount.toString(), 20, 60);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Volume Total', 60, 52);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`R$ ${stats.totalVolume.toFixed(2)}`, 60, 60);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Aprovados', 110, 52);
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(stats.approvedCount.toString(), 110, 60);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Pendentes', 150, 52);
    doc.setFontSize(14);
    doc.setTextColor(234, 179, 8); // Yellow
    doc.text(stats.pendingCount.toString(), 150, 60);

    // Table
    const tableData = items.map(item => {
        const date = new Date(item.created_at).toLocaleString();
        const user = item.profiles?.full_name || 'Desconhecido';
        const val = `R$ ${item.amount.toFixed(2)}`;
        const status = translateStatus(item.status);

        if (type === 'deposits') {
            return [item.id.slice(0, 8), date, user, val, status];
        } else {
            // For withdraws include PIX key
            return [date, user, item.pix_key, val, status];
        }
    });

    const head = type === 'deposits'
        ? [['ID', 'Data', 'Usuário', 'Valor', 'Status']]
        : [['Data', 'Usuário', 'Chave PIX', 'Valor', 'Status']];

    autoTable(doc, {
        head: head,
        body: tableData,
        startY: 80,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [20, 20, 23] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${period.replace(/\//g, '-')}.pdf`);
};

export const generateLedgerReport = (
    period: string,
    items: any[],
    stats: { totalVolume: number; totalCount: number }
) => {
    const doc = new jsPDF();
    const title = 'Extrato Geral de Movimentações';

    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${period}`, 14, 32);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 38);

    // Stats Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 45, 180, 20, 'F');

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Total de Registros', 20, 52);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(stats.totalCount.toString(), 20, 60);

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Volume Movimentado (Absoluto)', 80, 52);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`R$ ${stats.totalVolume.toFixed(2)}`, 80, 60);

    // Table
    const tableData = items.map(item => {
        const date = new Date(item.created_at).toLocaleString();
        const user = item.profiles?.full_name || 'Desconhecido';
        const typeHtml = translateType(item.type);
        const amount = `R$ ${item.amount.toFixed(2)}`;
        const balance = (item.balance_before !== undefined && item.balance_after !== undefined)
            ? `R$ ${item.balance_before.toFixed(2)} -> R$ ${item.balance_after.toFixed(2)}`
            : '-';

        return [date, user, typeHtml, amount, balance];
    });

    autoTable(doc, {
        head: [['Data', 'Usuário', 'Tipo', 'Valor', 'Audit. Saldo']],
        body: tableData,
        startY: 75,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [20, 20, 23] },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25 },
            4: { cellWidth: 50 },
        }
    });

    doc.save(`extrato_geral_${period.replace(/\//g, '-')}.pdf`);
};

function translateType(type: string): string {
    switch (type) {
        case 'deposit': return 'Depósito';
        case 'withdraw': return 'Saque';
        case 'winning': return 'Prêmio';
        case 'bet_debit': return 'Aposta';
        case 'refund': return 'Reembolso';
        case 'deposit_request': return 'Solic. Depósito';
        case 'withdraw_request': return 'Solic. Saque';
        default: return type;
    }
}

function translateStatus(status: string): string {
    switch (status) {
        case 'approved': return 'Aprovado';
        case 'pending': return 'Pendente';
        case 'rejected': return 'Rejeitado';
        case 'won': return 'Ganhou';
        case 'lost': return 'Perdeu';
        default: return status;
    }
}
