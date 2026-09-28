import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
  alwaysShow?: boolean;
}

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  itemsPerPage: itemsPerPageProp,
  pageSize: pageSizeProp,
  onPageChange,
  onItemsPerPageChange,
  onPageSizeChange,
  pageSizeOptions = [30, 50, 100],
  itemName = 'itens',
  className = '',
  alwaysShow = false,
}) => {
  const effectiveItemsPerPage = pageSizeProp ?? itemsPerPageProp ?? 30;
  const handlePageSizeChange = onPageSizeChange || onItemsPerPageChange;

  // Se houver 30 itens ou menos e não for forçado, não exibe paginação
  if (!alwaysShow && totalItems <= effectiveItemsPerPage) {
    return null;
  }

  // Gera array com números de páginas inteligente (com reticências se houver muitas páginas)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 border-t bg-muted/10 text-xs text-muted-foreground ${className}`}
    >
      {/* Resumo do intervalo exibido */}
      <div className="flex items-center gap-2">
        <span>
          Mostrando <strong className="text-foreground">{startIndex}</strong> a{' '}
          <strong className="text-foreground">{endIndex}</strong> de{' '}
          <strong className="text-foreground">{totalItems}</strong> {itemName}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Seletor opcional de itens por página */}
        {handlePageSizeChange && totalItems > 30 && (
          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline text-[11px]">Por página:</span>
            <Select
              value={String(effectiveItemsPerPage)}
              onValueChange={(val) => handlePageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-7 w-16 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Botões de navegação */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 text-xs bg-background"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="Primeira página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 text-xs bg-background"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Páginas numeradas no desktop */}
          <div className="hidden sm:flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-muted-foreground select-none"
                  >
                    …
                  </span>
                );
              }
              const isCurrent = p === currentPage;
              return (
                <Button
                  key={p}
                  type="button"
                  variant={isCurrent ? 'default' : 'outline'}
                  size="sm"
                  className={`h-7 w-7 p-0 text-xs font-medium ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground pointer-events-none'
                      : 'bg-background hover:bg-muted'
                  }`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
          </div>

          {/* Exibição resumida em telas móveis */}
          <span className="sm:hidden px-2 font-medium text-foreground">
            {currentPage} / {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 text-xs bg-background"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 text-xs bg-background"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Última página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
