package com.sana.dev.fm.feature.programs.state;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.model.ScheduleTime;

import org.junit.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class ProgramsUiStateTest {

    @Test
    public void loadingState_hasCorrectFlags() {
        ProgramsUiState state = ProgramsUiState.loading();

        assertEquals(ProgramsUiState.Status.LOADING, state.getStatus());
        assertTrue(state.isLoading());
        assertFalse(state.isContent());
        assertFalse(state.isEmpty());
        assertFalse(state.isError());
        assertTrue(state.getPrograms().isEmpty());
        assertNull(state.getError());
    }

    @Test
    public void contentState_hasCorrectPayload() {
        Program program = new Program("p1", "r1", "Show", "Desc", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        List<Program> list = Collections.singletonList(program);

        ProgramsUiState state = ProgramsUiState.content(list);

        assertEquals(ProgramsUiState.Status.CONTENT, state.getStatus());
        assertFalse(state.isLoading());
        assertTrue(state.isContent());
        assertFalse(state.isEmpty());
        assertFalse(state.isError());
        assertEquals(1, state.getPrograms().size());
        assertEquals("p1", state.getPrograms().get(0).getId());
    }

    @Test
    public void emptyState_hasMessage() {
        ProgramsUiState state = ProgramsUiState.empty("No programs found");

        assertEquals(ProgramsUiState.Status.EMPTY, state.getStatus());
        assertFalse(state.isLoading());
        assertFalse(state.isContent());
        assertTrue(state.isEmpty());
        assertFalse(state.isError());
        assertEquals("No programs found", state.getMessage());
        assertTrue(state.getPrograms().isEmpty());
    }

    @Test
    public void errorState_hasErrorAndUserMessage() {
        AppError.NetworkError networkError = new AppError.NetworkError("Timeout");
        ProgramsUiState state = ProgramsUiState.error(networkError, "Connection failed");

        assertEquals(ProgramsUiState.Status.ERROR, state.getStatus());
        assertFalse(state.isLoading());
        assertFalse(state.isContent());
        assertFalse(state.isEmpty());
        assertTrue(state.isError());
        assertEquals("Connection failed", state.getMessage());
        assertEquals(networkError, state.getError());
    }
}
