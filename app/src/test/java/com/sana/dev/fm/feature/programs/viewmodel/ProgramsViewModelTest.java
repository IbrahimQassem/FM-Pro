package com.sana.dev.fm.feature.programs.viewmodel;

import androidx.arch.core.executor.testing.InstantTaskExecutorRule;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.model.ScheduleTime;
import com.sana.dev.fm.domain.repository.ProgramsRepository;
import com.sana.dev.fm.feature.programs.state.ProgramsUiState;

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class ProgramsViewModelTest {

    @Rule
    public InstantTaskExecutorRule instantTaskExecutorRule = new InstantTaskExecutorRule();

    private FakeProgramsRepository fakeRepository;
    private ProgramsViewModel viewModel;

    @Before
    public void setUp() {
        fakeRepository = new FakeProgramsRepository();
        viewModel = new ProgramsViewModel(fakeRepository);
    }

    @Test
    public void initialState_isLoading() {
        ProgramsUiState state = viewModel.getCurrentState();
        assertNotNull(state);
        assertTrue(state.isLoading());
    }

    @Test
    public void loadPrograms_successWithContent_transitionsToContentState() {
        Program p = new Program("p1", "station_1", "News Hour", "Daily news", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        fakeRepository.setPrograms(Collections.singletonList(p));

        viewModel.loadPrograms("station_1");

        ProgramsUiState state = viewModel.getUiState().getValue();
        assertNotNull(state);
        assertTrue(state.isContent());
        assertEquals(1, state.getPrograms().size());
        assertEquals("p1", state.getPrograms().get(0).getId());
    }

    @Test
    public void loadPrograms_successWithEmpty_transitionsToEmptyState() {
        fakeRepository.setPrograms(Collections.emptyList());

        viewModel.loadPrograms("station_empty");

        ProgramsUiState state = viewModel.getUiState().getValue();
        assertNotNull(state);
        assertTrue(state.isEmpty());
        assertFalse(state.getMessage().isEmpty());
    }

    @Test
    public void loadPrograms_networkFailure_transitionsToErrorState() {
        fakeRepository.setError(new AppError.NetworkError("Host unreachable"));

        viewModel.loadPrograms("station_fail");

        ProgramsUiState state = viewModel.getUiState().getValue();
        assertNotNull(state);
        assertTrue(state.isError());
        assertTrue(state.getError() instanceof AppError.NetworkError);
        assertNotNull(state.getMessage());
    }

    @Test
    public void loadPrograms_emptyRadioId_transitionsToErrorState() {
        viewModel.loadPrograms("");

        ProgramsUiState state = viewModel.getUiState().getValue();
        assertNotNull(state);
        assertTrue(state.isError());
        assertTrue(state.getError() instanceof AppError.InvalidDataError);
    }

    @Test
    public void retry_reloadsCurrentStation() {
        fakeRepository.setError(new AppError.NetworkError("First attempt failed"));
        viewModel.loadPrograms("station_retry");
        assertTrue(viewModel.getCurrentState().isError());

        // Fix the backend error and retry
        Program p = new Program("p2", "station_retry", "Evening Talk", "Talk show", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        fakeRepository.setPrograms(Collections.singletonList(p));

        viewModel.retry("station_retry");

        ProgramsUiState state = viewModel.getUiState().getValue();
        assertNotNull(state);
        assertTrue(state.isContent());
        assertEquals(1, state.getPrograms().size());
        assertEquals("p2", state.getPrograms().get(0).getId());
    }

    @Test
    public void filterPrograms_matchesByQuery_updatesContent() {
        Program p1 = new Program("p1", "st1", "صباح الخير يا وطن", "برنامج صباحي", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        Program p2 = new Program("p2", "st1", "مساء النور", "برنامج مسائي", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        fakeRepository.setPrograms(java.util.Arrays.asList(p1, p2));

        viewModel.loadPrograms("st1");
        assertEquals(2, viewModel.getCurrentState().getPrograms().size());

        // Filter by "صباح"
        viewModel.filterPrograms("صباح");
        assertTrue(viewModel.getCurrentState().isContent());
        assertEquals(1, viewModel.getCurrentState().getPrograms().size());
        assertEquals("p1", viewModel.getCurrentState().getPrograms().get(0).getId());

        // Filter by empty/blank query restores full list
        viewModel.filterPrograms("");
        assertTrue(viewModel.getCurrentState().isContent());
        assertEquals(2, viewModel.getCurrentState().getPrograms().size());

        // Filter by non-matching query transitions to empty
        viewModel.filterPrograms("غير موجود");
        assertTrue(viewModel.getCurrentState().isEmpty());
    }

    /**
     * Test fake repository for ProgramsViewModel.
     */
    private static class FakeProgramsRepository implements ProgramsRepository {
        private List<Program> programs = Collections.emptyList();
        private AppError error = null;

        public void setPrograms(List<Program> programs) {
            this.programs = programs;
            this.error = null;
        }

        public void setError(AppError error) {
            this.error = error;
            this.programs = null;
        }

        @Override
        public void getProgramsByRadio(String radioId, Callback<Result<List<Program>>> callback) {
            if (callback == null) return;
            if (error != null) {
                callback.onResult(Result.failure(error));
            } else {
                callback.onResult(Result.success(programs));
            }
        }

        @Override
        public void getProgramById(String radioId, String programId, Callback<Result<Program>> callback) {
            if (callback == null) return;
            if (error != null) {
                callback.onResult(Result.failure(error));
            } else if (programs != null && !programs.isEmpty()) {
                callback.onResult(Result.success(programs.get(0)));
            } else {
                callback.onResult(Result.failure(new AppError.NotFoundError(programId, "Not found")));
            }
        }
    }
}
