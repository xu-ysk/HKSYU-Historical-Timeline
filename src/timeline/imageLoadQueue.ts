// A school host can serve only a few large scans at once. Keep detail requests
// ahead of background overview photographs without downloading local copies.
const pending: ImageRequest[] = [];
let active = 0;
const concurrency = 4;

export interface ImageRequest {
  start: () => void;
  priority: number;
  state: 'pending' | 'active' | 'done';
}

function pump() {
  pending.sort((a, b) => b.priority - a.priority);
  while (active < concurrency && pending.length) {
    const request = pending.shift()!;
    request.state = 'active';
    active++;
    request.start();
  }
}

export function queueImage(start: () => void): ImageRequest {
  const request: ImageRequest = { start, priority: 0, state: 'pending' };
  pending.push(request);
  pump();
  return request;
}

export function prioritizeImage(request: ImageRequest) {
  request.priority = 1;
  pump();
}

export function releaseImage(request: ImageRequest) {
  if (request.state === 'done') return;
  if (request.state === 'active') active--;
  else {
    const index = pending.indexOf(request);
    if (index >= 0) pending.splice(index, 1);
  }
  request.state = 'done';
  pump();
}
