import React, { useState } from 'react';
import { GLOSSARY, GlossaryTerm } from '../constants';
import { HelpCircle, DollarSign, Activity, Settings } from 'lucide-react';

interface GlossaryTooltipProps {
  termKey: string;
  children?: React.ReactNode;
}

export default function GlossaryTooltip({ termKey, children }: GlossaryTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const normalizedKey = termKey.toLowerCase().replace(/[\s_]/g, '');
  
  // Find matching term in glossary
  let termData: GlossaryTerm | undefined = GLOSSARY[normalizedKey];

  // Try partial mapping if not exact
  if (!termData) {
    const matchedKey = Object.keys(GLOSSARY).find(k => 
      k.includes(normalizedKey) || normalizedKey.includes(k)
    );
    if (matchedKey) {
      termData = GLOSSARY[matchedKey];
    }
  }

  if (!termData) {
    return <span className="font-semibold">{children || termKey}</span>;
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10';
      case 'metrics':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10';
      default: // agile
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial':
        return <DollarSign className="w-3" />;
      case 'metrics':
        return <Activity className="w-3" />;
      default:
        return <Settings className="w-3" />;
    }
  };

  return (
    <span 
      className="relative inline-flex items-center group cursor-help ml-1"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className="underline decoration-dotted decoration-blue-400 hover:decoration-blue-600 font-medium text-slate-800 transition-colors">
        {children || termData.term}
      </span>
      <HelpCircle className="w-3.5 h-3.5 ml-0.5 text-slate-400 group-hover:text-blue-500 transition-colors inline-block" />

      {/* Tooltip Popup */}
      {isVisible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 border border-slate-700 leading-relaxed">
          {/* Category Badge */}
          <span className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getCategoryColor(termData.category)}`}>
              {getCategoryIcon(termData.category)}
              {termData.category}
            </span>
            <span className="text-slate-400 text-[10px] font-mono">Glossary Term</span>
          </span>

          {/* Title and Translation */}
          <span className="block font-bold text-sm text-slate-100 mb-1">
            {termData.term} <span className="text-xs text-slate-300 font-normal">({termData.chineseName})</span>
          </span>

          {/* Definition */}
          <span className="block text-slate-200 mb-2">
            {termData.definition}
          </span>

          {/* Example / Formula */}
          {termData.example && (
            <span className="block p-1.5 bg-slate-800/80 rounded border border-slate-700 font-mono text-[10px] text-teal-300">
              {termData.example}
            </span>
          )}

          {/* Simple Arrow Indicator */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></span>
        </span>
      )}
    </span>
  );
}
