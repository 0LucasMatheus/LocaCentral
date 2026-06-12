import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../ui/card';
import { useCallback, useState } from 'react';
import { Button } from '../ui/button';
import ChargeStatusBadge from './ChargeStatusBadge';
import { EmptyIllustration } from '../Illustrations';
import { LuBanknote } from 'react-icons/lu';
import PaymentDialog from './PaymentDialog';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

export default function ChargeList({ charges, onRefresh }) {
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);

  const handlePayment = useCallback((charge) => {
    setSelectedCharge(charge);
    setOpenPaymentDialog(true);
  }, []);

  const handlePaymentClose = useCallback(
    (value) => {
      setOpenPaymentDialog(value);
      if (!value) {
        onRefresh?.();
      }
    },
    [onRefresh]
  );

  if (!charges || charges.length === 0) {
    return <EmptyIllustration label="Nenhuma cobrança encontrada" />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {charges.map((charge) => (
          <Card key={charge._id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <LuBanknote className="size-5 text-muted-foreground" />
                  <span>
                    {charge.occupantName || 'Inquilino não encontrado'}
                  </span>
                </div>
                <ChargeStatusBadge status={charge.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Imóvel</div>
                  <div>{charge.propertyName || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Vencimento</div>
                  <div>{formatDate(charge.dueDate)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Total</div>
                  <div className="font-semibold">
                    {formatCurrency(charge.totalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Pago em</div>
                  <div>{charge.paidAt ? formatDate(charge.paidAt) : '-'}</div>
                </div>
              </div>

              {charge.items && charge.items.length > 0 ? (
                <div className="mt-3 border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Itens da cobrança
                  </div>
                  <div className="space-y-1">
                    {charge.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm"
                      >
                        <span>{item.description || item.type}</span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {charge.status !== 'pago' && charge.status !== 'cancelado' ? (
                <div className="flex justify-end mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePayment(charge)}
                  >
                    Registrar pagamento
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <PaymentDialog
        open={openPaymentDialog}
        setOpen={handlePaymentClose}
        charge={selectedCharge}
        onSuccess={onRefresh}
      />
    </>
  );
}
