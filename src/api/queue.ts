/**
 * File d'attente à jetons (token bucket) + fetch avec retry/backoff.
 * AniList : 90 req/min annoncées, 30 en mode dégradé (x-ratelimit-limit: 30 constaté).
 * Jikan : 3 req/s et 60 req/min.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

export class RateLimitedQueue {
  private tokens: number;
  private last = Date.now();
  private blockedUntil = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private perMinute: number,
    private burst: number,
  ) {
    this.tokens = burst;
  }

  /** Suspend la file (réponse 429 / Retry-After). */
  block(ms: number) {
    this.blockedUntil = Math.max(this.blockedUntil, Date.now() + ms);
  }

  private refill() {
    const now = Date.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 60000) * this.perMinute);
    this.last = now;
  }

  /** Attend un jeton, dans l'ordre d'arrivée. */
  acquire(signal?: AbortSignal): Promise<void> {
    const p = this.chain.then(async () => {
      for (;;) {
        const blocked = this.blockedUntil - Date.now();
        if (blocked > 0) {
          await sleep(blocked, signal);
          continue;
        }
        this.refill();
        if (this.tokens >= 1) {
          this.tokens -= 1;
          return;
        }
        await sleep(Math.ceil(((1 - this.tokens) / this.perMinute) * 60000), signal);
      }
    });
    this.chain = p.catch(() => undefined);
    return p;
  }
}

export async function fetchJsonWithRetry<T>(
  queue: RateLimitedQueue,
  url: string,
  init: RequestInit = {},
  { retries = 4, signal }: { retries?: number; signal?: AbortSignal } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await queue.acquire(signal);
    try {
      const res = await fetch(url, { ...init, signal });
      if (res.status === 429) {
        const ra = Number(res.headers.get('retry-after'));
        const wait = (Number.isFinite(ra) && ra > 0 ? ra : 2 ** attempt * 2) * 1000;
        queue.block(wait);
        lastErr = new HttpError(429, 'Rate limited');
        continue;
      }
      if (res.status >= 500) {
        lastErr = new HttpError(res.status, `Server error ${res.status}`);
        queue.block(2 ** attempt * 1000 + Math.random() * 500);
        continue;
      }
      if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      if (signal?.aborted || (e instanceof HttpError && e.status < 500)) throw e;
      lastErr = e; // erreur réseau : on réessaie avec backoff
      queue.block(2 ** attempt * 1000 + Math.random() * 500);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Request failed');
}
