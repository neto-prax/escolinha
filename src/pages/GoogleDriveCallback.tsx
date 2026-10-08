import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { driveAction } from '@/lib/googleDrive';

export default function GoogleDriveCallback() {
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    window.history.replaceState({}, '', window.location.pathname);
    if (!code || !state) { setError('Conexão cancelada ou autorização inválida.'); return; }
    driveAction<{ return_url: string }>({ action: 'callback', code, state })
      .then(({ return_url }) => {
        const target = new URL(return_url);
        if (target.origin !== window.location.origin) throw new Error('Endereço de retorno inválido.');
        target.searchParams.set('drive', 'connected');
        window.location.replace(target.toString());
      }).catch((e: Error) => setError(e.message));
  }, []);
  return <main className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="max-w-md text-center space-y-4">
      <HardDrive className="mx-auto text-primary" size={32} />
      <h1 className="text-xl font-semibold">Google Drive da escola</h1>
      {error ? <><p className="text-destructive">{error}</p><Button asChild><Link to="/app/configuracoes?tab=pedagogico&sub=drive">Voltar às configurações</Link></Button></> : <><Loader2 className="mx-auto animate-spin text-primary" /><p className="text-muted-foreground">Conectando sua conta…</p></>}
    </div>
  </main>;
}