"use client";

import { Suspense, lazy, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomAgentsProvider } from './lib/custom-agents-context';
import CustomAgentBuilderErrorBoundary from './ErrorBoundary';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const NewPage = lazy(() => import('./pages/NewPage'));
const DetailPage = lazy(() => import('./pages/DetailPage'));
const SystemDetailPage = lazy(() => import('./pages/SystemDetailPage'));
const AdoptPage = lazy(() => import('./pages/AdoptPage'));

/**
 * CustomAgentBuilder
 *
 * Isolated agent-builder experience. Uses `?view=` search param for sub-page
 * navigation within the agent builder (landing | new | detail | system-detail | adopt).
 *
 * When `initialView` is passed (e.g. "new"), it skips the landing page and
 * renders that view directly — useful when embedded inside a modal.
 */
export type AgentCreatedPayload = {
  name: string;
  description: string;
  status: string;
};

export default function CustomAgentBuilder({
  initialView,
  onClose,
  onAgentCreated,
}: {
  initialView?: string;
  onClose?: () => void;
  onAgentCreated?: (payload: AgentCreatedPayload) => void;
}) {
  const searchParams = useSearchParams();
  const view = initialView || searchParams.get('view') || '';

  const page = useMemo(() => {
    switch (view) {
      case 'new':
        return <NewPage onClose={onClose} onAgentCreated={onAgentCreated} />;
      case 'detail':
        return <DetailPage />;
      case 'system-detail':
        return <SystemDetailPage />;
      case 'adopt':
        return <AdoptPage />;
      default:
        return <LandingPage />;
    }
  }, [view, onClose, onAgentCreated]);

  return (
    <CustomAgentBuilderErrorBoundary>
      <CustomAgentsProvider>
        <div className="flex flex-col h-full bg-white">
          <div className="flex-1 px-4 md:px-6 py-4 md:py-6 w-full max-w-7xl mx-auto">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                  Loading agent builder…
                </div>
              }
            >
              {page}
            </Suspense>
          </div>
        </div>
      </CustomAgentsProvider>
    </CustomAgentBuilderErrorBoundary>
  );
}
