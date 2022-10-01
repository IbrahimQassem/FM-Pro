package com.sana.dev.fm.model;

import java.util.ArrayList;
import java.util.List;

public class ShardDate {

    private static final ShardDate SHARD_CLASS = new ShardDate();

    List<RadioInfo> infoList = new ArrayList<>();
    List<RadioProgram> programList = new ArrayList<>();
    List<com.sana.dev.fm.model.Episode> episodeList = new ArrayList<>();

    private ShardDate() {}

    public static ShardDate getInstance() {
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

    public List<com.sana.dev.fm.model.Episode> getEpisodeList() {
        return episodeList;
    }

    public void setEpisodeList(List<com.sana.dev.fm.model.Episode> episodeList) {
        this.episodeList = episodeList;
    }
}
