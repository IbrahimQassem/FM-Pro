package com.sana.dev.fm.ui.model;

import java.util.Objects;

/**
 * Immutable UI State representing current playback for the persistent mini-player.
 */
public final class PlaybackUiState {

    public enum State {
        IDLE,
        BUFFERING,
        PLAYING,
        PAUSED,
        ERROR
    }

    private final State state;
    private final String title;
    private final String subtitle;
    private final String imageUrl;

    public PlaybackUiState(State state, String title, String subtitle, String imageUrl) {
        this.state = state != null ? state : State.IDLE;
        this.title = title != null ? title : "";
        this.subtitle = subtitle != null ? subtitle : "";
        this.imageUrl = imageUrl != null ? imageUrl : "";
    }

    public static PlaybackUiState idle() {
        return new PlaybackUiState(State.IDLE, "", "", "");
    }

    public static PlaybackUiState buffering(String title, String subtitle, String imageUrl) {
        return new PlaybackUiState(State.BUFFERING, title, subtitle, imageUrl);
    }

    public static PlaybackUiState playing(String title, String subtitle, String imageUrl) {
        return new PlaybackUiState(State.PLAYING, title, subtitle, imageUrl);
    }

    public static PlaybackUiState paused(String title, String subtitle, String imageUrl) {
        return new PlaybackUiState(State.PAUSED, title, subtitle, imageUrl);
    }

    public static PlaybackUiState error(String title, String message) {
        return new PlaybackUiState(State.ERROR, title, message, "");
    }

    public State getState() {
        return state;
    }

    public String getTitle() {
        return title;
    }

    public String getSubtitle() {
        return subtitle;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public boolean isPlaying() {
        return state == State.PLAYING;
    }

    public boolean isBuffering() {
        return state == State.BUFFERING;
    }

    public boolean isVisible() {
        return state != State.IDLE;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PlaybackUiState)) return false;
        PlaybackUiState that = (PlaybackUiState) o;
        return state == that.state &&
                Objects.equals(title, that.title) &&
                Objects.equals(subtitle, that.subtitle) &&
                Objects.equals(imageUrl, that.imageUrl);
    }

    @Override
    public int hashCode() {
        return Objects.hash(state, title, subtitle, imageUrl);
    }

    @Override
    public String toString() {
        return "PlaybackUiState{" +
                "state=" + state +
                ", title='" + title + '\'' +
                ", subtitle='" + subtitle + '\'' +
                '}';
    }
}
