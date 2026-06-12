import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../ui/card';
import { useCallback, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EmptyIllustration } from '../Illustrations';
import { LuArrowRight, LuTrendingUp } from 'react-icons/lu';
import { apiFetcher } from '../../utils/fetch';
import { toast } from 'sonner';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);

const formatPercent = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format((value || 0) / 100);

const INDEX_LABELS = {
  IGPM: 'IGP-M',
  IPCA: 'IPCA',
  INCC: 'INCC',
  IVAR: 'IVAR',
  'IGP-DI': 'IGP-DI'
};

export default function AdjustmentList({ adjustments, onRefresh }) {
  const [applyingId, setApplyingId] = useState(null);

  const handleApply = useCallback(
    async (adjustment) => {
      try {
        setApplyingId(adjustment._id);
        await apiFetcher().post(`/adjustments/${adjustment._id}/apply`);
        toast.success('Reajuste aplicado com sucesso');
        onRefresh?.();
      } catch (error) {
        toast.error('Erro ao aplicar reajuste');
      } finally {
        setApplyingId(null);
      }
    },
    [onRefresh]
  );

  if (!adjustments || adjustments.length === 0) {
    return (
      <EmptyIllustration label="Nenhum reajuste pendente" />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {adjustments.map((adj) => (
        <Card key={adj._id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <LuTrendingUp className="size-5 text-muted-foreground" />
                <span>{adj.tenantName || 'Contrato sem nome'}</span>
              </div>
              <Badge variant="warning" className="font-normal">
                Pendente
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-muted-foreground text-xs">Índice</div>
                <div className="font-medium">
                  {INDEX_LABELS[adj.index] || adj.index}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  Percentual
                </div>
                <div className="font-medium text-success">
                  {formatPercent(adj.rate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  Aluguel atual
                </div>
                <div className="font-medium">
                  {formatCurrency(adj.previousRent)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  Novo aluguel
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-success">
                    {formatCurrency(adj.newRent)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <span>{formatCurrency(adj.previousRent)}</span>
              <LuArrowRight className="size-4" />
              <span className="text-success font-medium">
                {formatCurrency(adj.newRent)}
              </span>
              <span className="text-xs ml-2">
                (+{formatCurrency((adj.newRent || 0) - (adj.previousRent || 0))}/mês)
              </span>
            </div>

            {adj.period ? (
              <div className="text-xs text-muted-foreground mb-3">
                Período de referência: {adj.period}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleApply(adj)}
                disabled={applyingId === adj._id}
              >
                {applyingId === adj._id ? 'Aplicando...' : 'Aplicar reajuste'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
