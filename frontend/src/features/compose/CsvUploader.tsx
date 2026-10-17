import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, Trash2, FileText } from 'lucide-react';

interface CsvUploaderProps {
  onEmailsExtracted: (emails: string[]) => void;
  extractedEmails: string[];
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  onEmailsExtracted,
  extractedEmails,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    validCount: number;
    duplicateCount: number;
    invalidCount: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileContent = (text: string, name: string) => {
    const lines = text.split(/\r?\n/);
    const seen = new Set<string>();
    const valid: string[] = [];
    let invalid = 0;
    let duplicate = 0;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (['email', 'emails', 'recipient', 'recipients', 'email address'].includes(lower)) {
        continue;
      }

      const tokens = line.split(/[,;\t]/).map((t) => t.trim().replace(/^["']|["']$/g, ''));
      const candidate = tokens.find((t) => t.includes('@')) || tokens[0];

      if (EMAIL_REGEX.test(candidate)) {
        const normalized = candidate.toLowerCase();
        if (seen.has(normalized)) {
          duplicate++;
        } else {
          seen.add(normalized);
          valid.push(normalized);
        }
      } else {
        invalid++;
      }
    }

    setFileName(name);
    setStats({
      validCount: valid.length,
      duplicateCount: duplicate,
      invalidCount: invalid,
    });
    onEmailsExtracted(valid);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processFileContent(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processFileContent(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const clearUpload = () => {
    setFileName(null);
    setStats(null);
    onEmailsExtracted([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full space-y-3">
      <label className="block text-xs font-medium text-slate-300">
        Lead Recipients (CSV or TXT)
      </label>

      {!fileName ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <UploadCloud className="w-8 h-8 text-brand-400 mb-2 stroke-1" />
          <p className="text-xs font-medium text-slate-200">
            Click to upload or drag & drop CSV file
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Accepts CSV or TXT with email column (1000+ leads supported)
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-semibold text-slate-200">{fileName}</span>
            </div>
            <button
              onClick={clearUpload}
              className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {stats.validCount}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-medium">Valid Leads</div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                <div className="text-amber-400 font-bold text-sm">
                  {stats.duplicateCount}
                </div>
                <div className="text-[10px] text-amber-400/80 font-medium">Duplicates Removed</div>
              </div>

              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                <div className="text-rose-400 font-bold text-sm flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {stats.invalidCount}
                </div>
                <div className="text-[10px] text-rose-400/80 font-medium">Invalid Filtered</div>
              </div>
            </div>
          )}

          {/* Email pills preview */}
          {extractedEmails.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Previewing leads:</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {extractedEmails.slice(0, 10).map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                  >
                    {email}
                  </span>
                ))}
                {extractedEmails.length > 10 && (
                  <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800 font-medium">
                    +{extractedEmails.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
