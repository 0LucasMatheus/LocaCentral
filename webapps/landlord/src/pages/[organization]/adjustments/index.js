import React, { useContext } from 'react';
import AdjustmentList from '../../../components/adjustments/AdjustmentList';
import { LuRefreshCw } from 'react-icons/lu';
import { Button } from '../../../components/ui/button';
import Page from '../../../components/Page';
import { StoreContext } from '../../../store';
import { apiFetcher } from '../../../utils/fetch';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { withAuthentication } from '../../../components/Authentication';

const ADJUSTMENTS_QUERY_KEY = 'adjustments-pending';

async function fetchPendingAdjustments() {
  const response = await apiFetcher().get('/adjustments/pending');
  return response.data;
}

function Adjustments() {
  const store = useContext(StoreContext);

  const { isError, data, isLoading, refetch } = useQuery({
    queryKey: [ADJUSTMENTS_QUERY_KEY],
    queryFn: fetchPendingAdjustments
  });

  if (isError) {
    toast.error('Erro ao carregar reajustes pendentes');
  }

  const count = Array.isArray(data) ? data.length : 0;

  return (
    <Page loading={isLoading} dataCy="adjustmentsPage">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reajustes pendentes</h1>
            {!isLoading && (
              <p className="text-sm text-muted-foreground mt-1">
                {count === 0
                  ? 'Nenhum reajuste pendente'
                  : count === 1
                  ? '1 reajuste aguardando aplicação'
                  : `${count} reajustes aguardando aplicação`}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Atualizar"
          >
            <LuRefreshCw className="size-4" />
          </Button>
        </div>

        <AdjustmentList
          adjustments={data || []}
          onRefresh={refetch}
        />
      </div>
    </Page>
  );
}

export default withAuthentication(Adjustments);
