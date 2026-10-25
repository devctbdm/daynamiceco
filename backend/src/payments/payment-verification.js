const SUCCESS_STATUSES = new Set(["VALID", "VALIDATED"]);

const normalizeStatus = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

const toMinorUnits = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100)
    : null;
};

export const isSuccessfulPaymentValidation = (
  validation,
  { tranId, expectedAmount },
) => {
  const validatedAmount = toMinorUnits(validation?.amount);
  const expectedAmountInMinorUnits = toMinorUnits(expectedAmount);

  return (
    SUCCESS_STATUSES.has(normalizeStatus(validation?.status)) &&
    validation?.tran_id === tranId &&
    validatedAmount !== null &&
    expectedAmountInMinorUnits !== null &&
    validatedAmount === expectedAmountInMinorUnits &&
    typeof validation?.currency === "string" &&
    validation.currency.trim().toUpperCase() === "BDT"
  );
};

export const isSuccessfulPaymentStatus = (status) =>
  SUCCESS_STATUSES.has(normalizeStatus(status));
