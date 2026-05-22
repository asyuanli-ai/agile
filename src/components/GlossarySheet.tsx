import React, { useState } from 'react';
import { GLOSSARY, GlossaryTerm } from '../constants';
import { Search, BookOpen, Settings, BarChart, DollarSign, ArrowRight } from 'lucide-react';

export default function GlossarySheet() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'agile' | 'financial' | 'metrics'>('all');

  const terms = Object.values(GLOSSARY);

  // Filtering terms
  const filteredTerms = terms.filter(t => {
    const matchesSearch = 
      t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.chineseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCatBadgeClass = (category: string) => {
    switch (category) {
      case 'financial':
        return 'bg-emerald-100 text-emerald-800';
      case 'metrics':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <BookOpen className="w-5 h-5 text-indigo-600" />
        <div>
          <h2 className="text-base font-bold text-slate-800 font-sans">專案名詞百科大全 (PM Glossary)</h2>
          <p className="text-xs text-slate-400">所有專有名詞均支援滑鼠懸停 (HoverTooltip) 查閱解釋</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="搜尋專案名詞（例如：NPV、Sprint...）"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
        />
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scroller-hidden">
        {(['all', 'agile', 'financial', 'metrics'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition select-none ${
              selectedCategory === cat 
                ? 'bg-indigo-600 text-white shadow shadow-indigo-500/10' 
                : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {cat === 'all' ? '全部' : cat === 'agile' ? '敏捷開發' : cat === 'financial' ? '財務指標' : '估算度量'}
          </button>
        ))}
      </div>

      {/* Terms List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[420px] lg:max-h-none">
        {filteredTerms.length > 0 ? (
          filteredTerms.map(t => (
            <div 
              key={t.term}
              className="group p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm bg-slate-50/50 hover:bg-white transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-bold text-slate-800 text-xs">
                  {t.term} <span className="font-normal text-slate-400 text-[11px]">({t.chineseName})</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${getCatBadgeClass(t.category)}`}>
                  {t.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                {t.definition}
              </p>
              {t.example && (
                <div className="text-[10px] bg-slate-100 text-indigo-700 p-1.5 rounded-lg font-mono flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{t.example}</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-slate-400">找不到相符的術語術語...</p>
          </div>
        )}
      </div>
    </div>
  );
}
