// lib/http/errors.ts

export class ApiError<T = any> extends Error {
  public status: number;
  public url: string;
  public payload?: T;

  constructor(message: string, options: { status?: number; url?: string; payload?: T } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.url = options.url ?? '';
    this.payload = options.payload;
  }
}
