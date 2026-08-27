package com.sana.dev.fm.data.datasource;

import com.sana.dev.fm.model.RadioProgram;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic fake implementation of ProgramsRemoteDataSource for unit and contract tests.
 */
public class FakeProgramsRemoteDataSource implements ProgramsRemoteDataSource {

    private final List<RadioProgram> programList = new ArrayList<>();
    private Exception shouldThrowException = null;

    public void setPrograms(List<RadioProgram> programs) {
        this.programList.clear();
        if (programs != null) {
            this.programList.addAll(programs);
        }
    }

    public void setException(Exception exception) {
        this.shouldThrowException = exception;
    }

    @Override
    public void fetchPrograms(String baseDb, String radioId, DataSourceCallback<List<RadioProgram>> callback) {
        if (callback == null) return;

        if (shouldThrowException != null) {
            callback.onError(shouldThrowException);
            return;
        }

        List<RadioProgram> filtered = new ArrayList<>();
        for (RadioProgram p : programList) {
            if (radioId.equals(p.getRadioId()) && !p.isDisabled()) {
                filtered.add(p);
            }
        }
        callback.onSuccess(filtered);
    }

    @Override
    public void fetchProgram(String baseDb, String radioId, String programId, DataSourceCallback<RadioProgram> callback) {
        if (callback == null) return;

        if (shouldThrowException != null) {
            callback.onError(shouldThrowException);
            return;
        }

        for (RadioProgram p : programList) {
            if (radioId.equals(p.getRadioId()) && programId.equals(p.getProgramId())) {
                callback.onSuccess(p);
                return;
            }
        }
        callback.onSuccess(null);
    }
}
