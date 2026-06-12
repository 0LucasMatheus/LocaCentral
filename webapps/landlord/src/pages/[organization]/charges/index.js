import React, { useCallback, useContext, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import ChargeList from '../../../components/charges/ChargeList';
import { LuRefreshCw, LuPlus } from 'react-icons/lu';
import Page from '../../../components/Page';
import { StoreContext } from '../../../store';
import { apiFetcher } from '../../../utils/fetch';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { withAuthentication } from '../../../components/Authentication';

const CHARGES_QUERY_KEY = 'charges';

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'emitido', label: 'Emitido' },
  { value: 'pago', label: 'Pago' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'cancelado', label: 'Cancelado' }
];

function getPeriodOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

function Charges() {
  const store = useContext(StoreContext);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [period, setPeriod] = useState(currentPeriod);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isGenerating, setIsGenerating] = useState(false);

  const { isError, data, isLoading, refetch } = useQuery({
    queryKey: [CHARGES_QUERY_KEY, period, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (statusFilter !== 'todos') {
        params.append('status', statusFilter);
      }
      const response = await apiFetcher().get(`/charges?${params.toString()}`);
      return response.data;
    }
  });

  const handleGenerateCharges = useCallback(async () => {
    try {
      setIsGenerating(true);
      await apiFetcher().post('/charges/generate', { period });
      toast.success(`Cobranças do período ${period} geradas com sucesso`);
      refetch();
    } catch (error) {
      const msg =
        error?.response?.data?.message || 'Erro ao gerar cobranças';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [period, refetch]);

  if (isError) {
    toast.error('Erro ao carregar cobranças');
  }

  const periodOptions = getPeriodOptions();

  const totalPago = (data || [])
    .filter((c) => c.status === 'pago')
    .reduce((acc, c) => acc + (c.paidAmount || c.totalAmount || 0), 0);

  const totalPendente = (data || [])
    .filter((c) => c.status === 'pendente' || c.status === 'emitido')
    .reduce((acc, c) => acc + (c.totalAmount || 0), 0);

  const totalVencido = (data || [])
    .filter((c) => c.status === 'vencido')
    .reduce((acc, c) => acc + (c.totalAmount || 0), 0);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

  return (
    <Page loading={isLoading} dataCy="chargesPage">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <h1 className="text-2xl font-semibold">Cobranças</h1>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={handleGenerateCharges}
            disabled={isGenerating}
          >
            <LuPlus className="size-4" />
            {isGenerating ? 'Gerando...' : 'Gerar cobranças do mês'}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border p-3 bg-card">
            <div className="text-muted-foreground text-xs mb-1">Recebido</div>
            <div className="font-semibold text-success">
              {formatCurrency(totalPago)}
            </div>
          </div>
          <div className="rounded-lg border p-3 bg-card">
            <div className="text-muted-foreground text-xs mb-1">A receber</div>
            <div className="font-semibold">{formatCurrency(totalPendente)}</div>
          </div>
          <div className="rounded-lg border p-3 bg-card">
            <div className="text-muted-foreground text-xs mb-1">Vencido</div>
            <div className="font-semibold text-destructive">
              {formatCurrency(totalVencido)}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        <ChargeList charges={data || []} onRefresh={refetch} />
      </div>
    </Page>
  );
}

export default withAuthentication(Charges);
