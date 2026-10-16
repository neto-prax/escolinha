import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground break-words">
            {error.message || 'Erro inesperado ao carregar esta tela.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => { window.location.href = '/login'; }}>
              Voltar para o login
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export class LocalErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackTitle?: string; onReset?: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LocalErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 rounded-xl border border-destructive/20 bg-destructive/5 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm">{this.props.fallbackTitle || 'Não foi possível carregar este módulo'}</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto break-words">
            {this.state.error.message || 'Erro inesperado ao renderizar.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReset?.();
              }}
            >
              Recarregar Módulo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
