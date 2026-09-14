import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTabId?: string;
}

export function Tabs({ tabs, defaultTabId }: TabsProps) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);

  if (!tabs || tabs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        Nenhuma seção disponível com suas permissões atuais.
      </div>
    );
  }

  const effectiveActiveTabId = tabs.some((tab) => tab.id === activeTabId)
    ? activeTabId
    : tabs[0]?.id;

  return (
    <div className="w-full">
      <div className="flex border-b border-gray-200 print:hidden overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`py-2 px-6 font-medium text-sm transition-colors duration-200 focus:outline-none whitespace-nowrap ${
              effectiveActiveTabId === tab.id
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4 mt-4 bg-white rounded-lg shadow-sm border border-gray-100 print:p-0 print:mt-0 print:border-0 print:shadow-none">
        {tabs.find((tab) => tab.id === effectiveActiveTabId)?.content}
      </div>
    </div>
  );
}
