// lib/http/errors.ts

export class ApiError<T = any> extends Error {
  public status: number;
  public url: string;
  public payload?: T;
  public isAuthError?: boolean;
  public authReset?: boolean;

  constructor(message: string, options: { status?: number; url?: string; payload?: T; isAuthError?: boolean; authReset?: boolean } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.url = options.url ?? '';
    this.payload = options.payload;
    this.isAuthError = options.isAuthError;
    this.authReset = options.authReset;
  }
}
