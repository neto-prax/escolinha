import { useEffect, useSyncExternalStore } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

type Job = { id: string; titulo: string; pct: number };
let jobs: Job[] = [];
const subs = new Set<() => void>();
const emit = () => { jobs = [...jobs]; subs.forEach((s) => s()); };

export function runInBackground(titulo: string, task: (setPct: (p: number) => void) => Promise<void>) {
  const job: Job = { id: crypto.randomUUID(), titulo, pct: 0 };
  jobs.push(job); emit();
  task((p) => { job.pct = p; emit(); }).finally(() => { jobs = jobs.filter((j) => j !== job); emit(); });
}

export function BackgroundUploadsWidget() {
  const list = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => jobs);
  useEffect(() => {
    if (!list.length) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [list.length]);
  if (!list.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border bg-card p-3 shadow-lg space-y-2">
      <p className="text-sm font-medium flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Enviando {list.length} registro(s) ao Drive</p>
      {list.map((j) => (
        <div key={j.id} className="space-y-1">
          <p className="text-xs text-muted-foreground truncate">{j.titulo} • {Math.round(j.pct)}%</p>
          <Progress value={j.pct} />
        </div>
      ))}
    </div>
  );
}
