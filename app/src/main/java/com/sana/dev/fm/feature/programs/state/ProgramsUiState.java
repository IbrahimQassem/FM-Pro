package com.sana.dev.fm.feature.programs.state;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.domain.model.Program;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Immutable representation of the UI state for the Programs screen.
 * Disallows ambiguous null or mixed states.
 */
public final class ProgramsUiState implements Serializable {

    public enum Status {
        LOADING,
        CONTENT,
        EMPTY,
        ERROR
    }

    private final Status status;
    private final List<Program> programs;
    private final String message;
    private final AppError error;

    private ProgramsUiState(Status status, List<Program> programs, String message, AppError error) {
        this.status = status;
        this.programs = programs != null ? Collections.unmodifiableList(new ArrayList<>(programs)) : Collections.emptyList();
        this.message = message != null ? message : "";
        this.error = error;
    }

    public static ProgramsUiState loading() {
        return new ProgramsUiState(Status.LOADING, Collections.emptyList(), "", null);
    }

    public static ProgramsUiState content(List<Program> programs) {
        return new ProgramsUiState(Status.CONTENT, programs, "", null);
    }

    public static ProgramsUiState empty(String message) {
        return new ProgramsUiState(Status.EMPTY, Collections.emptyList(), message, null);
    }

    public static ProgramsUiState error(AppError error, String userMessage) {
        return new ProgramsUiState(Status.ERROR, Collections.emptyList(), userMessage, error);
    }

    public Status getStatus() {
        return status;
    }

    public boolean isLoading() {
        return status == Status.LOADING;
    }

    public boolean isContent() {
        return status == Status.CONTENT;
    }

    public boolean isEmpty() {
        return status == Status.EMPTY;
    }

    public boolean isError() {
        return status == Status.ERROR;
    }

    public List<Program> getPrograms() {
        return programs;
    }

    public String getMessage() {
        return message;
    }

    public AppError getError() {
        return error;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ProgramsUiState that = (ProgramsUiState) o;
        return status == that.status &&
                Objects.equals(programs, that.programs) &&
                Objects.equals(message, that.message) &&
                Objects.equals(error, that.error);
    }

    @Override
    public int hashCode() {
        return Objects.hash(status, programs, message, error);
    }

    @Override
    public String toString() {
        return "ProgramsUiState{" +
                "status=" + status +
                ", programsCount=" + programs.size() +
                ", message='" + message + '\'' +
                ", error=" + error +
                '}';
    }
}
