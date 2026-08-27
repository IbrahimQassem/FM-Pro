package com.sana.dev.fm.ui.widget;

import android.content.Context;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.button.MaterialButton;
import com.sana.dev.fm.R;

/**
 * Compound View for managing explicit UI states: Loading, Content, Empty, Error, and Offline.
 * Guarantees that only the appropriate view is visible for the current state.
 */
public class StateLayout extends FrameLayout {

    public enum State {
        LOADING,
        CONTENT,
        EMPTY,
        ERROR,
        OFFLINE
    }

    private View contentView;
    private View loadingView;
    private View emptyView;
    private View errorView;
    private View offlineView;

    private State currentState = State.CONTENT;

    public StateLayout(@NonNull Context context) {
        super(context);
        init(context);
    }

    public StateLayout(@NonNull Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public StateLayout(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        // Initialization if needed
    }

    @Override
    protected void onFinishInflate() {
        super.onFinishInflate();
        if (getChildCount() > 0) {
            contentView = getChildAt(0);
        }
    }

    public void setContentView(View view) {
        this.contentView = view;
        if (contentView != null && contentView.getParent() == null) {
            addView(contentView);
        }
    }

    public State getCurrentState() {
        return currentState;
    }

    public void showLoading() {
        currentState = State.LOADING;
        ensureLoadingView();
        hideAllExcept(loadingView);
    }

    public void showContent() {
        currentState = State.CONTENT;
        if (contentView != null) {
            hideAllExcept(contentView);
        }
    }

    public void showEmpty(@Nullable String title, @Nullable String description, @Nullable Runnable onActionClick) {
        currentState = State.EMPTY;
        ensureEmptyView();

        TextView tvTitle = emptyView.findViewById(R.id.state_empty_title);
        if (tvTitle != null && title != null) {
            tvTitle.setText(title);
        }

        TextView tvDesc = emptyView.findViewById(R.id.state_empty_description);
        if (tvDesc != null && description != null) {
            tvDesc.setText(description);
        }

        MaterialButton btnAction = emptyView.findViewById(R.id.state_empty_action_button);
        if (btnAction != null) {
            if (onActionClick != null) {
                btnAction.setVisibility(VISIBLE);
                btnAction.setOnClickListener(v -> onActionClick.run());
            } else {
                btnAction.setVisibility(GONE);
            }
        }

        hideAllExcept(emptyView);
    }

    public void showError(@Nullable String title, @Nullable String description, @Nullable Runnable onRetryClick) {
        currentState = State.ERROR;
        ensureErrorView();

        TextView tvTitle = errorView.findViewById(R.id.state_error_title);
        if (tvTitle != null && title != null) {
            tvTitle.setText(title);
        }

        TextView tvDesc = errorView.findViewById(R.id.state_error_description);
        if (tvDesc != null && description != null) {
            tvDesc.setText(description);
        }

        MaterialButton btnRetry = errorView.findViewById(R.id.state_error_retry_button);
        if (btnRetry != null && onRetryClick != null) {
            btnRetry.setOnClickListener(v -> onRetryClick.run());
        }

        hideAllExcept(errorView);
    }

    public void showOffline(@Nullable Runnable onRetryClick) {
        currentState = State.OFFLINE;
        ensureOfflineView();

        MaterialButton btnRetry = offlineView.findViewById(R.id.state_offline_retry_button);
        if (btnRetry != null && onRetryClick != null) {
            btnRetry.setOnClickListener(v -> onRetryClick.run());
        }

        hideAllExcept(offlineView);
    }

    private void ensureLoadingView() {
        if (loadingView == null) {
            loadingView = LayoutInflater.from(getContext()).inflate(R.layout.view_state_loading, this, false);
            addView(loadingView);
        }
    }

    private void ensureEmptyView() {
        if (emptyView == null) {
            emptyView = LayoutInflater.from(getContext()).inflate(R.layout.view_state_empty, this, false);
            addView(emptyView);
        }
    }

    private void ensureErrorView() {
        if (errorView == null) {
            errorView = LayoutInflater.from(getContext()).inflate(R.layout.view_state_error, this, false);
            addView(errorView);
        }
    }

    private void ensureOfflineView() {
        if (offlineView == null) {
            offlineView = LayoutInflater.from(getContext()).inflate(R.layout.view_state_offline, this, false);
            addView(offlineView);
        }
    }

    private void hideAllExcept(View target) {
        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            if (child == target) {
                child.setVisibility(VISIBLE);
            } else {
                child.setVisibility(GONE);
            }
        }
    }
}
