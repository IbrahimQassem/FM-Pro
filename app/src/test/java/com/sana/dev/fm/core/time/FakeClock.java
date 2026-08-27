package com.sana.dev.fm.core.time;

/**
 * Controllable FakeClock for testing time-sensitive TTL and expiration behavior.
 */
public class FakeClock implements Clock {

    private long currentTime;

    public FakeClock(long initialTime) {
        this.currentTime = initialTime;
    }

    public FakeClock() {
        this(1000000L);
    }

    @Override
    public long currentTimeMillis() {
        return currentTime;
    }

    public void advanceBy(long millis) {
        this.currentTime += millis;
    }

    public void setCurrentTime(long time) {
        this.currentTime = time;
    }
}
