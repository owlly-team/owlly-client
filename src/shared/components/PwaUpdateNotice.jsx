import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from './Button';

export default function PwaUpdateNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;

  return (
    <aside
      role="status"
      className="bg-background-elevated shadow-large fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-102 flex-col gap-3 rounded-16 border border-line-normal p-4"
    >
      <p className="text-body2 text-label-normal">새 버전이 준비됐어요. 새로고침하면 반영돼요.</p>
      <div className="flex justify-end gap-2">
        <Button variant="text" size="sm" onClick={() => setNeedRefresh(false)}>나중에</Button>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>새로고침</Button>
      </div>
    </aside>
  );
}
