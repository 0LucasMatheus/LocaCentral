import { Badge } from '../ui/badge';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', variant: 'warning' },
  emitido: { label: 'Emitido', variant: 'secondary' },
  pago: { label: 'Pago', variant: 'success' },
  vencido: { label: 'Vencido', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'outline' }
};

export default function ChargeStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'outline' };

  return (
    <Badge variant={config.variant} className="font-normal">
      {config.label}
    </Badge>
  );
}
