package com.sana.dev.fm.ui;

import com.sana.dev.fm.ui.model.PlaybackUiState;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class MiniPlayerContractTest {

    @Test
    public void miniPlayerLayout_enforcesAccessibleTouchTargets() throws Exception {
        File file = new File("src/main/res/layout/view_mini_player.xml");
        assertTrue("view_mini_player.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Play/Pause button must use min_touch_target_size for width",
                content.contains("android:layout_width=\"@dimen/min_touch_target_size\""));
        assertTrue("Play/Pause button must use min_touch_target_size for height",
                content.contains("android:layout_height=\"@dimen/min_touch_target_size\""));
    }

    @Test
    public void stringsXml_definesTalkBackPlaybackActions() throws Exception {
        File file = new File("src/main/res/values/strings.xml");
        assertTrue("strings.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must define action_play_stream for TalkBack", content.contains("name=\"action_play_stream\""));
        assertTrue("Must define action_pause_stream for TalkBack", content.contains("name=\"action_pause_stream\""));
        assertTrue("Must define state_buffering for TalkBack", content.contains("name=\"state_buffering\""));
        assertTrue("Must define mini_player_desc for TalkBack", content.contains("name=\"mini_player_desc\""));
    }

    @Test
    public void playbackUiState_transitionsCorrectly() {
        PlaybackUiState idle = PlaybackUiState.idle();
        assertEquals(PlaybackUiState.State.IDLE, idle.getState());
        assertFalse(idle.isPlaying());
        assertFalse(idle.isBuffering());
        assertFalse(idle.isVisible());

        PlaybackUiState buffering = PlaybackUiState.buffering("Station", "100.5 FM", "logo.png");
        assertEquals(PlaybackUiState.State.BUFFERING, buffering.getState());
        assertEquals("Station", buffering.getTitle());
        assertEquals("100.5 FM", buffering.getSubtitle());
        assertTrue(buffering.isBuffering());
        assertFalse(buffering.isPlaying());
        assertTrue(buffering.isVisible());

        PlaybackUiState playing = PlaybackUiState.playing("Station", "100.5 FM", "logo.png");
        assertEquals(PlaybackUiState.State.PLAYING, playing.getState());
        assertTrue(playing.isPlaying());
        assertFalse(playing.isBuffering());
        assertTrue(playing.isVisible());

        PlaybackUiState paused = PlaybackUiState.paused("Station", "100.5 FM", "logo.png");
        assertEquals(PlaybackUiState.State.PAUSED, paused.getState());
        assertFalse(paused.isPlaying());
        assertFalse(paused.isBuffering());
        assertTrue(paused.isVisible());

        PlaybackUiState error = PlaybackUiState.error("Error Title", "Network disconnected");
        assertEquals(PlaybackUiState.State.ERROR, error.getState());
        assertEquals("Error Title", error.getTitle());
        assertEquals("Network disconnected", error.getSubtitle());
        assertTrue(error.isVisible());
    }
}
