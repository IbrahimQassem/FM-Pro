package com.sana.dev.fm.utils.ugc;

import com.sana.dev.fm.model.UserBlock;

import java.util.List;

public interface OnBlockedUsersLoadedListener {
    void onSuccess(List<UserBlock> blockedUsers);
    void onFailure(Exception e);
}