export class SleeperApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SleeperApiError';
    this.status = status;
  }
}

export class LeagueLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeagueLockError';
  }
}
