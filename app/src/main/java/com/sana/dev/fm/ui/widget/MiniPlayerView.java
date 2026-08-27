package com.sana.dev.fm.ui.widget;

import android.content.Context;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.card.MaterialCardView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.model.PlaybackUiState;
import com.sana.dev.fm.utils.Tools;

/**
 * Persistent MiniPlayer compound view with full TalkBack accessibility and Material 3 styling.
 */
public class MiniPlayerView extends FrameLayout {

    private MaterialCardView cardView;
    private ImageView ivIcon;
    private TextView tvTitle;
    private TextView tvSubtitle;
    private ProgressBar pbBuffering;
    private MaterialButton btnPlayPause;

    private PlaybackUiState currentState = PlaybackUiState.idle();

    public MiniPlayerView(@NonNull Context context) {
        super(context);
        init(context);
    }

    public MiniPlayerView(@NonNull Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init(context);
    }

    public MiniPlayerView(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init(context);
    }

    private void init(Context context) {
        LayoutInflater.from(context).inflate(R.layout.view_mini_player, this, true);

        cardView = findViewById(R.id.card_mini_player);
        ivIcon = findViewById(R.id.iv_mini_player_icon);
        tvTitle = findViewById(R.id.tv_mini_player_title);
        tvSubtitle = findViewById(R.id.tv_mini_player_subtitle);
        pbBuffering = findViewById(R.id.pb_mini_player_buffering);
        btnPlayPause = findViewById(R.id.btn_mini_player_play_pause);
    }

    public void renderState(@NonNull PlaybackUiState state) {
        this.currentState = state;

        if (!state.getTitle().isEmpty()) {
            tvTitle.setText(state.getTitle());
        }

        if (!state.getSubtitle().isEmpty()) {
            tvSubtitle.setText(state.getSubtitle());
        }

        if (!Tools.isEmpty(state.getImageUrl()) && getContext() != null) {
            Tools.displayUserProfile(getContext(), ivIcon, state.getImageUrl(), R.drawable.ic_radio);
        }

        switch (state.getState()) {
            case PLAYING:
                pbBuffering.setVisibility(GONE);
                btnPlayPause.setVisibility(VISIBLE);
                btnPlayPause.setIconResource(R.drawable.ic_media_pause);
                btnPlayPause.setContentDescription(getContext().getString(R.string.action_pause_stream));
                break;

            case BUFFERING:
                pbBuffering.setVisibility(VISIBLE);
                btnPlayPause.setVisibility(GONE);
                setContentDescription(getContext().getString(R.string.state_buffering));
                break;

            case PAUSED:
            case IDLE:
            case ERROR:
            default:
                pbBuffering.setVisibility(GONE);
                btnPlayPause.setVisibility(VISIBLE);
                btnPlayPause.setIconResource(R.drawable.ic_media_play);
                btnPlayPause.setContentDescription(getContext().getString(R.string.action_play_stream));
                break;
        }
    }

    public void setOnPlayPauseClickListener(@Nullable OnClickListener listener) {
        if (btnPlayPause != null) {
            btnPlayPause.setOnClickListener(listener);
        }
    }

    public void setOnPlayerClickListener(@Nullable OnClickListener listener) {
        if (cardView != null) {
            cardView.setOnClickListener(listener);
        }
    }

    public PlaybackUiState getCurrentState() {
        return currentState;
    }
}
