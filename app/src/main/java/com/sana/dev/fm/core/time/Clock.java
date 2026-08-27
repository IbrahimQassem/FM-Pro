package com.sana.dev.fm.core.time;

/**
 * Time abstraction to decouple components from system clock for deterministic testing.
 */
public interface Clock {

    long currentTimeMillis();

    Clock SYSTEM = System::currentTimeMillis;
}
