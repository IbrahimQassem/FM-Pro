enum AccountVerificationDelivery { sent, failed, rateLimited }

/// Returned only after account creation succeeds; delivery does not verify it.
class AccountRegistrationResult {
  const AccountRegistrationResult({required this.verificationDelivery});

  final AccountVerificationDelivery verificationDelivery;
}
