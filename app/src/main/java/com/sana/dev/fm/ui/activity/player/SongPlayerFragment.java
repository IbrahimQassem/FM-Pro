package com.sana.dev.fm.ui.activity.player;

import android.content.res.TypedArray;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Log;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.constraintlayout.widget.ConstraintLayout;

import com.google.android.material.appbar.AppBarLayout;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;

import java.io.FileNotFoundException;
import java.io.IOException;


public class SongPlayerFragment extends MusicServiceFragment {

    public static final String TAG = "SongPlayerFragment";

    private View parentView;
    private SeekBar seekBar;
    private TextView currentSong;
    private TextView currentArtist;
    private TextView totalTime;
    private TextView remainingTime;

    private AppBarLayout appBarLayout;
    private CircularImageView currentCoverArt;
    private ImageView currentCoverArtShadow;
    private ImageView actionBtn;
    private ImageView panelPlayBtn;
    private ImageView panelNextBtn;
    private ImageView panelPrevBtn;

    private ImageButton cancelBtn;

    private BottomSheetBehavior bottomSheetBehavior;
    private ConstraintLayout panelLayout;
    private LinearLayout.LayoutParams params;

    private MusicService musicService;
    private boolean musicServiceStatus = false;
    private SongSeekBarThread seekBarThread;


    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        seekBarThread = new SongSeekBarThread();
        seekBarThread.start();
        setRetainInstance(true);
    }


    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        parentView = inflater.inflate(R.layout.panel_player_interface, container, false);

        panelLayout = parentView.findViewById(R.id.cl_player_interface);
        bottomSheetBehavior = BottomSheetBehavior.from(panelLayout);

