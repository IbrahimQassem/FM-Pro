package com.sana.dev.fm.model;

import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class ShardDate {

    private static ShardDate SHARD_CLASS ;

    List<RadioInfo> radioInfoList = new ArrayList<>();
    List<RadioProgram> programList = new ArrayList<>();
    List<Episode> episodeList = new ArrayList<>();

    private ShardDate() {}

    public static ShardDate getInstance() {
        if (SHARD_CLASS == null) {
            SHARD_CLASS = new ShardDate();
        }
        return SHARD_CLASS;
    }


    public List<RadioInfo> getRadioInfoList() {
        // Sort the list using the custom comparator
        Collections.sort(radioInfoList, new RadioInfo.RadioInfoPriorityComparator());
//        Collections.reverse(radioInfoList);
        return radioInfoList;
    }

    public ArrayList<RadioInfo> getAllowedRadioInfoList(UserModel userModel) {
        List<String> list = new ArrayList<>();
        if (!Tools.isEmpty(userModel.getAllowedPermissions())){
            list = userModel.getAllowedPermissions();
        }
        ArrayList<RadioInfo> strings = new ArrayList<>();
        for (String key : list) {
            for (RadioInfo object : getRadioInfoList()) {
                if (object.getName().matches(key)) {
                    strings.add(object);
                }
            }
        }

        // to prevent duplicate
        Set<RadioInfo> set = new HashSet<>(strings);
        strings.clear();
        strings.addAll(set);
        return strings;
    }


    public void setRadioInfoList(List<RadioInfo> radioInfoList) {
        this.radioInfoList = radioInfoList;
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
