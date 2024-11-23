package com.sana.dev.fm.utils.ugc;

import com.sana.dev.fm.model.Comment;

public interface CommentClickListener {
    void onReportClick(Comment comment);
    void onUserCommentClick(String userId);
    void onLikeClick(Comment comment);
    void onDeleteClick(Comment comment);
    void onBlockClick(Comment comment);
    void onUnBlockClick(Comment comment);
    void onUserClickProfile(String userId);
}