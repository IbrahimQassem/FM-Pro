package com.sana.dev.fm.model;

import com.sana.dev.fm.ui.activity.player.SongDataLab;

import java.util.ArrayList;
import java.util.List;

public class ShardDate {

    private static ShardDate SHARD_CLASS ;

    List<RadioInfo> infoList = new ArrayList<>();
    List<RadioProgram> programList = new ArrayList<>();
    List<Episode> episodeList = new ArrayList<>();

    private ShardDate() {}

    public static ShardDate getInstance() {
        if (SHARD_CLASS == null) {
            SHARD_CLASS = new ShardDate();
        }
        return SHARD_CLASS;
    }


    public List<RadioInfo> getInfoList() {
        return infoList;
    }

    public void setInfoList(List<RadioInfo> infoList) {
        this.infoList = infoList;
    }

    public List<RadioProgram> getProgramList() {
        return programList;
    }

    public void setProgramList(List<RadioProgram> programList) {
        this.programList = programList;
    }

    public List<Episode> getEpisodeList() {
        return episodeList;
    }

    public void setEpisodeList(List<Episode> episodeList) {
        this.episodeList = episodeList;
    }
}
