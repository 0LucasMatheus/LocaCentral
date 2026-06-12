import * as Yup from 'yup';
import { Form, Formik } from 'formik';
import React, { useCallback, useRef, useState } from 'react';
import { Button } from '../ui/button';
import ResponsiveDialog from '../ResponsiveDialog';
import { SelectField } from '../formfields/SelectField';
import { TextField } from '../formfields/TextField';
import { apiFetcher } from '../../utils/fetch';
import { toast } from 'sonner';

const validationSchema = Yup.object().shape({
  paidAmount: Yup.number()
    .min(0, 'Valor deve ser positivo')
    .required('Valor é obrigatório'),
  paymentMethod: Yup.string().required('Forma de pagamento é obrigatória'),
  paidAt: Yup.string().required('Data de pagamento é obrigatória')
});

const paymentMethodOptions = [
  { id: 'boleto', value: 'boleto', label: 'Boleto' },
  { id: 'pix', value: 'pix', label: 'PIX' },
  { id: 'transferencia', value: 'transferencia', label: 'Transferência' },
  { id: 'dinheiro', value: 'dinheiro', label: 'Dinheiro' },
  { id: 'cheque', value: 'cheque', label: 'Cheque' }
];

function formatDateToInput(date) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function PaymentDialog({ open, setOpen, charge, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const _onSubmit = useCallback(
    async (values) => {
      try {
        setIsLoading(true);
        await apiFetcher().post(`/charges/${charge._id}/pay`, {
          paidAmount: parseFloat(values.paidAmount),
          paymentMethod: values.paymentMethod,
          paidAt: values.paidAt
        });
        toast.success('Pagamento registrado com sucesso');
        handleClose();
        onSuccess?.();
      } catch (error) {
        toast.error('Erro ao registrar pagamento');
      } finally {
        setIsLoading(false);
      }
    },
    [charge, handleClose, onSuccess]
  );

  const initialValues = {
    paidAmount: charge?.totalAmount || '',
    paymentMethod: '',
    paidAt: formatDateToInput()
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);

  return (
    <ResponsiveDialog
      open={!!open}
      setOpen={setOpen}
      isLoading={isLoading}
      renderHeader={() => 'Registrar pagamento'}
      renderContent={() => (
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={_onSubmit}
          innerRef={formRef}
          enableReinitialize
        >
          {() => (
            <Form autoComplete="off">
              <div className="pt-6 space-y-4">
                {charge ? (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Total da cobrança: </span>
                    {formatCurrency(charge.totalAmount)}
                  </div>
                ) : null}
                <TextField
                  label="Valor pago (R$)"
                  name="paidAmount"
                  type="number"
                  step="0.01"
                />
                <SelectField
                  label="Forma de pagamento"
                  name="paymentMethod"
                  values={paymentMethodOptions}
                />
                <TextField
                  label="Data do pagamento"
                  name="paidAt"
                  type="date"
                />
              </div>
            </Form>
          )}
        </Formik>
      )}
      renderFooter={() => (
        <>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={() => formRef.current.submitForm()}>
            Confirmar
          </Button>
        </>
      )}
    />
  );
}
