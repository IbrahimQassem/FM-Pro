package com.sana.dev.fm.feature.programs.viewmodel;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.repository.ProgramsRepository;
import com.sana.dev.fm.feature.programs.state.ProgramsUiState;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * ViewModel for the Programs feature screen.
 * Encapsulates state transitions and decouples UI controllers from data orchestration.
 */
public class ProgramsViewModel extends ViewModel {

    private final ProgramsRepository repository;
    private final MutableLiveData<ProgramsUiState> uiState = new MutableLiveData<>(ProgramsUiState.loading());
    private String currentRadioId;
    private List<Program> allPrograms = Collections.emptyList();

    public ProgramsViewModel(ProgramsRepository repository) {
        this.repository = repository;
    }

    public LiveData<ProgramsUiState> getUiState() {
        return uiState;
    }

    public ProgramsUiState getCurrentState() {
        return uiState.getValue() != null ? uiState.getValue() : ProgramsUiState.loading();
    }

    public String getCurrentRadioId() {
        return currentRadioId;
    }

    /**
     * Loads programs for a specific station/radio.
     *
     * @param radioId Station identifier.
     */
    public void loadPrograms(String radioId) {
        if (radioId == null || radioId.trim().isEmpty()) {
            uiState.setValue(ProgramsUiState.error(
                    new AppError.InvalidDataError("radioId", "Station ID is required"),
                    "معرف المحطة مطلوب"
            ));
            return;
        }

        this.currentRadioId = radioId.trim();
        uiState.setValue(ProgramsUiState.loading());

        repository.getProgramsByRadio(this.currentRadioId, result -> {
            if (result.isSuccess()) {
                List<Program> list = result.getDataOrNull();
                allPrograms = (list != null) ? Collections.unmodifiableList(new ArrayList<>(list)) : Collections.emptyList();
                if (allPrograms.isEmpty()) {
                    uiState.setValue(ProgramsUiState.empty("لا توجد برامج متاحة حالياً"));
                } else {
                    uiState.setValue(ProgramsUiState.content(allPrograms));
                }
            } else {
                allPrograms = Collections.emptyList();
                AppError error = result.getErrorOrNull();
                String userMessage = mapErrorToUserMessage(error);
                uiState.setValue(ProgramsUiState.error(error, userMessage));
            }
        });
    }

    /**
     * Filters currently loaded programs by query string (matching name, presenter, or description).
     *
     * @param query Search query text.
     */
    public void filterPrograms(String query) {
        if (allPrograms == null || allPrograms.isEmpty()) {
            return;
        }

        if (query == null || query.trim().isEmpty()) {
            uiState.setValue(ProgramsUiState.content(allPrograms));
            return;
        }

        String normalizedQuery = query.trim().toLowerCase();
        List<Program> filtered = new ArrayList<>();
        for (Program program : allPrograms) {
            if (program != null) {
                boolean matchesName = program.getName() != null && program.getName().toLowerCase().contains(normalizedQuery);
                boolean matchesTag = program.getTag() != null && program.getTag().toLowerCase().contains(normalizedQuery);
                boolean matchesDesc = program.getDescription() != null && program.getDescription().toLowerCase().contains(normalizedQuery);
                if (matchesName || matchesTag || matchesDesc) {
                    filtered.add(program);
                }
            }
        }

        if (filtered.isEmpty()) {
            uiState.setValue(ProgramsUiState.empty("لا توجد نتائج مطابقة للبحث"));
        } else {
            uiState.setValue(ProgramsUiState.content(filtered));
        }
    }

    /**
     * Retries loading programs for the current station, or the provided fallback.
     */
    public void retry(String fallbackRadioId) {
        String targetRadioId = (currentRadioId != null && !currentRadioId.isEmpty()) ? currentRadioId : fallbackRadioId;
        if (targetRadioId != null && !targetRadioId.isEmpty()) {
            loadPrograms(targetRadioId);
        }
    }

    private String mapErrorToUserMessage(AppError error) {
        if (error instanceof AppError.NetworkError) {
            return "تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.";
        }
        if (error instanceof AppError.NotFoundError) {
            return "لم يتم العثور على برامج هذه المحطة.";
        }
        if (error instanceof AppError.PermissionDeniedError) {
            return "ليس لديك الصلاحية لعرض هذه البرامج.";
        }
        if (error != null && error.getMessage() != null && !error.getMessage().isEmpty()) {
            return error.getMessage();
        }
        return "حدث خطأ غير متوقع أثناء تحميل البرامج.";
    }
}
