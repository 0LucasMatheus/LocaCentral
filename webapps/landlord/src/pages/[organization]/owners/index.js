import React, { useCallback, useContext, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { List } from '../../../components/ResourceList';
import { LuPlusCircle } from 'react-icons/lu';
import OwnerDialog from '../../../components/owners/OwnerDialog';
import OwnerList from '../../../components/owners/OwnerList';
import Page from '../../../components/Page';
import { StoreContext } from '../../../store';
import { apiFetcher } from '../../../utils/fetch';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { withAuthentication } from '../../../components/Authentication';

const OWNERS_QUERY_KEY = 'owners';

async function fetchOwners() {
  const response = await apiFetcher().get('/owners');
  return response.data;
}

function _filterData(data, filters) {
  let filteredItems = data || [];

  if (filters.searchText) {
    const regExp = /\s|\.|-/gi;
    const cleanedSearchText = filters.searchText
      .toLowerCase()
      .replace(regExp, '');

    filteredItems = filteredItems.filter(({ name, cpf, cnpj, email, phone }) => {
      let found =
        (name || '').replace(regExp, '').toLowerCase().indexOf(cleanedSearchText) !== -1;

      if (!found && cpf) {
        found = cpf.replace(regExp, '').indexOf(cleanedSearchText) !== -1;
      }
      if (!found && cnpj) {
        found = cnpj.replace(regExp, '').indexOf(cleanedSearchText) !== -1;
      }
      if (!found && email) {
        found = email.toLowerCase().indexOf(cleanedSearchText) !== -1;
      }
      if (!found && phone) {
        found = phone.replace(regExp, '').indexOf(cleanedSearchText) !== -1;
      }

      return found;
    });
  }

  return filteredItems;
}

function Owners() {
  const store = useContext(StoreContext);
  const { isError, data, isLoading, refetch } = useQuery({
    queryKey: [OWNERS_QUERY_KEY],
    queryFn: fetchOwners
  });

  const [openOwnerDialog, setOpenOwnerDialog] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

  const handleNewOwner = useCallback(() => {
    setSelectedOwner(null);
    setOpenOwnerDialog(true);
  }, []);

  const handleEditOwner = useCallback((owner) => {
    setSelectedOwner(owner);
    setOpenOwnerDialog(true);
  }, []);

  const handleDialogClose = useCallback(
    (value) => {
      setOpenOwnerDialog(value);
      if (!value) {
        refetch();
      }
    },
    [refetch]
  );

  if (isError) {
    toast.error('Erro ao carregar proprietários');
  }

  return (
    <Page loading={isLoading} dataCy="ownersPage">
      <List
        data={data || []}
        filters={[]}
        filterFn={_filterData}
        renderActions={() => (
          <Button
            variant="secondary"
            className="w-full gap-2"
            onClick={handleNewOwner}
          >
            <LuPlusCircle className="size-4" />
            Adicionar proprietário
          </Button>
        )}
        renderList={({ data }) => (
          <OwnerList owners={data || []} onEdit={handleEditOwner} />
        )}
      />
      <OwnerDialog
        open={openOwnerDialog}
        setOpen={handleDialogClose}
        owner={selectedOwner}
      />
    </Page>
  );
}

export default withAuthentication(Owners);
