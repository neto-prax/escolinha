import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";

interface SystemMessageProps {
  message: string;
  type?: 'info' | 'warning' | 'success' | 'closed';
  timestamp?: string;
}

const typeConfig = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-500',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    iconColor: 'text-yellow-500',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-700 dark:text-green-300',
    iconColor: 'text-green-500',
  },
  closed: {
    icon: XCircle,
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-500',
  },
};

export function SystemMessage({ message, type = 'info', timestamp }: SystemMessageProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex justify-center my-4">
      <div
        className={cn(
          "flex items-start gap-2 px-4 py-2 rounded-lg border max-w-[90%]",
          config.bgColor,
          config.borderColor
        )}
      >
        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm", config.textColor)}>{message}</p>
          {timestamp && (
            <p className={cn("text-xs mt-1 opacity-70", config.textColor)}>
              {formatTime(timestamp)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
