import React, { useState } from 'react';
import { Search, X, Loader2, Database } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  searching: boolean;
  resultCount?: number | null;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  searching,
  resultCount,
}) => {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setValue(q);
    onSearch(q);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Search by recipient, subject, or status (Elasticsearch)..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-16 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
        />

        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
          {value ? (
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-200 p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono hidden sm:inline-flex items-center gap-1"
              title="Powered by Elasticsearch Index"
            >
              <Database className="w-2.5 h-2.5" /> ES
            </span>
          )}
        </div>
      </div>

      {resultCount !== null && resultCount !== undefined && (
        <div className="absolute left-0 top-full mt-1 text-[11px] text-brand-400 font-medium">
          Found {resultCount} matching {resultCount === 1 ? 'result' : 'results'} in Elasticsearch
        </div>
      )}
    </div>
  );
};
