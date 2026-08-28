package com.sana.dev.fm.core.navigation;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class DeepLinkRouterTest {

    @Test
    public void testCustomScheme_programRoute() {
        DeepLinkRouter.Route route = DeepLinkRouter.parse("hudhud://program/prog_100");
        assertNotNull(route);
        assertEquals(DeepLinkRouter.DestinationType.PROGRAM, route.getType());
        assertEquals("prog_100", route.getTargetId());
    }

    @Test
    public void testCustomScheme_episodeRoute() {
        DeepLinkRouter.Route route = DeepLinkRouter.parse("hudhud://episode/ep_55");
        assertNotNull(route);
        assertEquals(DeepLinkRouter.DestinationType.EPISODE, route.getType());
        assertEquals("ep_55", route.getTargetId());
    }

    @Test
    public void testCustomScheme_stationRoute() {
        DeepLinkRouter.Route route = DeepLinkRouter.parse("fmpro://station/radio_sana");
        assertNotNull(route);
        assertEquals(DeepLinkRouter.DestinationType.STATION, route.getType());
        assertEquals("radio_sana", route.getTargetId());
    }

    @Test
    public void testCustomScheme_liveRoute() {
        DeepLinkRouter.Route route = DeepLinkRouter.parse("hudhud://live");
        assertNotNull(route);
        assertEquals(DeepLinkRouter.DestinationType.LIVE, route.getType());
    }

    @Test
    public void testHttpAppLinks_programRoute() {
        DeepLinkRouter.Route route = DeepLinkRouter.parse("https://hudhud.fm/program/prog_yemen");
        assertNotNull(route);
        assertEquals(DeepLinkRouter.DestinationType.PROGRAM, route.getType());
        assertEquals("prog_yemen", route.getTargetId());
    }

    @Test
    public void testHttpAppLinks_scheduleRoute() {
        DeepLinkRouter.Route route = DeepLinkRouter.parse("https://hudhud.fm/schedule");
        assertNotNull(route);
        assertEquals(DeepLinkRouter.DestinationType.SCHEDULE, route.getType());
    }

    @Test
    public void testNullOrInvalidUri() {
        assertNull(DeepLinkRouter.parse((String) null));
        assertNull(DeepLinkRouter.parse(""));
        assertNull(DeepLinkRouter.parse("unknown://invalid"));
    }
}
