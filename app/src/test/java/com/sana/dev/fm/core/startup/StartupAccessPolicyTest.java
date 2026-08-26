package com.sana.dev.fm.core.startup;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class StartupAccessPolicyTest {
    @Test
    public void authenticationFailureContinuesInListenerMode() {
        assertEquals(
                StartupAccessPolicy.Action.CONTINUE_LISTENER,
                StartupAccessPolicy.decide(26, 26, false)
        );
    }

    @Test
    public void authenticatedUserContinuesNormally() {
        assertEquals(
                StartupAccessPolicy.Action.CONTINUE_AUTHENTICATED,
                StartupAccessPolicy.decide(26, 26, true)
        );
    }

    @Test
    public void requiredUpdateStillBlocksBothModes() {
        assertEquals(
                StartupAccessPolicy.Action.FORCE_UPDATE,
                StartupAccessPolicy.decide(26, 27, false)
        );
        assertEquals(
                StartupAccessPolicy.Action.FORCE_UPDATE,
                StartupAccessPolicy.decide(26, 27, true)
        );
    }
}
