package com.sana.dev.fm.core.playback;

import com.sana.dev.fm.model.RadioInfo;

import org.junit.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class DefaultStationPolicyTest {

    @Test
    public void resolveActiveStation_returnsSelectedRadioWhenValid() {
        RadioInfo selected = new RadioInfo();
        selected.setRadioId("custom_radio");
        selected.setName("إذاعة خاصة");
        selected.setStreamUrl("https://stream.example.com/live");
        selected.setDisabled(false);

        List<RadioInfo> available = new ArrayList<>();
        RadioInfo listRadio = new RadioInfo();
        listRadio.setRadioId("list_radio");
        listRadio.setStreamUrl("https://list.example.com/live");
        available.add(listRadio);

        RadioInfo resolved = DefaultStationPolicy.resolveActiveStation(selected, available);
        assertEquals("custom_radio", resolved.getRadioId());
        assertEquals("https://stream.example.com/live", resolved.getStreamUrl());
    }

    @Test
    public void resolveActiveStation_returnsFirstActiveStationWhenSelectedIsNull() {
        List<RadioInfo> available = new ArrayList<>();

        RadioInfo disabledRadio = new RadioInfo();
        disabledRadio.setRadioId("disabled_radio");
        disabledRadio.setStreamUrl("https://disabled.example.com/live");
        disabledRadio.setDisabled(true);
        available.add(disabledRadio);

        RadioInfo activeRadio = new RadioInfo();
        activeRadio.setRadioId("active_radio");
        activeRadio.setName("إذاعة نشطة");
        activeRadio.setStreamUrl("https://active.example.com/live");
        activeRadio.setDisabled(false);
        available.add(activeRadio);

        RadioInfo resolved = DefaultStationPolicy.resolveActiveStation(null, available);
        assertEquals("active_radio", resolved.getRadioId());
        assertEquals("https://active.example.com/live", resolved.getStreamUrl());
    }

    @Test
    public void resolveActiveStation_returnsFallbackStationWhenAllSourcesEmpty() {
        RadioInfo resolved = DefaultStationPolicy.resolveActiveStation(null, null);
        assertNotNull(resolved);
        assertEquals(FallbackStationProvider.DEFAULT_RADIO_ID, resolved.getRadioId());
        assertEquals(FallbackStationProvider.DEFAULT_STREAM_URL, resolved.getStreamUrl());
        assertEquals(FallbackStationProvider.DEFAULT_NAME, resolved.getName());
        assertTrue(!resolved.isDisabled());
    }

    @Test
    public void resolveActiveStation_returnsFallbackStationWhenSelectedIsInvalidAndListEmpty() {
        RadioInfo invalidSelected = new RadioInfo();
        invalidSelected.setRadioId("invalid_radio");
        invalidSelected.setStreamUrl(""); // Empty stream URL

        RadioInfo resolved = DefaultStationPolicy.resolveActiveStation(invalidSelected, Collections.emptyList());
        assertEquals(FallbackStationProvider.DEFAULT_RADIO_ID, resolved.getRadioId());
    }

    @Test
    public void fallbackStationProvider_hasValidProperties() {
        RadioInfo fallback = FallbackStationProvider.getDefaultStation();
        assertNotNull(fallback.getRadioId());
        assertNotNull(fallback.getName());
        assertNotNull(fallback.getStreamUrl());
        assertTrue(fallback.getStreamUrl().startsWith("http"));
        assertTrue(!fallback.isDisabled());
    }
}
