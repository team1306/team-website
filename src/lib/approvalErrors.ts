/** PostgREST passes PTxxx exceptions from the atomic approval functions through. */
export function approvalErrorStatus(code: string): number {
  switch (code) {
    case "PT400": return 400;
    case "PT401": return 401;
    case "PT403":
    case "42501": return 403;
    case "PT404": return 404;
    case "PT409":
    case "40001": // Transaction serialization failure.
    case "40P01": // Deadlock victim; the transaction was rolled back.
      return 409;
    default: return 500;
  }
}