//        // dp to pixel
//        int heightInPixel = Helper.dpToPx(getActivity(), 70);
//        bottomSheetBehavior.setPeekHeight(heightInPixel);

        appBarLayout = parentView.findViewById(R.id.appBarLayout);
        currentSong = parentView.findViewById(R.id.tv_panel_song_name);
        currentArtist = parentView.findViewById(R.id.tv_panel_artist_name);
        currentCoverArt = parentView.findViewById(R.id.iv_pn_cover_art);
        currentCoverArtShadow = parentView.findViewById(R.id.iv_pn_cover_art_shadow);
        actionBtn = parentView.findViewById(R.id.iv_pn_action_btn);
        seekBar = parentView.findViewById(R.id.sb_pn_player);
        totalTime = parentView.findViewById(R.id.tv_pn_total_time);
        remainingTime = parentView.findViewById(R.id.tv_pn_remain_time);

        panelPlayBtn = parentView.findViewById(R.id.iv_pn_play_btn);
        panelNextBtn = parentView.findViewById(R.id.iv_pn_next_btn);
        panelPrevBtn = parentView.findViewById(R.id.iv_pn_prev_btn);

        cancelBtn = parentView.findViewById(R.id.cancelBtn);

        appBarLayout.setVisibility(View.GONE);

        params = (LinearLayout.LayoutParams) currentSong.getLayoutParams();

        if (musicServiceStatus) {
            updateUI();
            handleAllAction();
        }

        eventBackClick();

        return parentView;
    }

    private void eventBackClick() {
        parentView.setFocusableInTouchMode(true);
        parentView.requestFocus();
        parentView.setOnKeyListener(new View.OnKeyListener() {
            @Override
            public boolean onKey(View v, int keyCode, KeyEvent event) {
                Log.i(LogUtility.TAG, "keyCode: " + keyCode);
                if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                    Log.i(LogUtility.TAG, "onKey Back listener is working!!!");
//                    getFragmentManager().popBackStack(null, FragmentManager.POP_BACK_STACK_INCLUSIVE);
                    if (bottomSheetBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
                        bottomSheetBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
                    }
                    return true;
                }
                return false;
            }
        });
    }


    @Override
    public void onServiceConnected(MusicService musicService) {
        this.musicService = musicService;
        musicServiceStatus = true;
        updateUI();
        handleAllAction();
    }

    @Override
    public void onServiceDisconnected() {
        musicServiceStatus = false;
    }

    // done in this methods
    public void handleAllAction() {

        //set default
        if (musicService.isPlaying()) {
            actionBtn.setBackgroundResource(R.drawable.ic_media_pause);
        } else {
            actionBtn.setBackgroundResource(R.drawable.ic_media_play);

        }

        cancelBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (bottomSheetBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
                    bottomSheetBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
                }
            }
        });

        //for the action button
        actionBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (musicService.isPlaying()) {
                    actionBtn.setBackgroundResource(R.drawable.ic_media_play);
                    musicService.pause();
                } else {
                    musicService.start();
                    actionBtn.setBackgroundResource(R.drawable.ic_media_pause);
                }
            }
        });

        panelLayout.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (bottomSheetBehavior.getState() == BottomSheetBehavior.STATE_COLLAPSED) {
                    bottomSheetBehavior.setState(BottomSheetBehavior.STATE_EXPANDED);
                }
            }
        });

        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int i, boolean b) {
                // b refresests user changed value
                if (musicService != null && b) {
                    // multiply by 1000 is needed, as the value is passed by dividing 1000
                    musicService.seekTo(i * 1000);
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {

            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {

            }
        });


        // for the sliding panel buttons
        panelNextBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                musicService.playNext();
            }
        });

        panelPrevBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                musicService.playPrev();
            }
        });

        if (musicService.isPlaying()) {
            panelPlayBtn.setBackgroundResource(R.drawable.ic_action_pause);
        } else {
            panelPlayBtn.setBackgroundResource(R.drawable.ic_action_play);
        }


        panelPlayBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (musicService.isPlaying()) {
                    panelPlayBtn.animate().rotationX(10).setDuration(500);
                    panelPlayBtn.setBackgroundResource(R.drawable.ic_action_play);
                    musicService.pause();
                } else {
                    musicService.start();
                    panelPlayBtn.animate().rotationX(-10).setDuration(500);
                    panelPlayBtn.setBackgroundResource(R.drawable.ic_action_pause);
                }
            }
        });

        bottomSheetBehavior.setBottomSheetCallback(new BottomSheetBehavior.BottomSheetCallback() {
            @Override
            public void onStateChanged(@NonNull View bottomSheet, int newState) {
                switch (newState) {
                    case BottomSheetBehavior.STATE_HIDDEN:
//                    dismiss();
                        break;
                    case BottomSheetBehavior.STATE_EXPANDED:
                        panelPlayBtn.animate().rotation(360).setDuration(1000);
                        //make toolbar visible
                        appBarLayout.setVisibility(View.VISIBLE);
//                        showView(appBarLayout, getActionBarSize());
//                        hideAppBar(bi.profileLayout);
                        break;
                    case BottomSheetBehavior.STATE_COLLAPSED:
                        //hide toolbar here
                        appBarLayout.setVisibility(View.GONE);
//                        hideAppBar(appBarLayout);
//                        showView(bi.profileLayout, getActionBarSize());
                        break;
                    case BottomSheetBehavior.STATE_DRAGGING:
                        break;
                    case BottomSheetBehavior.STATE_SETTLING:
                        break;
                    default:
                        break;
                }
            }

            @Override
            public void onSlide(@NonNull View bottomSheet, float slideOffset) {
                // animating the views when panel expanding and collapsing
                params.topMargin = Tools.dpToPx(getActivity(), slideOffset * 10 /*30*/ + 5);
                actionBtn.setAlpha(1 - slideOffset);
                currentCoverArt.setAlpha(slideOffset);
                panelNextBtn.setAlpha(slideOffset);
                panelPlayBtn.setAlpha(slideOffset);
                panelPrevBtn.setAlpha(slideOffset);
                currentSong.setLayoutParams(params);
            }
        });

        //issue with the oncompletion should be solved fast..
        musicService.setCallback(new PlayerInterface.Callback() {
            @Override
            public void onCompletion(SongModel song) {
            }

            @Override
            public void onTrackChange(SongModel song) {
                Log.i(TAG, "track duration:" + song.getDuration());
                updateUiOnTrackChange(song);
            }

            @Override
            public void onPause() {
//                actionBtn.setBackgroundResource(R.drawable.ic_media_play);
            }
        });
    }


    // progress bar thread on the bottom of the action bar
    private class SongSeekBarThread extends Thread {
        @Override
        public void run() {
            while (true) {
                try {
                    Thread.sleep(1000);
                    if (musicServiceStatus) {
                        final String strTotalTime = Tools.toTimeFormat(musicService.getDuration());
                        final String strRemainTIme = Tools.toTimeFormat(musicService.getDuration() - musicService.getCurrentStreamPosition());
                        getActivity().runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                seekBar.setProgress(musicService.getCurrentStreamPosition() / 1000);
                                totalTime.setText(strTotalTime);
                                remainingTime.setText(strRemainTIme);

                            }
                        });
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    // this updates the ui on music changes in new runnable
    public void updateUiOnTrackChange(final SongModel song) {
        Thread updateThread = new Thread() {
            Bitmap bitmap = null;

            @Override
            public void run() {
                Uri imageUri = Uri.parse(song.getAlbumArt());
                try {
                    bitmap = MediaStore.Images.Media.getBitmap(getActivity().getContentResolver(), imageUri);
                } catch (FileNotFoundException e) {
                    bitmap = BitmapFactory.decodeResource(getActivity().getResources(), R.drawable.img_old_sanaa);
                } catch (IOException e) {
                    e.printStackTrace();
                }


                getActivity().runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        seekBar.setProgress(0);
                        seekBar.setMax((int) song.getDuration() / 1000);
                        seekBar.setMax((int) song.getDuration() / 1000);
                        if (musicServiceStatus) {
                            seekBar.setProgress(musicService.getCurrentStreamPosition());
                        }
                        currentSong.setText(song.getTitle());
                        actionBtn.setBackgroundResource(R.drawable.ic_media_pause);
                        panelPlayBtn.setBackgroundResource(R.drawable.ic_action_pause);
                        currentArtist.setText(song.getArtistName());
                        if (song.getImgUrl() != null) {
                            Tools.displayImageRound(requireContext(), currentCoverArt, song.getImgUrl());
                            Tools.displayImageOriginal(requireContext(), currentCoverArtShadow, song.getImgUrl());
                        } else {
                            currentCoverArt.setImageBitmap(bitmap);
                        }
//                        Blurry.with(getActivity()).radius(20).sampling(2).from(bitmap).into(currentCoverArtShadow);
                    }
                });
            }
        };
        updateThread.start();

    }

    @Override
    public void onPause() {
        super.onPause();
        Log.d(TAG, "SongPlayer Fragment On Pause Called");

        if (bottomSheetBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
            bottomSheetBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d(TAG, "SongPlayer Fragment On Resume Called");
        updateUI();
    }

    public void updateUI() {
        if (musicService != null) {
            SongModel song = musicService.getCurrentSong();
            updateUiOnTrackChange(song);
            Log.d(TAG, "updateUI called with current song is: " + song.getTitle());
        }
    }

    private void hideAppBar(View view) {
        ViewGroup.LayoutParams params = view.getLayoutParams();
        params.height = 0;
        view.setLayoutParams(params);

    }

    private void showView(View view, int size) {
        ViewGroup.LayoutParams params = view.getLayoutParams();
        params.height = size;
        view.setLayoutParams(params);
    }

    private int getActionBarSize() {
        final TypedArray array = getContext().getTheme().obtainStyledAttributes(new int[]{android.R.attr.actionBarSize});
        int size = (int) array.getDimension(0, 0);
        return size;
    }
}