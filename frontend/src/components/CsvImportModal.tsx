import React, { useState, useRef, useMemo } from 'react';
import { importTransactionsBatch } from '../services/api';
import type { Transaction, TransactionCreate, TransactionType } from '../types';
import { clsx } from 'clsx';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Filter,
  Check,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTransactions: Transaction[];
  onSuccess?: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'success';

interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  valid: boolean;
  error?: string;
  isDuplicate: boolean;
  data?: TransactionCreate;
}

// Robust CSV parser respecting quotes
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].replace(/^["']|["']$/g, '').trim() : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseDateToISO(dStr: string): string | null {
  if (!dStr) return null;
  const s = dStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : s;
  }

  // MM/DD/YYYY or DD/MM/YYYY
  const parts = s.split(/[/\-.]/);
  if (parts.length === 3) {
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    const m = parseInt(parts[0], 10);
    const d = parseInt(parts[1], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const date = new Date(Date.UTC(y, m - 1, d));
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
  }

  const parsed = new Date(s);
  return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : null;
}

function parseAmountAndType(
  rawAmount: string,
  rawType?: string,
  typeFallbackMode = 'auto'
): { amount: number; type: TransactionType } | null {
  if (!rawAmount) return null;

  let clean = rawAmount.replace(/[$£€PKR,\s]/gi, '');
  let isNegative = false;

  if (clean.startsWith('(') && clean.endsWith(')')) {
    isNegative = true;
    clean = clean.slice(1, -1);
  } else if (clean.startsWith('-')) {
    isNegative = true;
    clean = clean.slice(1);
  }

  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return null;

  let resolvedType: TransactionType = 'expense';

  if (rawType) {
    const t = rawType.toLowerCase().trim();
    if (['income', 'credit', 'cr', 'inflow', 'deposit'].includes(t)) {
      resolvedType = 'income';
    } else if (['expense', 'debit', 'dr', 'outflow', 'withdrawal'].includes(t)) {
      resolvedType = 'expense';
    } else {
      resolvedType = isNegative ? 'expense' : 'income';
    }
  } else {
    if (typeFallbackMode === 'all_expense') {
      resolvedType = 'expense';
    } else if (typeFallbackMode === 'all_income') {
      resolvedType = 'income';
    } else {
      resolvedType = isNegative ? 'expense' : 'income';
    }
  }

  return { amount: num, type: resolvedType };
}

export default function CsvImportModal({
  isOpen,
  onClose,
  existingTransactions,
  onSuccess,
}: CsvImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);

  // Column mapping
  const [dateCol, setDateCol] = useState('');
  const [descCol, setDescCol] = useState('');
  const [amountCol, setAmountCol] = useState('');
  const [typeCol, setTypeCol] = useState('');
  const [categoryCol, setCategoryCol] = useState('');
  const [typeFallbackMode, setTypeFallbackMode] = useState('auto');
  const [defaultCategory, setDefaultCategory] = useState('Operating');

  // Preview & submission
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'duplicates' | 'invalid'>('all');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { headers, rows } = parseCSV(content);

      if (headers.length === 0 || rows.length === 0) {
        setImportError('The uploaded CSV file is empty or could not be parsed.');
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);
      setImportError(null);

      // Auto-detect columns
      const lower = headers.map((h) => h.toLowerCase());

      const dIdx = lower.findIndex((h) => h.includes('date') || h.includes('time'));
      if (dIdx !== -1) setDateCol(headers[dIdx]);

      const descIdx = lower.findIndex(
        (h) =>
          h.includes('desc') ||
          h.includes('memo') ||
          h.includes('detail') ||
          h.includes('payee') ||
          h.includes('narrative') ||
          h.includes('name')
      );
      if (descIdx !== -1) setDescCol(headers[descIdx]);

      const amtIdx = lower.findIndex(
        (h) =>
          h.includes('amount') ||
          h.includes('total') ||
          h.includes('value') ||
          h.includes('net') ||
          h.includes('sum')
      );
      if (amtIdx !== -1) setAmountCol(headers[amtIdx]);

      const typeIdx = lower.findIndex(
        (h) =>
          h.includes('type') ||
          h.includes('direction') ||
          h.includes('dr/cr') ||
          h.includes('credit/debit')
      );
      if (typeIdx !== -1) setTypeCol(headers[typeIdx]);

      const catIdx = lower.findIndex(
        (h) => h.includes('category') || h.includes('tag') || h.includes('class')
      );
      if (catIdx !== -1) setCategoryCol(headers[catIdx]);

      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const existingTxnKeys = useMemo(() => {
    const set = new Set<string>();
    existingTransactions.forEach((t) => {
      set.add(`${t.date}|${t.description.trim().toLowerCase()}|${t.type}|${t.amount.toFixed(2)}`);
    });
    return set;
  }, [existingTransactions]);

  const parsedRows: ParsedRow[] = useMemo(() => {
    if (step !== 'preview') return [];

    const seenInBatch = new Set<string>();

    return csvRows.map((row, idx) => {
      const rawDate = dateCol ? row[dateCol] : '';
      const rawDesc = descCol ? row[descCol] : '';
      const rawAmt = amountCol ? row[amountCol] : '';
      const rawType = typeCol ? row[typeCol] : undefined;
      const rawCat = categoryCol ? row[categoryCol] : '';

      const isoDate = parseDateToISO(rawDate);
      if (!isoDate) {
        return {
          index: idx + 1,
          raw: row,
          valid: false,
          error: `Invalid date format: "${rawDate || 'empty'}"`,
          isDuplicate: false,
        };
      }

      if (!rawDesc || !rawDesc.trim()) {
        return {
          index: idx + 1,
          raw: row,
          valid: false,
          error: 'Missing transaction description',
          isDuplicate: false,
        };
      }

      const parsedAmtType = parseAmountAndType(rawAmt, rawType, typeFallbackMode);
      if (!parsedAmtType) {
        return {
          index: idx + 1,
          raw: row,
          valid: false,
          error: `Invalid amount: "${rawAmt || 'empty'}"`,
          isDuplicate: false,
        };
      }

      const finalCat = rawCat.trim() || defaultCategory || 'Operating';
      const sig = `${isoDate}|${rawDesc.trim().toLowerCase()}|${parsedAmtType.type}|${parsedAmtType.amount.toFixed(2)}`;

      const isDup = existingTxnKeys.has(sig) || seenInBatch.has(sig);
      seenInBatch.add(sig);

      const txnData: TransactionCreate = {
        date: isoDate,
        description: rawDesc.trim(),
        category: finalCat,
        type: parsedAmtType.type,
        amount: parsedAmtType.amount,
        status: 'completed',
        notes: `Imported via CSV: ${fileName}`,
      };

      return {
        index: idx + 1,
        raw: row,
        valid: true,
        isDuplicate: isDup,
        data: txnData,
      };
    });
  }, [
    step,
    csvRows,
    dateCol,
    descCol,
    amountCol,
    typeCol,
    categoryCol,
    typeFallbackMode,
    defaultCategory,
    existingTxnKeys,
    fileName,
  ]);

  const stats = useMemo(() => {
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    parsedRows.forEach((r) => {
      if (!r.valid) invalidCount++;
      else {
        if (r.isDuplicate) duplicateCount++;
        validCount++;
      }
    });

    const readyToImport = skipDuplicates ? validCount - duplicateCount : validCount;

    return {
      total: parsedRows.length,
      valid: validCount,
      duplicates: duplicateCount,
      invalid: invalidCount,
      readyToImport,
    };
  }, [parsedRows, skipDuplicates]);

  const filteredRows = useMemo(() => {
    if (previewFilter === 'duplicates') return parsedRows.filter((r) => r.isDuplicate);
    if (previewFilter === 'invalid') return parsedRows.filter((r) => !r.valid);
    return parsedRows;
  }, [parsedRows, previewFilter]);

  if (!isOpen) return null;

  const handleProceedToPreview = () => {
    if (!dateCol || !descCol || !amountCol) {
      setImportError('Please map Date, Description, and Amount columns to proceed.');
      return;
    }
    setImportError(null);
    setStep('preview');
  };

  const handleConfirmImport = async () => {
    if (importing) return;
    setImportError(null);
    setImporting(true);

    try {
      const candidates = parsedRows
        .filter((r) => r.valid && r.data && (!skipDuplicates || !r.isDuplicate))
        .map((r) => r.data!);

      if (candidates.length === 0) {
        setImportError('No valid transactions to import.');
        setImporting(false);
        return;
      }

      const res = await importTransactionsBatch({
        transactions: candidates,
        skip_duplicates: skipDuplicates,
      });

      setImportResult({
        imported: res.imported_count,
        skipped: res.skipped_count,
      });
      setStep('success');
      onSuccess?.();
    } catch (e: any) {
      setImportError(e.response?.data?.detail || e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleResetModal = () => {
    setStep('upload');
    setFileName('');
    setCsvHeaders([]);
    setCsvRows([]);
    setDateCol('');
    setDescCol('');
    setAmountCol('');
    setTypeCol('');
    setCategoryCol('');
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-card rounded-2xl shadow-2xl border border-surface-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50/50 dark:bg-surface-200/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-xl text-brand-600 dark:text-brand-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900 dark:text-surface-100">
                Import Transactions (CSV)
              </h2>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {step === 'upload' && 'Step 1 of 3: Select or drop your bank or accounting CSV file'}
                {step === 'mapping' && 'Step 2 of 3: Map CSV columns to Accora fields'}
                {step === 'preview' && 'Step 3 of 3: Review data, check duplicates, and confirm import'}
                {step === 'success' && 'Import Completed'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {importError && (
          <div className="mx-6 mt-4 p-3 bg-risk-light border border-risk/30 rounded-xl text-risk text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-500 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-brand-500/5 group"
              >
                <div className="p-4 bg-surface-100 dark:bg-surface-200 group-hover:bg-brand-500/15 rounded-full text-surface-500 dark:text-surface-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mb-3">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-100 mb-1">
                  Click to choose a CSV file or drag and drop
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 max-w-sm mb-4">
                  Compatible with bank statements, Quickbooks, Stripe, Xero, and general accounting exports.
                </p>
                <span className="inline-flex items-center px-3 py-1 bg-surface-100 dark:bg-surface-200 text-surface-700 dark:text-surface-300 text-xs font-medium rounded-full">
                  Supports .csv and .txt
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="bg-surface-100/60 dark:bg-surface-200/30 rounded-xl p-4 border border-surface-200/60 dark:border-surface-300/40 space-y-2 text-xs text-surface-600 dark:text-surface-300">
                <p className="font-semibold text-surface-800 dark:text-surface-100">CSV Import Guidelines:</p>
                <ul className="list-disc list-inside space-y-1 text-surface-500 dark:text-surface-400">
                  <li>Your file must have a header row with columns like Date, Description, and Amount.</li>
                  <li>Dates in formats such as YYYY-MM-DD or MM/DD/YYYY are supported.</li>
                  <li>Accora automatically detects and prevents duplicate transactions.</li>
                  <li>All imported records are saved to your current workspace with exact decimal values.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-xs text-brand-700 dark:text-brand-300">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>
                    File: <strong>{fileName}</strong> ({csvRows.length} rows detected)
                  </span>
                </div>
                <button
                  onClick={handleResetModal}
                  className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Change File
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className="p-4 border border-surface-200 dark:border-surface-300 rounded-xl space-y-2">
                  <label className="text-xs font-semibold text-surface-800 dark:text-surface-100 block">
                    Transaction Date <span className="text-risk">*</span>
                  </label>
                  <p className="text-[11px] text-surface-400">Column containing the transaction or payment date</p>
                  <select
                    value={dateCol}
                    onChange={(e) => setDateCol(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-200 dark:border-surface-300 rounded-lg text-sm bg-surface-card text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {csvRows[0]?.[h] ? `(e.g. "${csvRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="p-4 border border-surface-200 dark:border-surface-300 rounded-xl space-y-2">
                  <label className="text-xs font-semibold text-surface-800 dark:text-surface-100 block">
                    Description / Payee <span className="text-risk">*</span>
                  </label>
                  <p className="text-[11px] text-surface-400">Column containing merchant, customer, or narrative</p>
                  <select
                    value={descCol}
                    onChange={(e) => setDescCol(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-200 dark:border-surface-300 rounded-lg text-sm bg-surface-card text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {csvRows[0]?.[h] ? `(e.g. "${csvRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="p-4 border border-surface-200 dark:border-surface-300 rounded-xl space-y-2">
                  <label className="text-xs font-semibold text-surface-800 dark:text-surface-100 block">
                    Amount <span className="text-risk">*</span>
                  </label>
                  <p className="text-[11px] text-surface-400">Column containing the transaction monetary value</p>
                  <select
                    value={amountCol}
                    onChange={(e) => setAmountCol(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-200 dark:border-surface-300 rounded-lg text-sm bg-surface-card text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {csvRows[0]?.[h] ? `(e.g. "${csvRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div className="p-4 border border-surface-200 dark:border-surface-300 rounded-xl space-y-2">
                  <label className="text-xs font-semibold text-surface-800 dark:text-surface-100 block">
                    Type (Income / Expense) <span className="text-surface-400 font-normal">(Optional)</span>
                  </label>
                  <p className="text-[11px] text-surface-400">Column designating credit/debit or income/expense</p>
                  <select
                    value={typeCol}
                    onChange={(e) => setTypeCol(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-200 dark:border-surface-300 rounded-lg text-sm bg-surface-card text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
                  >
                    <option value="">Auto-detect from amount sign</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h} {csvRows[0]?.[h] ? `(e.g. "${csvRows[0][h]}")` : ''}
                      </option>
                    ))}
                  </select>

                  {!typeCol && (
                    <div className="pt-1">
                      <label className="text-[11px] text-surface-500 dark:text-surface-400 block mb-1">
                        If no type column is selected:
                      </label>
                      <select
                        value={typeFallbackMode}
                        onChange={(e) => setTypeFallbackMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-surface-200 dark:border-surface-300 rounded-lg text-xs bg-surface-card text-surface-700 dark:text-surface-300"
                      >
                        <option value="auto">Auto (Positive=Income, Negative=Expense)</option>
                        <option value="all_expense">Treat all imported rows as Expenses</option>
                        <option value="all_income">Treat all imported rows as Income</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Category */}
                <div className="p-4 border border-surface-200 dark:border-surface-300 rounded-xl space-y-2 md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-surface-800 dark:text-surface-100 block">
                        Category Column <span className="text-surface-400 font-normal">(Optional)</span>
                      </label>
                      <p className="text-[11px] text-surface-400 mb-1.5">Column with category or classification</p>
                      <select
                        value={categoryCol}
                        onChange={(e) => setCategoryCol(e.target.value)}
                        className="w-full px-3 py-2 border border-surface-200 dark:border-surface-300 rounded-lg text-sm bg-surface-card text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-medium"
                      >
                        <option value="">Use default category</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h} {csvRows[0]?.[h] ? `(e.g. "${csvRows[0][h]}")` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-surface-800 dark:text-surface-100 block">
                        Default Category
                      </label>
                      <p className="text-[11px] text-surface-400 mb-1.5">Fallback category if column is empty</p>
                      <input
                        value={defaultCategory}
                        onChange={(e) => setDefaultCategory(e.target.value)}
                        placeholder="Operating"
                        className="w-full px-3 py-2 border border-surface-200 dark:border-surface-300 rounded-lg text-sm bg-surface-card text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Duplicate Detection */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface-100 dark:bg-surface-200 border border-surface-200 dark:border-surface-300 rounded-xl text-center">
                  <span className="text-[11px] text-surface-500 dark:text-surface-400 block">Total Detected</span>
                  <span className="text-base font-bold text-surface-900 dark:text-surface-100">{stats.total}</span>
                </div>
                <div className="p-3 bg-positive-light border border-positive/30 rounded-xl text-center">
                  <span className="text-[11px] text-positive block">Valid Rows</span>
                  <span className="text-base font-bold text-positive">{stats.valid}</span>
                </div>
                <div className="p-3 bg-warning-light border border-warning/30 rounded-xl text-center">
                  <span className="text-[11px] text-warning block">Duplicates Found</span>
                  <span className="text-base font-bold text-warning">{stats.duplicates}</span>
                </div>
                <div className="p-3 bg-risk-light border border-risk/30 rounded-xl text-center">
                  <span className="text-[11px] text-risk block">Invalid Rows</span>
                  <span className="text-base font-bold text-risk">{stats.invalid}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-50 dark:bg-surface-200/40 border border-surface-200 dark:border-surface-300 rounded-xl text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-800 dark:text-surface-200">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    Skip duplicate transactions ({stats.duplicates} duplicate rows will be omitted)
                  </span>
                </label>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <Filter className="w-3.5 h-3.5 text-surface-400" />
                  <span className="text-surface-500 dark:text-surface-400 text-[11px]">Show:</span>
                  {(['all', 'duplicates', 'invalid'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPreviewFilter(mode)}
                      className={clsx(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                        previewFilter === mode
                          ? 'bg-brand-600 text-white'
                          : 'bg-surface-200 dark:bg-surface-300 text-surface-700 dark:text-surface-200 hover:bg-surface-300'
                      )}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-surface-200 dark:border-surface-300 rounded-xl overflow-hidden max-h-72 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-100 dark:bg-surface-200 text-surface-600 dark:text-surface-300 font-semibold sticky top-0 border-b border-surface-200 dark:border-surface-300">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/60 dark:divide-surface-300/40">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-surface-400">
                          No transactions matching filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => (
                        <tr
                          key={r.index}
                          className={clsx(
                            'hover:bg-surface-50 dark:hover:bg-surface-200/30 transition-colors',
                            !r.valid ? 'bg-risk-light/30' : r.isDuplicate ? 'bg-warning-light/30' : ''
                          )}
                        >
                          <td className="py-2 px-3 text-center text-surface-400 font-mono text-[11px]">
                            {r.index}
                          </td>
                          <td className="py-2 px-3 font-mono">{r.data?.date || '-'}</td>
                          <td
                            className="py-2 px-3 font-medium text-surface-900 dark:text-surface-100 max-w-xs truncate"
                            title={r.data?.description}
                          >
                            {r.data?.description || r.raw[descCol] || '-'}
                          </td>
                          <td className="py-2 px-3 text-surface-600 dark:text-surface-300">
                            {r.data?.category || '-'}
                          </td>
                          <td className="py-2 px-3">
                            {r.data?.type ? (
                              <span
                                className={clsx(
                                  'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                  r.data.type === 'income'
                                    ? 'bg-positive-light text-positive'
                                    : 'bg-risk-light text-risk'
                                )}
                              >
                                {r.data.type.toUpperCase()}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-surface-900 dark:text-surface-100">
                            {r.data?.amount !== undefined
                              ? r.data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {!r.valid ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-risk bg-risk-light px-2 py-0.5 rounded-full"
                                title={r.error}
                              >
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                            ) : r.isDuplicate ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-warning bg-warning-light px-2 py-0.5 rounded-full"
                                title="Duplicate detected with existing records"
                              >
                                <AlertTriangle className="w-3 h-3" /> Duplicate
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-positive bg-positive-light px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && importResult && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-positive-light text-positive flex items-center justify-center animate-in zoom-in">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                  Import Successful!
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-sm">
                  Your transactions have been saved to your workspace and live balances and charts have been updated.
                </p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-surface-100 dark:bg-surface-200 border border-surface-200 dark:border-surface-300 rounded-xl text-xs">
                <div>
                  <span className="text-surface-500 dark:text-surface-400 block">Imported:</span>
                  <span className="text-sm font-bold text-positive">{importResult.imported} transactions</span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="border-l border-surface-300 dark:border-surface-400 pl-4">
                    <span className="text-surface-500 dark:text-surface-400 block">Skipped duplicates:</span>
                    <span className="text-sm font-bold text-warning">{importResult.skipped} transactions</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 dark:border-surface-300 bg-surface-50/50 dark:bg-surface-200/20">
          {step === 'upload' && (
            <>
              <span className="text-xs text-surface-400">No data modified yet.</span>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-surface-200 dark:border-surface-300 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {step === 'mapping' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>
              <button
                onClick={handleProceedToPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Review & Match <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('mapping')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Change Mapping
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 border border-surface-200 dark:border-surface-300 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-200 text-xs font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing || stats.readyToImport === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {importing ? (
                    'Importing Transactions...'
                  ) : (
                    <>
                      Confirm Import ({stats.readyToImport} Transactions)
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
