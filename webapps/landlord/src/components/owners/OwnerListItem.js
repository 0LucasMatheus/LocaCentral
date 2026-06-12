import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '../ui/card';
import { useCallback, useContext } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { LuBuilding2, LuMail, LuPhone } from 'react-icons/lu';
import { StoreContext } from '../../store';
import { useRouter } from 'next/router';

export default function OwnerListItem({ owner, onEdit }) {
  const store = useContext(StoreContext);
  const router = useRouter();

  const handleClick = useCallback(() => {
    store.owner.setSelected(owner);
    onEdit?.(owner);
  }, [store.owner, owner, onEdit]);

  const documentLabel = owner.cnpj
    ? `CNPJ: ${owner.cnpj}`
    : owner.cpf
    ? `CPF: ${owner.cpf}`
    : null;

  return (
    <Card className="relative">
      <CardHeader className="mb-2 cursor-pointer" onClick={handleClick}>
        <CardTitle className="flex justify-start items-center gap-2">
          <LuBuilding2 className="size-5 text-muted-foreground shrink-0" />
          <div>
            <Button
              variant="link"
              className="w-fit h-fit p-0 text-xl whitespace-normal text-left"
              data-cy="openOwnerButton"
            >
              {owner.name}
            </Button>
            {documentLabel ? (
              <div className="text-xs font-normal text-muted-foreground">
                {documentLabel}
              </div>
            ) : null}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="text-sm text-muted-foreground pb-0">
        <div className="flex flex-col gap-1">
          {owner.email ? (
            <div className="flex items-center gap-1">
              <LuMail className="size-3.5 shrink-0" />
              <span>{owner.email}</span>
            </div>
          ) : null}
          {owner.phone ? (
            <div className="flex items-center gap-1">
              <LuPhone className="size-3.5 shrink-0" />
              <span>{owner.phone}</span>
            </div>
          ) : null}
          {owner.address?.city ? (
            <div className="text-xs mt-1">
              {[owner.address.city, owner.address.state]
                .filter(Boolean)
                .join(' - ')}
            </div>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="p-0 flex-col">
        <div className="flex items-center justify-end w-full py-4 px-6">
          <Badge variant="outline" className="font-normal">
            {owner.receiptPreference === 'pix'
              ? 'PIX'
              : owner.receiptPreference === 'boleto'
              ? 'Boleto'
              : owner.receiptPreference === 'transferencia'
              ? 'Transferência'
              : owner.receiptPreference === 'cheque'
              ? 'Cheque'
              : 'Não definido'}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}
