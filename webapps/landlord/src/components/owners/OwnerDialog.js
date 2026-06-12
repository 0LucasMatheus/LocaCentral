import * as Yup from 'yup';
import { Form, Formik } from 'formik';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { Button } from '../ui/button';
import ResponsiveDialog from '../ResponsiveDialog';
import { SelectField } from '../formfields/SelectField';
import { StoreContext } from '../../store';
import { TextField } from '../formfields/TextField';
import { toast } from 'sonner';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Nome é obrigatório')
});

const emptyValues = {
  name: '',
  cpf: '',
  cnpj: '',
  rg: '',
  email: '',
  phone: '',
  address: {
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  },
  bankAccount: {
    bank: '',
    agency: '',
    account: '',
    accountType: '',
    pixKey: ''
  },
  receiptPreference: ''
};

const receiptPreferenceOptions = [
  { id: 'pix', value: 'pix', label: 'PIX' },
  { id: 'boleto', value: 'boleto', label: 'Boleto' },
  { id: 'transferencia', value: 'transferencia', label: 'Transferência' },
  { id: 'cheque', value: 'cheque', label: 'Cheque' }
];

const accountTypeOptions = [
  { id: 'corrente', value: 'corrente', label: 'Corrente' },
  { id: 'poupanca', value: 'poupanca', label: 'Poupança' }
];

async function fetchAddressByCep(cep) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export default function OwnerDialog({ open, setOpen, owner }) {
  const store = useContext(StoreContext);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef();
  const isEditing = !!owner?._id;

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleCepBlur = useCallback(async (e, setFieldValue) => {
    const cep = e.target.value;
    const data = await fetchAddressByCep(cep);
    if (data) {
      setFieldValue('address.street', data.logradouro || '');
      setFieldValue('address.neighborhood', data.bairro || '');
      setFieldValue('address.city', data.localidade || '');
      setFieldValue('address.state', data.uf || '');
    }
  }, []);

  const _onSubmit = useCallback(
    async (values) => {
      try {
        setIsLoading(true);

        const ownerData = {
          ...values,
          ...(isEditing ? { _id: owner._id } : {})
        };

        const { status } = isEditing
          ? await store.owner.update(ownerData)
          : await store.owner.create(ownerData);

        if (status !== 200) {
          switch (status) {
            case 422:
              return toast.error('Nome do proprietário é obrigatório');
            case 403:
              return toast.error('Você não tem permissão para esta ação');
            case 409:
              return toast.error('Proprietário já existe');
            default:
              return toast.error('Ocorreu um erro inesperado');
          }
        }

        toast.success(isEditing ? 'Proprietário atualizado' : 'Proprietário criado');
        handleClose();
      } finally {
        setIsLoading(false);
      }
    },
    [store.owner, isEditing, owner, handleClose]
  );

  const initialValues = isEditing
    ? {
        name: owner.name || '',
        cpf: owner.cpf || '',
        cnpj: owner.cnpj || '',
        rg: owner.rg || '',
        email: owner.email || '',
        phone: owner.phone || '',
        address: {
          zipCode: owner.address?.zipCode || '',
          street: owner.address?.street || '',
          number: owner.address?.number || '',
          complement: owner.address?.complement || '',
          neighborhood: owner.address?.neighborhood || '',
          city: owner.address?.city || '',
          state: owner.address?.state || ''
        },
        bankAccount: {
          bank: owner.bankAccount?.bank || '',
          agency: owner.bankAccount?.agency || '',
          account: owner.bankAccount?.account || '',
          accountType: owner.bankAccount?.accountType || '',
          pixKey: owner.bankAccount?.pixKey || ''
        },
        receiptPreference: owner.receiptPreference || ''
      }
    : emptyValues;

  return (
    <ResponsiveDialog
      open={!!open}
      setOpen={setOpen}
      isLoading={isLoading}
      renderHeader={() =>
        isEditing ? 'Editar proprietário' : 'Novo proprietário'
      }
      renderContent={() => (
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={_onSubmit}
          innerRef={formRef}
          enableReinitialize
        >
          {({ setFieldValue }) => (
            <Form autoComplete="off">
              <div className="pt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Dados pessoais
                </div>

                <TextField label="Nome *" name="name" />
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="CPF" name="cpf" placeholder="000.000.000-00" />
                  <TextField label="CNPJ" name="cnpj" placeholder="00.000.000/0000-00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="RG" name="rg" />
                  <TextField label="Telefone" name="phone" placeholder="(11) 00000-0000" />
                </div>
                <TextField label="E-mail" name="email" type="email" />

                <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">
                  Endereço
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <TextField
                    label="CEP"
                    name="address.zipCode"
                    placeholder="00000-000"
                    onBlur={(e) => handleCepBlur(e, setFieldValue)}
                  />
                  <div className="col-span-2">
                    <TextField label="Logradouro" name="address.street" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <TextField label="Número" name="address.number" />
                  <div className="col-span-2">
                    <TextField label="Complemento" name="address.complement" />
                  </div>
                </div>
                <TextField label="Bairro" name="address.neighborhood" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <TextField label="Cidade" name="address.city" />
                  </div>
                  <TextField label="UF" name="address.state" placeholder="SP" />
                </div>

                <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">
                  Dados bancários
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Banco" name="bankAccount.bank" />
                  <TextField label="Agência" name="bankAccount.agency" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Conta" name="bankAccount.account" />
                  <SelectField
                    label="Tipo de conta"
                    name="bankAccount.accountType"
                    values={accountTypeOptions}
                  />
                </div>
                <TextField label="Chave PIX" name="bankAccount.pixKey" />

                <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">
                  Preferência de recebimento
                </div>

                <SelectField
                  label="Forma de recebimento"
                  name="receiptPreference"
                  values={receiptPreferenceOptions}
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
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </>
      )}
    />
  );
}
