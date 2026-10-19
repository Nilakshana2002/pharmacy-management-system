import React from 'react';
import { ShoppingBag, X, Trash2, ArrowRight, CheckCircle2, Phone, ShieldCheck, Printer } from 'lucide-react';
import AvailabilityBadge from './AvailabilityBadge';
import { useTheme } from '../context/ThemeContext';

export default function InquiryCartModal({ isOpen, onClose, cartItems, onRemoveItem, onClearCart, onSelectMedicine }) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const totalEstimate = cartItems.reduce((acc, item) => {
    return acc + (Number(item.unit_price) || 0) * (item.quantity || 1);
  }, 0);


  const handlePrintInquiry = () => {
    const w = 550;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const printWindow = window.open(
      '',
      '_blank',
      `width=${w},height=${h},top=${top},left=${left},scrollbars=no,status=no,toolbar=no,menubar=no`
    );

    if (!printWindow) {
      window.print();
      return;
    }

    const itemsHtml = cartItems.map((item, idx) => `
      <tr>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">
          ${idx + 1}. ${item.name}
          <div style="font-size: 11px; color: #64748b; font-weight: 400;">${item.generic_name || ''}</div>
        </td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          ${item.dosage_form || 'Formulation'} (${item.strength || 'Standard'})
        </td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${item.availability_status === 'In Stock' ? '#dcfce7; color: #15803d;' : item.availability_status === 'Low Stock' ? '#fef3c7; color: #b45309;' : '#fee2e2; color: #b91c1c;'}">
            ${item.availability_status || 'In Stock'}
          </span>
        </td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-family: monospace;">
          ${item.is_public_price && item.unit_price ? 'Rs. ' + Number(item.unit_price).toFixed(2) : 'Inquire In-Store'}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Prescription Counter Inquiry Slip - My Pharmacist</title>
          <style>
            @page { size: A5 portrait; margin: 8mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a; background: #ffffff; padding: 20px; font-size: 13px; line-height: 1.5;
            }
            .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 18px; font-weight: 900; color: #0f766e; letter-spacing: 0.5px; }
            .sub { font-size: 11px; color: #475569; margin-top: 2px; }
            .badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th { text-align: left; padding: 6px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; }
            .total-box { margin-top: 16px; padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
            .notice { margin-top: 16px; padding: 10px; border-radius: 6px; border-left: 3px solid #0f766e; background: #f0fdfa; font-size: 11px; color: #134e4a; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
            .btn-bar { margin-top: 16px; text-align: center; }
            .btn-print { background: #0f766e; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; }
            @media print {
              .btn-bar { display: none !important; }
              body { padding: 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">MY PHARMACIST DISPENSARY</div>
            <div class="sub">124 Galle Road, Bambalapitiya • Hotline: +94 11 234 5678</div>
            <div class="sub">Date: ${new Date().toLocaleString()}</div>
            <div class="badge">In-Store Counter Inquiry Slip</div>
          </div>

          <p style="font-size: 11px; color: #475569;">
            The customer has saved the following <strong>${cartItems.length}</strong> items from our digital formulary for in-person counter availability confirmation and dispensing:
          </p>

          <table>
            <thead>
              <tr>
                <th>Medication & Generic</th>
                <th>Dosage / Form</th>
                <th style="text-align: center;">Counter Status</th>
                <th style="text-align: right;">Indicative Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <span style="font-weight: 700; color: #334155;">Estimated Counter Total:</span>
            <span style="font-size: 16px; font-weight: 900; color: #0f766e; font-family: monospace;">Rs. ${totalEstimate.toFixed(2)}</span>
          </div>

          <div class="notice">
            <strong>Prescription Requirement Notice:</strong> For Schedule 3 and antibiotic formulations, please present a valid prescription from a registered medical practitioner at the pharmacy counter.
          </div>

          <div class="footer">
            My Pharmacist Management System • Physical Dispensing Inquiry Only • Does Not Deduct Inventory Until Dispensed
          </div>

          <div class="btn-bar">
            <button class="btn-print" onclick="window.print()">Print Inquiry Slip</button>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`relative w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold">Dispensary Inquiry List</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {cartItems.length} {cartItems.length === 1 ? 'medication' : 'medications'} selected for counter verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {cartItems.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <h4 className="text-sm font-bold">Your inquiry list is empty</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Browse our pharmaceutical catalog and save medications here to verify counter stock before your visit.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.medicine_id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 uppercase">
                        {item.category_name}
                      </span>
                      <AvailabilityBadge status={item.availability_status} size="sm" />
                    </div>
                    <button
                      onClick={() => {
                        onSelectMedicine(item);
                        onClose();
                      }}
                      className="text-sm font-bold hover:text-teal-600 transition-colors truncate block text-left"
                    >
                      {item.name}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.brand_name} • {item.strength} • {item.dosage_form}
                    </p>
                    {item.is_public_price && item.unit_price && (
                      <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-1">
                        Rs. {Number(item.unit_price).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.medicine_id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Remove from list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {cartItems.length > 0 && (
          <div className={`p-6 border-t space-y-4 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/60'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Estimated Counter Total:</span>
              <span className="text-base font-extrabold text-teal-700 dark:text-teal-400">
                Rs. {totalEstimate.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs flex items-center gap-2.5 text-teal-800 dark:text-teal-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600" />
              <span>Please bring a valid doctor's prescription for prescription-only items.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClearCart}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handlePrintInquiry}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Inquiry Slip for Counter</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
