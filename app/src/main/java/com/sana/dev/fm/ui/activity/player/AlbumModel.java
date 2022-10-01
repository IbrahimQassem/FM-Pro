package com.sana.dev.fm.ui.activity.player;

import java.util.ArrayList;


public class AlbumModel {
    public final ArrayList<SongModel> songs;
    public int id;

    public AlbumModel(ArrayList<SongModel> songs) {
        this.songs = songs;
    }
    public void setId(int i) {
        this.id=i;
    }
    public ArrayList<SongModel> getAlbumSongs() {
        return songs;
    }

    public  String getName() {
        if(songs.size()>0) {
            return songs.get(0).getAlbumName();
        }else {
            return " ";
        }
    }
    public int getNoOfSong() {
        return songs.size();
    }

    public String getCoverArt() {
        if(songs.size()>0) {
            return songs.get(0).getAlbumArt();
        }else {
            return " ";
        }
    }

    public int getArtistId() {
        if(songs.size()>0) {
            return songs.get(0).getArtistId();
        }else {
            return 0;
        }
    }
    public String getArtistName() {
        if(songs.size()>0) {
            return songs.get(0).getArtistName();
        }else {
            return "";
        }
    }
}