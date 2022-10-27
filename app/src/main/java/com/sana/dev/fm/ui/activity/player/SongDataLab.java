package com.sana.dev.fm.ui.activity.player;


import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.database.CursorWrapper;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.provider.MediaStore;


import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ShardDate;
import com.sana.dev.fm.ui.activity.ProgramDetailsActivity;
import com.sana.dev.fm.ui.activity.player.database.SongCursorWrapper;
import com.sana.dev.fm.ui.activity.player.database.SongDbHelper;
import com.sana.dev.fm.utils.DataGenerator;
import com.sana.dev.fm.utils.FmUtilize;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;


public class SongDataLab {

    private static SongDataLab sSongDataLab;
    private Context mContext;
    private SQLiteDatabase mDatabase;
    private List<SongModel> songs;

    private SongDataLab(Context context) {
        mContext = context.getApplicationContext();
        mDatabase = new SongDbHelper(mContext).getWritableDatabase();
        songs = querySongs();
    }


    public static SongDataLab get(Context context) {
        if (sSongDataLab == null) {
            sSongDataLab = new SongDataLab(context);
        }
        return sSongDataLab;
    }

    public SongModel getSong(long id) {
//        SongCursorWrapper cursorWrapper = querySong("_id=" + id, null);
//        try {
//            if (cursorWrapper.getCount() != 0) {
//                cursorWrapper.moveToFirst();
//                return cursorWrapper.getSong();
//            }
//            return SongModel.EMPTY();
//        } finally {
//            cursorWrapper.close();
//        }
        for (SongModel songModel : songs) {
            if (songModel.getId() == id) {
                return songModel;
            }
        }
        return SongModel.EMPTY();
    }

    public SongModel getRandomSong() {
        Random r = new Random();
//        return songs.get(r.nextInt(songs.size() - 1));
        return songs.get(r.nextInt(songs.size()));
    }

    public SongModel getNextSong(SongModel currentSong) {
        try {
            return songs.get(songs.indexOf(currentSong) + 1);
        } catch (Exception e) {
            return getRandomSong();
        }
    }


    public SongModel getPreviousSong(SongModel currentSong) {
        try {
            return songs.get(songs.indexOf(currentSong) - 1);
        } catch (Exception e) {
            return getRandomSong();
        }
    }

    public List<SongModel> getSongs() {
        return songs;
    }

    public List<SongModel> querySongs() {
        List<SongModel> songs = new ArrayList();
//        List<Episode> detailsList = DataGenerator.getEpisodeData(mContext);
        List<Episode> detailsList = ShardDate.getInstance().getEpisodeList();

       String m = "https://firebasestorage.googleapis.com/v0/b/sanaa-dev.appspot.com/o/FM_Audio%2Fstream1.mp3?alt=media&token=fbaacbe9-782c-436f-82e8-3206811055b9";
        for (int i = 0; i < detailsList.size(); i++) {
            Episode ep = detailsList.get(i);
//            SongModel song = SongModel.EMPTY();
            SongModel song = new SongModel(i, ep.getEpName(), ep.getEpAnnouncer(), "", ep.getProgramName(), "zzz",ep.getEpProfile(), /*FmUtilize.modifyDateLayout(ep.getDateTimeModel().getDateStart())*//*"https://www.dev2qa.com/demo/media/test.mp3"*/ep.getEpStreamUrl(), 0, 0, 0, 0, 0, 0, 0, 0);
            songs.add(song);
        }
/*        SongCursorWrapper cursor = querySong(null, null);
        try {
            cursor.moveToFirst();
            do {
                SongModel song = cursor.getSong();
                song = cursor.getSong();
                song.setAlbumArt(getAlbumUri(song.getAlbumId()).toString());
                songs.add(song);
            } while (cursor.moveToNext());
        } finally {
            cursor.close();
        }*/
        return songs;
    }

    // incomplete get artist context
    public ArrayList<AlbumModel> getAlbums() {
        List<SongModel> songs = getSongs();

        // Organize song as: {albumId=>{song,song,song},albumId=>{song,song}}
        Map<Integer, ArrayList<SongModel>> albumMap = new HashMap<>();
        ArrayList<AlbumModel> allAlbums = new ArrayList<>();
        for (SongModel song : songs) {
            if (albumMap.get(song.getAlbumId()) == null) {
                albumMap.put(song.getAlbumId(), new ArrayList<SongModel>());
                albumMap.get(song.getAlbumId()).add(song);
            } else {
                albumMap.get(song.getAlbumId()).add(song);
            }
        }

        // Extracting and mapping the songlist
        for (Map.Entry<Integer, ArrayList<SongModel>> entry : albumMap.entrySet()) {
            ArrayList<SongModel> albumSpecificSongs = new ArrayList<>();
            for (SongModel song : entry.getValue()) {
                albumSpecificSongs.add(song);
            }
            allAlbums.add(new AlbumModel(albumSpecificSongs));
        }

//          Debugging Code
//        for(AlbumModel k:allAlbums) {
//            for(SongModel song: k.getAlbumSongs()) {
//                Log.i("Test","Album Title: "+song.getAlbumName()+"Album ID: "+song.getAlbumId()+" Song Name: "+song.getTitle());
//            }
//        }
//        Log.i("All Albums list: ",allAlbums.size()+"");
        return allAlbums;
    }

    public ArrayList<ArtistModel> getArtists() {
        ArrayList<AlbumModel> albums = getAlbums();
        Map<Integer, ArrayList<AlbumModel>> artistMap = new HashMap<>();
        ArrayList<ArtistModel> allArtists = new ArrayList<>();
        for (AlbumModel album : albums) {
            if (artistMap.get(album.getArtistId()) == null) {
                artistMap.put(album.getArtistId(), new ArrayList<AlbumModel>());
                artistMap.get(album.getArtistId()).add(album);
            } else {
                artistMap.get(album.getArtistId()).add(album);
            }
        }

        // Extracting and mapping the songlist
        for (Map.Entry<Integer, ArrayList<AlbumModel>> entry : artistMap.entrySet()) {
            ArrayList<AlbumModel> artistSpecificAlbum = new ArrayList<>();
            for (AlbumModel album : entry.getValue()) {
                artistSpecificAlbum.add(album);
            }
            allArtists.add(new ArtistModel(artistSpecificAlbum));
        }

        //Debugging Code
//        for(ArtistModel k:allArtists) {
//            for(AlbumModel album: k.getAlbums()) {
//                Log.i("Test "+album.getArtistId(),"Album Title: "+album.getName());
//            }
//        }
//        Log.i("All Albums list: ",allArtists.size()+"");
//
        return allArtists;
    }

//    private SongCursorWrapper querySong(String whereClause, String[] whereArgs) {
//        Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
//        String selection;
//        if (whereClause != null) {
//            selection = MediaStore.Audio.Media.IS_MUSIC + "!=0 AND " + whereClause;
//        } else {
//            selection = MediaStore.Audio.Media.IS_MUSIC + "!=0";
//        }
//        String sortOrder = MediaStore.Audio.Media.TITLE + " ASC";
//        Cursor cursor = mContext.getContentResolver().query(
//                uri,
//                null,
//                selection, // where clause
//                whereArgs,       //whereargs
//                sortOrder);
//        return new SongCursorWrapper(cursor);
//    }

    // returns the albumart uri
//    private Uri getAlbumUri(int albumId) {
//        Uri albumArtUri = Uri.parse("content://media/external/audio/albumart");
//        return ContentUris.withAppendedId(albumArtUri, albumId);
//    }
}