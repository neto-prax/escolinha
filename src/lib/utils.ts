import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata qualquer data (Date, ISO string, YYYY-MM-DD, timestamp) no padrão brasileiro DD/MM/YYYY
 */
export function formatDate(date: string | Date | number | null | undefined): string {
  if (!date && date !== 0) return '-';

  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '-';

    // Se já estiver no formato DD/MM/YYYY ou D/M/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/');
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y.slice(0, 4)}`;
    }

    // Se for formato YYYY-MM-DD ou com hora YYYY-MM-DDTHH:mm:ss
    const datePart = trimmed.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  try {
    const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return typeof date === 'string' ? date : '-';
    
    // Extrai dia, mês e ano locais garantindo dd/mm/yyyy
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return typeof date === 'string' ? date : '-';
  }
}

export const formatDateBR = formatDate;
