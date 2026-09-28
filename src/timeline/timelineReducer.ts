export type DetailPhase = 'idle' | 'opening' | 'detail' | 'closing';
export interface DetailState {
  phase: DetailPhase;
  eventId: string | null;
  token: number;
}
export type DetailAction =
  | { type: 'open'; eventId: string }
  | { type: 'close' }
  | { type: 'opened' | 'closed'; token: number };
export const initialDetail: DetailState = { phase: 'idle', eventId: null, token: 0 };
export function detailReducer(state: DetailState, action: DetailAction): DetailState {
  if (action.type === 'open' && state.phase === 'idle')
    return { phase: 'opening', eventId: action.eventId, token: state.token + 1 };
  if (action.type === 'close' && (state.phase === 'opening' || state.phase === 'detail'))
    return { ...state, phase: 'closing', token: state.token + 1 };
  if (action.type === 'opened' && state.phase === 'opening' && state.token === action.token)
    return { ...state, phase: 'detail' };
  if (action.type === 'closed' && state.phase === 'closing' && state.token === action.token)
    return { phase: 'idle', eventId: null, token: state.token };
  return state;
}
