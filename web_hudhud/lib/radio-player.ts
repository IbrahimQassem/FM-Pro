export type PlayableStation = { id: string; streamUrl: string; backupStreamUrl: string; resume?: boolean };
export type PlaybackStatus = 'idle' | 'connecting' | 'playing' | 'paused' | 'error';
export type PlaybackState = { stationId: string | null; status: PlaybackStatus };
type AudioPort = Pick<HTMLAudioElement, 'src' | 'preload' | 'play' | 'pause' | 'load' | 'removeAttribute' | 'addEventListener' | 'removeEventListener'>;

export function isHttpUrl(value: string): boolean {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

// Owns one active source. Each replacement has its own media element and epoch,
// so queued events and play() rejections from old sources cannot affect it.
export class RadioPlayer {
  private audio: AudioPort | null = null;
  private cleanup: (() => void) | null = null;
  private epoch = 0;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private resumePlay: (() => void) | null = null;
  private disposed = false;
  private state: PlaybackState = { stationId: null, status: 'idle' };

  constructor(
    private readonly createAudio: () => AudioPort,
    private readonly changed: (state: PlaybackState) => void,
    private readonly played: (stationId: string) => void,
    private readonly connectionTimeoutMs = 20000,
  ) {}

  select(station: PlayableStation): void {
    if (this.disposed) return;
    if (this.state.stationId === station.id) {
      if (this.state.status === 'connecting') return;
      if (station.resume && this.state.status === 'paused' && this.audio && this.resumePlay) { this.publish(station.id, 'connecting'); this.resumePlay(); return; }
      if (this.state.status === 'playing') {
        if (station.resume && this.audio) { this.audio.pause(); this.publish(station.id, 'paused'); return; }
        this.epoch++;
        this.release();
        this.publish(station.id, 'paused');
        return;
      }
    }
    const urls = [...new Set([station.streamUrl, station.backupStreamUrl].filter(isHttpUrl))];
    this.start(station.id, urls);
  }

  stop(): void {
    if (this.disposed) return;
    this.epoch++;
    this.release();
    this.publish(null, 'idle');
  }

  dispose(): void {
    this.disposed = true;
    this.epoch++;
    this.release();
  }

  private start(stationId: string, urls: string[]): void {
    const epoch = ++this.epoch;
    this.release();
    if (!urls.length) { this.publish(stationId, 'error'); return; }
    this.publish(stationId, 'connecting');
    const audio = this.createAudio();
    this.audio = audio;
    audio.preload = 'none';
    let remembered = false;
    const current = () => !this.disposed && epoch === this.epoch;
    const fail = () => {
      if (current()) this.start(stationId, urls.slice(1));
    };
    const connecting = () => { this.clearTimer(); this.connectTimer = setTimeout(fail, this.connectionTimeoutMs); };
    const playing = () => {
      if (!current()) return;
      this.clearTimer();
      this.publish(stationId, 'playing');
      if (!remembered) { remembered = true; this.played(stationId); }
    };
    const paused = () => { if (current()) { this.clearTimer(); this.publish(stationId, 'paused'); } };
    const waiting = () => { if (current()) { connecting(); this.publish(stationId, 'connecting'); } };
    const listeners: [string, () => void][] = [
      ['playing', playing], ['pause', paused], ['ended', paused],
      ['waiting', waiting], ['stalled', waiting], ['error', fail],
    ];
    for (const [name, listener] of listeners) audio.addEventListener(name, listener);
    this.cleanup = () => {
      for (const [name, listener] of listeners) audio.removeEventListener(name, listener);
    };
    audio.src = urls[0];
    this.resumePlay = () => { connecting(); try {
      void audio.play().catch((error: unknown) => {
        if (!current()) return;
        if (error instanceof Error && error.name === 'NotAllowedError') {
          this.epoch++;
          this.release();
          this.publish(stationId, 'paused');
        } else fail();
      });
    } catch { fail(); } };
    this.resumePlay();
  }

  private publish(stationId: string | null, status: PlaybackStatus): void {
    this.state = { stationId, status };
    this.changed(this.state);
  }

  private clearTimer(): void { if (this.connectTimer !== null) clearTimeout(this.connectTimer); this.connectTimer = null; }

  private release(): void {
    this.clearTimer();
    this.cleanup?.();
    this.cleanup = null;
    this.resumePlay = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
  }
}
