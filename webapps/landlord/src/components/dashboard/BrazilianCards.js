import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../ui/card';
import { useContext, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { DashboardCard } from './DashboardCard';
import {
  LuAlertCircle,
  LuArrowRightCircle,
  LuBanknote,
  LuCalendarClock,
  LuTrendingUp
} from 'react-icons/lu';
import { apiFetcher } from '../../utils/fetch';
import { StoreContext } from '../../store';
import { useRouter } from 'next/router';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);

export default function BrazilianCards({ className }) {
  const store = useContext(StoreContext);
  const router = useRouter();
  const [charges, setCharges] = useState(null);
  const [adjustmentsCount, setAdjustmentsCount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const [chargesRes, adjRes] = await Promise.allSettled([
          apiFetcher().get(`/charges?period=${period}`),
          apiFetcher().get('/adjustments/pending')
        ]);

        if (chargesRes.status === 'fulfilled') {
          setCharges(chargesRes.value.data || []);
        }
        if (adjRes.status === 'fulfilled') {
          setAdjustmentsCount(
            Array.isArray(adjRes.value.data) ? adjRes.value.data.length : 0
          );
        }
      } catch {
        // Silently fail — these are extra dashboard cards
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) return null;

  const totalRecebido = (charges || [])
    .filter((c) => c.status === 'pago')
    .reduce((acc, c) => acc + (c.paidAmount || c.totalAmount || 0), 0);

  const totalAReceber = (charges || [])
    .filter((c) => c.status === 'pendente' || c.status === 'emitido')
    .reduce((acc, c) => acc + (c.totalAmount || 0), 0);

  const totalVencido = (charges || [])
    .filter((c) => c.status === 'vencido')
    .reduce((acc, c) => acc + (c.totalAmount || 0), 0);

  const inadimplenteCount = (charges || []).filter(
    (c) => c.status === 'vencido'
  ).length;

  const orgName = store.organization.selected?.name;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard
          Icon={LuBanknote}
          title="Recebido no mês"
          description="Cobranças pagas no período atual"
          renderContent={() => (
            <span className="text-success">{formatCurrency(totalRecebido)}</span>
          )}
          onClick={() => router.push(`/${orgName}/charges`)}
        />

        <DashboardCard
          Icon={LuCalendarClock}
          title="A receber"
          description="Cobranças pendentes/emitidas"
          renderContent={() => formatCurrency(totalAReceber)}
          onClick={() => router.push(`/${orgName}/charges`)}
        />

        <DashboardCard
          Icon={LuAlertCircle}
          title="Inadimplência"
          description={`${inadimplenteCount} cobranças vencidas`}
          renderContent={() => (
            <span className="text-destructive">{formatCurrency(totalVencido)}</span>
          )}
          onClick={() => router.push(`/${orgName}/charges`)}
        />
      </div>

      {adjustmentsCount !== null && adjustmentsCount > 0 ? (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between font-normal text-xs xl:text-base">
                Reajustes pendentes
                <LuTrendingUp className="size-6 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between items-center text-3xl xl:text-4xl font-medium">
              <span className="text-warning">{adjustmentsCount}</span>
              <Button
                variant="link"
                className="p-0 m-0 h-fit"
                onClick={() => router.push(`/${orgName}/adjustments`)}
              >
                <LuArrowRightCircle className="size-8" />
              </Button>
            </CardContent>
            <CardFooter>
              <CardDescription className="text-xs">
                {adjustmentsCount === 1
                  ? '1 contrato aguarda reajuste'
                  : `${adjustmentsCount} contratos aguardam reajuste`}
              </CardDescription>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
