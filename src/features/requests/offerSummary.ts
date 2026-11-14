import { formatMoney } from '../../shared/format';
import { useApiQuery } from '../../shared/hooks/useApiQuery';
import { listRequestProposals } from '../proposals/api';

/** How many offers a request received and the cheapest one, from the API. */
export function useOfferSummary(requestId: number) {
  const offers = useApiQuery(['request-offer-count', requestId], (signal) =>
    listRequestProposals(requestId, { signal }),
  );
  const list = offers.data;
  const lowest = list?.length
    ? Math.min(...list.map((p) => p.diagnosticCost))
    : undefined;
  return { count: list?.length, lowest };
}

export function offerSummaryLabel(count: number, lowest: number | undefined) {
  const n = count === 1 ? '1 oferta' : `${count} ofertas`;
  return lowest !== undefined ? `${n} · Desde ${formatMoney(lowest)}` : n;
}
