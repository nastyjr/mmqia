/**
 * Automated PDF Report Generator
 * Generates and schedules PDF reports for various entities
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { executiveReportGenerator, ExecutiveReport } from './executiveReportGenerator';
import { cashFlowPredictor } from './cashFlowPredictor';
import { anomalyDetector } from './anomalyDetector';

export interface ReportSchedule {
    id: string;
    name: string;
    reportType: 'executive' | 'cashflow' | 'budget' | 'inventory' | 'anomalies';
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:MM
    recipients: string[];
    enabled: boolean;
    lastRun?: string;
}

class AutomatedPDFReportGenerator {
    private readonly SCHEDULES_KEY = 'report_schedules';

    /**
     * Generate executive report PDF
     */
    generateExecutiveReportPDF(report: ExecutiveReport): jsPDF {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE EJECUTIVO', 105, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const [year, month] = report.period.split('-');
        doc.text(`${monthNames[parseInt(month) - 1]} ${year}`, 105, 30, { align: 'center' });

        // Summary Section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Financiero', 14, 55);

        const formatCLP = (val: number) => `$${val.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`;

        // Summary boxes
        const boxes: Array<{ label: string; value: string; color: [number, number, number] }> = [
            { label: 'Ingresos', value: formatCLP(report.summary.revenue), color: [46, 204, 113] },
            { label: 'Gastos', value: formatCLP(report.summary.expenses), color: [231, 76, 60] },
            { label: 'Utilidad Neta', value: formatCLP(report.summary.netProfit), color: report.summary.netProfit > 0 ? [46, 204, 113] : [231, 76, 60] },
            { label: 'Margen', value: `${report.summary.profitMargin.toFixed(1)}%`, color: [52, 152, 219] }
        ];

        let xPos = 14;
        boxes.forEach(box => {
            doc.setFillColor(...box.color);
            doc.rect(xPos, 65, 45, 25, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(box.label, xPos + 22.5, 73, { align: 'center' });

            doc.setFontSize(14);
            doc.text(box.value, xPos + 22.5, 83, { align: 'center' });

            xPos += 48;
        });

        // KPIs Table
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Indicadores Clave', 14, 105);

        const kpiData = report.kpis.map(kpi => [
            kpi.name,
            `${kpi.value.toFixed(1)} ${kpi.unit}`,
            kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→',
            kpi.status === 'good' ? '✓ Bueno' : kpi.status === 'warning' ? '⚠ Alerta' : '✗ Crítico'
        ]);

        // @ts-ignore
        autoTable(doc, {
            startY: 110,
            head: [['KPI', 'Valor', 'Tendencia', 'Estado']],
            body: kpiData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 10 },
            columnStyles: {
                2: { halign: 'center' },
                3: { halign: 'center' }
            }
        });

        // @ts-ignore
        let yPos = doc.lastAutoTable.finalY + 15;

        // Insights
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Insights', 14, yPos);

        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        report.insights.slice(0, 3).forEach(insight => {
            const icon = insight.type === 'positive' ? '✓' : insight.type === 'negative' ? '✗' : 'ℹ';
            const color: [number, number, number] = insight.type === 'positive' ? [46, 204, 113] : insight.type === 'negative' ? [231, 76, 60] : [52, 152, 219];

            doc.setTextColor(...color);
            doc.setFont('helvetica', 'bold');
            doc.text(`${icon} ${insight.title}`, 14, yPos);

            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(insight.description, 180);
            doc.text(lines, 14, yPos + 5);

            yPos += 5 + (lines.length * 5) + 8;
        });

        // Recommendations
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendaciones', 14, yPos);

        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        report.recommendations.forEach((rec, index) => {
            doc.text(`${index + 1}. ${rec}`, 14, yPos);
            yPos += 7;
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado automáticamente el ${new Date().toLocaleDateString('es-CL')}`, 105, 285, { align: 'center' });

        return doc;
    }

    /**
     * Generate cash flow projection PDF
     */
    generateCashFlowPDF(): jsPDF {
        const doc = new jsPDF();
        const predictions = cashFlowPredictor.predictCashFlow(6);

        // Header
        doc.setFillColor(155, 89, 182);
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('PROYECCIÓN DE FLUJO DE CAJA', 105, 22, { align: 'center' });

        // Table
        const tableData = predictions.map(pred => [
            pred.period,
            `$${pred.predictedInflow.toLocaleString('es-CL')}`,
            `$${pred.predictedOutflow.toLocaleString('es-CL')}`,
            `$${pred.predictedBalance.toLocaleString('es-CL')}`,
            `${pred.confidence}%`
        ]);

        // @ts-ignore
        autoTable(doc, {
            startY: 45,
            head: [['Período', 'Ingresos', 'Egresos', 'Saldo', 'Confianza']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [155, 89, 182], textColor: 255 },
            styles: { fontSize: 10, halign: 'right' },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold' }
            }
        });

        // Alerts
        // @ts-ignore
        let yPos = doc.lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Alertas', 14, yPos);

        yPos += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        predictions.forEach(pred => {
            if (pred.alerts.length > 0) {
                pred.alerts.forEach(alert => {
                    const color: [number, number, number] = alert.type === 'CASH_SHORTAGE' ? [231, 76, 60] : alert.type === 'WARNING' ? [241, 196, 15] : [46, 204, 113];
                    doc.setTextColor(...color);
                    doc.text(`• ${alert.message}`, 14, yPos);
                    yPos += 7;
                });
            }
        });

        return doc;
    }

    /**
     * Generate anomalies report PDF
     */
    generateAnomaliesPDF(): jsPDF {
        const doc = new jsPDF();
        const anomalies = anomalyDetector.detectAnomalies();

        // Header
        doc.setFillColor(230, 126, 34);
        doc.rect(0, 0, 210, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE ANOMALÍAS', 105, 22, { align: 'center' });

        if (anomalies.length === 0) {
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text('No se detectaron anomalías', 105, 60, { align: 'center' });
            return doc;
        }

        // Table
        const tableData = anomalies.map(anom => [
            anom.type.replace('_', ' ').toUpperCase(),
            anom.description,
            anom.severity,
            anom.deviation ? `${anom.deviation.toFixed(0)}%` : '-'
        ]);

        // @ts-ignore
        autoTable(doc, {
            startY: 45,
            head: [['Tipo', 'Descripción', 'Severidad', 'Desviación']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [230, 126, 34], textColor: 255 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 90 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'right', cellWidth: 30 }
            }
        });

        return doc;
    }

    /**
     * Save PDF
     */
    savePDF(doc: jsPDF, filename: string): void {
        doc.save(filename);
    }

    /**
     * Get PDF as blob
     */
    getPDFBlob(doc: jsPDF): Blob {
        return doc.output('blob');
    }

    /**
     * Schedule report
     */
    scheduleReport(schedule: ReportSchedule): void {
        const schedules = this.getSchedules();
        const existingIndex = schedules.findIndex(s => s.id === schedule.id);

        if (existingIndex >= 0) {
            schedules[existingIndex] = schedule;
        } else {
            schedules.push(schedule);
        }

        localStorage.setItem(this.SCHEDULES_KEY, JSON.stringify(schedules));
    }

    /**
     * Get all schedules
     */
    getSchedules(): ReportSchedule[] {
        try {
            const data = localStorage.getItem(this.SCHEDULES_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Run scheduled reports
     */
    runScheduledReports(): number {
        const schedules = this.getSchedules().filter(s => s.enabled);
        const now = new Date();
        let generated = 0;

        schedules.forEach(schedule => {
            if (this.shouldRun(schedule, now)) {
                // Generate report
                let doc: jsPDF;

                switch (schedule.reportType) {
                    case 'executive':
                        const execReport = executiveReportGenerator.generateReport();
                        doc = this.generateExecutiveReportPDF(execReport);
                        this.savePDF(doc, `Ejecutivo_${execReport.period}.pdf`);
                        break;

                    case 'cashflow':
                        doc = this.generateCashFlowPDF();
                        this.savePDF(doc, `Flujo_Caja_${now.toISOString().substring(0, 10)}.pdf`);
                        break;

                    case 'anomalies':
                        doc = this.generateAnomaliesPDF();
                        this.savePDF(doc, `Anomalias_${now.toISOString().substring(0, 10)}.pdf`);
                        break;
                }

                // Update last run
                schedule.lastRun = now.toISOString();
                generated++;
            }
        });

        // Save updated schedules
        localStorage.setItem(this.SCHEDULES_KEY, JSON.stringify(schedules));

        return generated;
    }

    /**
     * Check if schedule should run
     */
    private shouldRun(schedule: ReportSchedule, now: Date): boolean {
        const [hours, minutes] = schedule.time.split(':').map(Number);

        // Check time (within 1 minute)
        if (now.getHours() !== hours || Math.abs(now.getMinutes() - minutes) > 1) {
            return false;
        }

        // Check frequency
        if (schedule.frequency === 'daily') {
            return true;
        } else if (schedule.frequency === 'weekly') {
            return now.getDay() === schedule.dayOfWeek;
        } else if (schedule.frequency === 'monthly') {
            return now.getDate() === schedule.dayOfMonth;
        }

        return false;
    }
}

export const automatedPDFReportGenerator = new AutomatedPDFReportGenerator();
