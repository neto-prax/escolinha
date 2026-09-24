import React from 'react';
import { cn } from '@/lib/utils';
import { useSystemBranding } from '@/hooks/useSystemBranding';

interface LogoProps {
  /** Tamanho do logo */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Se deve exibir o texto da marca ao lado do ícone */
  showText?: boolean;
  /** Subtítulo opcional exibido abaixo do nome (ex: nome da escola) */
  subtitle?: string;
  /** Se deve renderizar apenas o ícone sem texto */
  iconOnly?: boolean;
  /** Se o texto deve ser branco (para fundos escuros / roxos) */
  lightText?: boolean;
  /** Classe extra para o container */
  className?: string;
}

const sizeConfig = {
  sm: {
    iconBox: 'h-8 w-8',
    title: 'text-base',
    subtitle: 'text-[10px]',
    gap: 'gap-2',
  },
  md: {
    iconBox: 'h-10 w-10',
    title: 'text-lg',
    subtitle: 'text-xs',
    gap: 'gap-2.5',
  },
  lg: {
    iconBox: 'h-12 w-12',
    title: 'text-xl',
    subtitle: 'text-xs',
    gap: 'gap-3',
  },
  xl: {
    iconBox: 'h-16 w-16',
    title: 'text-2xl',
    subtitle: 'text-sm',
    gap: 'gap-3.5',
  },
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
  iconOnly = false,
  lightText = false,
  className,
}) => {
  const { branding } = useSystemBranding();
  const cfg = sizeConfig[size];
  const logoUrl = branding.logoUrl || '/logo-icon.png';
  const brandName = branding.brandName || 'Purple Edu';

  // Se o brandName tiver mais de uma palavra (ex: "Purple Edu"), destaca a 2ª com a cor primária
  const parts = brandName.split(' ');
  const firstWord = parts[0] || 'Purple';
  const secondWord = parts.slice(1).join(' ') || (parts.length === 1 ? '' : 'Edu');

  return (
    <div className={cn('flex items-center select-none', cfg.gap, className)}>
      {/* Ícone oficial ou customizado configurado no SuperAdmin */}
      <img
        src={logoUrl}
        alt={brandName}
        className={cn(
          cfg.iconBox,
          'object-contain shrink-0 rounded-xl shadow-xs transition-transform duration-200 hover:scale-105'
        )}
      />

      {/* Tipografia Oficial do Sistema */}
      {showText && !iconOnly && (
        <div className="flex flex-col min-w-0 leading-tight">
          <div className={cn('font-black tracking-tight flex items-center gap-1', cfg.title)}>
            <span className={cn(lightText ? 'text-white' : 'text-slate-900 dark:text-white')}>
              {firstWord}
            </span>
            {secondWord && (
              <span className="text-[#6b26d9] dark:text-[#a78bfa]">
                {secondWord}
              </span>
            )}
          </div>
          {subtitle && (
            <span
              className={cn(
                'truncate font-medium',
                cfg.subtitle,
                lightText ? 'text-white/80' : 'text-muted-foreground'
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
