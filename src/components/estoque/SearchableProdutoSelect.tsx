import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Package } from 'lucide-react';
import { ProdutoEstoque } from '@/types/estoque';

interface SearchableProdutoSelectProps {
  produtos: ProdutoEstoque[];
  value: string;
  onChange: (produtoId: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableProdutoSelect: React.FC<SearchableProdutoSelectProps> = ({
  produtos,
  value,
  onChange,
  placeholder = 'Buscar ou digitar produto...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProd = produtos.find((p) => p.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = produtos.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    return (
      p.nome.toLowerCase().includes(term) ||
      (p.codigo && p.codigo.toLowerCase().includes(term)) ||
      (p.categoria && p.categoria.toLowerCase().includes(term))
    );
  });

  const handleSelect = (prodId: string) => {
    onChange(prodId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : selectedProd?.nome || ''}
          placeholder={placeholder}
          onFocus={() => {
            setSearch('');
            setIsOpen(true);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            setIsOpen(true);

            // Se o texto digitado corresponder exatamente a um produto, já seleciona de forma automática!
            const exact = produtos.find(
              (p) => p.nome.toLowerCase().trim() === val.toLowerCase().trim()
            );
            if (exact) {
              onChange(exact.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered.length > 0) {
                handleSelect(filtered[0].id);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="w-full p-1.5 pr-7 border border-gray-300 rounded bg-white font-medium text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!isOpen) {
              setSearch('');
              inputRef.current?.focus();
            }
            setIsOpen(!isOpen);
          }}
          className="absolute right-1 text-gray-400 hover:text-gray-600 p-0.5"
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full min-w-[240px] bg-white border border-indigo-200 rounded-md shadow-xl max-h-52 overflow-y-auto divide-y divide-gray-100 text-xs">
          {filtered.length === 0 ? (
            <div className="p-3 text-gray-400 text-center italic text-xs">
              Nenhum produto correspondente a "{search}"
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = p.id === value;
              const estTotal =
                p.temVariacoes && p.variacoes
                  ? p.variacoes.reduce((acc, v) => acc + v.quantidadeEstoque, 0)
                  : p.quantidadeEstoque || 0;

              return (
                <div
                  key={p.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(p.id);
                  }}
                  className={`p-2 cursor-pointer hover:bg-indigo-50/80 transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-indigo-50 font-bold text-indigo-800' : 'text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Package size={13} className={isSelected ? 'text-indigo-600' : 'text-gray-400'} />
                    <div className="truncate">
                      <span>{p.nome}</span>
                      {p.codigo && (
                        <span className="text-[10px] text-gray-400 font-mono ml-1">
                          ({p.codigo})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-gray-400">
                      {p.temVariacoes && p.variacoes
                        ? `${p.variacoes.length} tam.`
                        : `${estTotal} un`}
                    </span>
                    {isSelected && <Check size={13} className="text-indigo-600" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

