enum AccountSignInProvider { password, google, facebook, apple }

extension AccountSignInProviderId on AccountSignInProvider {
  String get firebaseId => switch (this) {
    AccountSignInProvider.password => 'password',
    AccountSignInProvider.google => 'google.com',
    AccountSignInProvider.facebook => 'facebook.com',
    AccountSignInProvider.apple => 'apple.com',
  };
}
