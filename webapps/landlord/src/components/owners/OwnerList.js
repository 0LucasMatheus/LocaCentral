import { EmptyIllustration } from '../Illustrations';
import OwnerListItem from './OwnerListItem';

export default function OwnerList({ owners, onEdit }) {
  return owners.length > 0 ? (
    <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {owners.map((owner) => (
        <OwnerListItem key={owner._id} owner={owner} onEdit={onEdit} />
      ))}
    </div>
  ) : (
    <EmptyIllustration label="Nenhum proprietário encontrado" />
  );
}
