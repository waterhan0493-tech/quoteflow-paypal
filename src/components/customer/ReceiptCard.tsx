import { Award, Printer, ExternalLink } from "lucide-react";
import type { DepositPayment } from "@/lib/deposit";

export interface ReceiptData {
  quoteId: string;
  customerName: string;
  dateSlot: string;
  timeSlot: string;
  scopeSummary: string;
  totalPrice: number;
  signatureDataUrl?: string;
  deposit?: DepositPayment;
}

interface ReceiptCardProps {
  receipt: ReceiptData;
  businessName: string;
  accentHex: string;
  darkMode: boolean;
  onPrint: () => void;
  onCloseAndOpenCrm: () => void;
}

export function ReceiptCard({
  receipt,
  businessName,
  accentHex,
  darkMode,
  onPrint,
  onCloseAndOpenCrm,
}: ReceiptCardProps) {
  return (
    <div className="space-y-4 relative pt-1">
      {/* Celebratory Rubber Stamp Badge */}
      <div className="flex justify-end">
        <div className="animate-stamp-slam inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-mono-num font-extrabold text-xs uppercase tracking-widest bg-emerald-50/95 dark:bg-emerald-950/90 shadow-sm">
          <Award className="w-3.5 h-3.5" />
          <span>PRICE LOCKED ✓</span>
        </div>
      </div>

      <div style={{ backgroundColor: darkMode ? "#1E222B" : "#F7F9FC", borderColor: darkMode ? "#334155" : "#E3E8EF", color: darkMode ? "#F1F5F9" : "#001435" }} className="receipt-paper-edge p-4 sm:p-5 rounded-xl border space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 block">
              ✓ Guaranteed Booking Confirmed
            </span>
            <h4 className="text-base sm:text-lg font-black leading-snug">
              {businessName}
            </h4>
          </div>
          <span style={{ backgroundColor: darkMode ? "#0F1115" : "#FFFFFF", borderColor: darkMode ? "#334155" : "#E3E8EF", color: darkMode ? "#F1F5F9" : "#001435" }} className="text-xs font-mono-num font-bold px-2.5 py-1 rounded-lg border shrink-0">
            #{receipt.quoteId}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Customer</span>
            <span className="font-semibold">
              {receipt.customerName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Scheduled Slot</span>
            <span className="font-semibold font-mono-num">
              {receipt.dateSlot} • {receipt.timeSlot}
            </span>
          </div>
          <div className="sm:col-span-2 pt-0.5">
            <span className="text-slate-400 block text-[11px]">Locked Scope Summary</span>
            <span className="font-semibold leading-snug block mt-0.5">
              {receipt.scopeSummary}
            </span>
          </div>
        </div>

        {receipt.signatureDataUrl && (
          <div className="pt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Authorized E-Signature
            </span>
            <img
              src={receipt.signatureDataUrl}
              alt="Customer signature"
              className="h-9 object-contain bg-white rounded px-2 border border-[#E3E8EF]"
            />
          </div>
        )}

        <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-3 flex items-center justify-between">
          <span className="text-xs font-bold">Total Locked Price</span>
          <span
            className="text-2xl font-mono-num font-extrabold"
            style={{ color: accentHex }}
          >
            ${receipt.totalPrice.toFixed(2)}
          </span>
        </div>

        {receipt.deposit && (
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span className="font-semibold">
                Deposit paid{receipt.deposit.provider === "paypal" ? " with PayPal" : " (demo)"}
              </span>
              <span className="font-mono-num font-bold">
                −${receipt.deposit.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Balance due on service day</span>
              <span className="font-mono-num font-bold">
                ${(receipt.totalPrice - receipt.deposit.amount).toFixed(2)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono-num">
              {receipt.deposit.provider === "paypal" ? "PayPal order " : "Ref "}
              {receipt.deposit.orderId}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <button
          type="button"
          onClick={onPrint}
          className="py-2.5 px-3 rounded-xl border border-[#E3E8EF] dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Receipt</span>
        </button>
        <button
          type="button"
          onClick={onCloseAndOpenCrm}
          className="py-2.5 px-3 rounded-full text-xs font-bold text-white flex items-center justify-center gap-1.5"
          style={{ backgroundColor: accentHex }}
        >
          <span>Open Lead CRM</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
