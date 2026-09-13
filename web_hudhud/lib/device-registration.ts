// Transient token ownership state. Callers serialize operations and keep Auth
// unchanged until clear() completes; token values are never persisted here.
export class DeviceRegistration {
  private token: string | null = null;
  constructor(private readonly call: (name: string, data: Record<string, unknown>) => Promise<unknown>, private readonly deleteSdkToken: () => Promise<unknown>) {}
  async replace(token: string): Promise<void> {
    if (this.token && this.token !== token) await this.call('unregisterStationAlertDevice', { token: this.token });
    // A failed/ambiguous registration still needs an unregister on sign-out.
    this.token = token;
    await this.call('registerStationAlertDevice', { token });
  }
  async clear(wasOptedIn: boolean): Promise<void> {
    if (this.token) await this.call('unregisterStationAlertDevice', { token: this.token });
    if (this.token || wasOptedIn) await this.deleteSdkToken();
    this.token = null;
  }
}
