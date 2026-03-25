'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import type { RiskItem, OpportunityItem } from '@/shared/types';
import { calculateRiskStats, calculateOpportunityStats, calculateNetPosition } from '../scoring';
import { formatGbp } from '@/shared/utils/scenarios';

interface PdfExportProps {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
}

export function PdfExportSection({ risks, opportunities }: PdfExportProps) {
  const riskStats = calculateRiskStats(risks);
  const oppStats = calculateOpportunityStats(opportunities);
  const netPosition = calculateNetPosition(3200000, risks, opportunities);
  const netValue = netPosition.find(p => p.type === 'net')?.value ?? 0;

  function handleExport() {
    // Generate printable HTML content for PDF export
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RoseStack Energy — Risk & Opportunities Register</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a1a; padding: 40px; max-width: 1100px; margin: 0 auto; }
          h1 { color: #B91C4D; font-size: 24px; border-bottom: 2px solid #B91C4D; padding-bottom: 8px; }
          h2 { color: #333; font-size: 18px; margin-top: 32px; }
          h3 { color: #555; font-size: 14px; margin-top: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; }
          th { background: #f0f0f0; text-align: left; padding: 8px; border: 1px solid #ddd; font-weight: 600; }
          td { padding: 8px; border: 1px solid #ddd; }
          .stats { display: flex; gap: 24px; margin: 16px 0; }
          .stat { background: #f8f8f8; padding: 12px 20px; border-radius: 6px; }
          .stat-label { font-size: 11px; color: #666; }
          .stat-value { font-size: 20px; font-weight: 700; }
          .positive { color: #10B981; }
          .negative { color: #EF4444; }
          .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>RoseStack Energy — Risk & Opportunities Register</h1>
        <p style="color: #666; font-size: 12px;">Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <h2>Executive Summary</h2>
        <div class="stats">
          <div class="stat"><div class="stat-label">Total Risks</div><div class="stat-value">${riskStats.total}</div></div>
          <div class="stat"><div class="stat-label">Critical/High</div><div class="stat-value negative">${riskStats.critical + riskStats.high}</div></div>
          <div class="stat"><div class="stat-label">Total Opportunities</div><div class="stat-value">${oppStats.total}</div></div>
          <div class="stat"><div class="stat-label">High/Transformative</div><div class="stat-value positive">${oppStats.transformative + oppStats.high}</div></div>
          <div class="stat"><div class="stat-label">Net Position</div><div class="stat-value ${netValue >= 0 ? 'positive' : 'negative'}">${formatGbp(netValue)}</div></div>
        </div>

        <h2>Risk Register</h2>
        <table>
          <tr><th>ID</th><th>Risk</th><th>Category</th><th>P</th><th>I</th><th>Score</th><th>Rating</th><th>Owner</th><th>Mitigation Status</th></tr>
          ${risks.sort((a, b) => b.score - a.score).map(r => `
            <tr>
              <td>${r.id}</td>
              <td>${r.name}</td>
              <td>${r.category}</td>
              <td>${r.probability}</td>
              <td>${r.impact}</td>
              <td><strong>${r.score}</strong></td>
              <td>${r.rating.toUpperCase()}</td>
              <td>${r.mitigationOwner}</td>
              <td>${r.mitigationStatus.replace(/-/g, ' ')}</td>
            </tr>
          `).join('')}
        </table>

        <h2>Opportunity Register</h2>
        <table>
          <tr><th>ID</th><th>Opportunity</th><th>Category</th><th>P</th><th>I</th><th>Score</th><th>Rating</th><th>Owner</th><th>Expected Value</th><th>Status</th></tr>
          ${opportunities.sort((a, b) => b.score - a.score).map(o => `
            <tr>
              <td>${o.id}</td>
              <td>${o.name}</td>
              <td>${o.category}</td>
              <td>${o.probability}</td>
              <td>${o.impact}</td>
              <td><strong>${o.score}</strong></td>
              <td>${o.rating.toUpperCase()}</td>
              <td>${o.captureOwner}</td>
              <td>${o.expectedValue ? formatGbp(o.expectedValue) + '/yr' : '-'}</td>
              <td>${o.captureStatus.replace(/-/g, ' ')}</td>
            </tr>
          `).join('')}
        </table>

        <h2>Net Position Waterfall</h2>
        <table>
          <tr><th>Component</th><th>Amount</th></tr>
          ${netPosition.map(p => `
            <tr>
              <td>${p.label}</td>
              <td class="${p.value >= 0 ? 'positive' : 'negative'}"><strong>${formatGbp(p.value)}</strong></td>
            </tr>
          `).join('')}
        </table>

        <div class="footer">
          <p>RoseStack Energy Platform — Confidential. Prepared for lender and investor review.</p>
          <p>This document contains forward-looking estimates based on current market data and assumptions. Actual results may differ.</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Lender Pack Export</CardTitle>
            <p className="text-xs text-text-tertiary mt-1">
              One-click PDF export of full R&O register, heat maps, and net position waterfall
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-rose text-white text-sm font-medium rounded-[var(--radius-md)] hover:bg-rose-dark transition-colors"
          >
            Export PDF
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Risks</p>
            <p className="text-lg font-bold text-text-primary">{riskStats.total}</p>
            <p className="text-[10px] text-danger">{riskStats.critical + riskStats.high} high/critical</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Opportunities</p>
            <p className="text-lg font-bold text-text-primary">{oppStats.total}</p>
            <p className="text-[10px] text-success">{oppStats.transformative + oppStats.high} high/transformative</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Expected Upside</p>
            <p className="text-lg font-bold text-success">{formatGbp(oppStats.totalExpectedValue)}</p>
            <p className="text-[10px] text-text-tertiary">total expected value</p>
          </div>
          <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3 text-center">
            <p className="text-xs text-text-tertiary">Net Position</p>
            <p className={`text-lg font-bold ${netValue >= 0 ? 'text-success' : 'text-danger'}`}>{formatGbp(netValue)}</p>
            <p className="text-[10px] text-text-tertiary">{netValue >= 0 ? 'net positive' : 'net negative'}</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-text-tertiary">
          Export includes: Executive Summary, Full Risk Register, Full Opportunity Register, Net Position Waterfall, Scoring Methodology
        </div>
      </CardContent>
    </Card>
  );
}
