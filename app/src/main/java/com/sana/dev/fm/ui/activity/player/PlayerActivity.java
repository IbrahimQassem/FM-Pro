//package com.sana.dev.fm.ui.activity.player;
//
//
//import android.app.NotificationManager;
//import android.content.Context;
//import android.content.Intent;
//import android.content.res.Configuration;
//
//import android.os.Bundle;
//import android.util.Log;
//import android.view.Menu;
//import android.view.MenuItem;
//import android.view.View;
//
//import androidx.appcompat.widget.Toolbar;
//import androidx.fragment.app.Fragment;
//import androidx.viewpager.widget.ViewPager;
//
//import com.google.android.material.tabs.TabLayout;
//import com.sana.dev.fm.R;
//
//
//
//public class PlayerActivity extends MusicServiceActivity {
//    public static final String TAG = PlayerActivity.class.getSimpleName();
//    private static final int NOTIFICATION_ID = 12302;
//
//    private ViewPager viewPager;
//    private TabLayout tabLayout;
//
//    @Override
//    public void onCreate(Bundle savedInstanceState) {
//        super.onCreate(savedInstanceState);
//        setContentView(R.layout.activity_player);
//
//        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
//
//    }
//
//    @Override
//    protected void onResume() {
//        super.onResume();
//        removeNotification();
//    }
//
//    public void removeNotification() {
//        NotificationManager notificationManager = (NotificationManager) getApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);
//        notificationManager.cancel(NOTIFICATION_ID);
//    }
//
//    @Override
//    public void onServiceConnected() {
//        Log.d(TAG,"onService Connected");
//        handleAllView();
//    }
//
//    public void handleAllView() {
//        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
//        setSupportActionBar(toolbar);
//
//        viewPager = (ViewPager) findViewById(R.id.container);
//        viewPager.setOffscreenPageLimit(4);
//        setupViewPager(viewPager);
//        tabLayout = (TabLayout) findViewById(R.id.tabs);
//        tabLayout.setupWithViewPager(viewPager);
//
//        Fragment songPlayerFragment = getSupportFragmentManager().findFragmentById(R.id.main_content);
//        if (songPlayerFragment == null) {
//            getSupportFragmentManager().beginTransaction().add(R.id.main_content, new SongPlayerFragment(), "SongPlayer").commit();
//            Log.d(TAG, "songPlayerFragment Fragment new created");
//        } else {
//            Log.d(TAG, "songPlayerFragment Fragment reused ");
//        }
//
//    }
//
//
//    private void setupViewPager(ViewPager viewPager) {
//        SongListFragment.SectionsPageAdapter adapter = new SongListFragment.SectionsPageAdapter(getSupportFragmentManager());
//        SongListFragment songListFragment;
////        AlbumListFragment albumListFragment;
////        PlayListFragment playListFragment;
////        ArtistListFragment artistListFragment;
//        songListFragment = new SongListFragment();
////        albumListFragment = new AlbumListFragment();
////        artistListFragment = new ArtistListFragment();
////        playListFragment = new PlayListFragment();
//        adapter.addFragment(songListFragment, "All Songs");
////        adapter.addFragment(albumListFragment, "Albums");
////        adapter.addFragment(artistListFragment, "Artist");
////        adapter.addFragment(playListFragment, "PlayList");
//        viewPager.setAdapter(adapter);
//    }
//
//    public Fragment findWithId(int id) {
//        return getSupportFragmentManager().findFragmentById(id);
//    }
//
//
//
//
//
//    @Override
//    public void onConfigurationChanged(Configuration newConfig) {
//        super.onConfigurationChanged(newConfig);
//    }
//
//}