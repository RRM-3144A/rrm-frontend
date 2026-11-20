/** Error with the backend's HTTP status and a message for the user (Romanian). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Message to show for an error thrown by the data functions in src/lib. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'A apărut o eroare. Încearcă din nou.';
}
