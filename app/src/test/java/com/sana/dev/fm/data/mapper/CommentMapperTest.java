package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.CommentDto;
import com.sana.dev.fm.domain.model.Comment;

import org.junit.Test;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class CommentMapperTest {

    @Test
    public void toDomain_withNullDto_returnsSafeEmptyComment() {
        Comment comment = CommentMapper.toDomain(null, "comm_default");

        assertNotNull(comment);
        assertEquals("comm_default", comment.getId());
        assertEquals("", comment.getAuthorName());
        assertEquals("", comment.getContent());
        assertEquals(0, comment.getLikesCount());
        assertFalse(comment.isEdited());
    }

    @Test
    public void toDomain_withCompleteDto_mapsAllFieldsCorrectly() {
        CommentDto dto = new CommentDto();
        dto.setId("comm_1");
        dto.setEpisodeId("ep_100");

        Map<String, Object> author = new HashMap<>();
        author.put("uid", "user_99");
        author.put("displayName", "فاطمة محمد");
        author.put("avatarUrl", "https://img.example.com/avatar99.webp");
        author.put("isVerified", true);
        dto.setAuthor(author);

        dto.setContent("حلقة متميزة وثرية بالمعلومات");
        dto.setLikesCount(14);
        dto.setEdited(true);
        dto.setStatus("visible");

        Date now = new Date(1715000000000L);
        dto.setCreatedAt(new Timestamp(now));
        dto.setUpdatedAt(new Timestamp(now));

        Comment comment = CommentMapper.toDomain(dto, null);

        assertNotNull(comment);
        assertEquals("comm_1", comment.getId());
        assertEquals("ep_100", comment.getEpisodeId());
        assertEquals("user_99", comment.getAuthorUid());
        assertEquals("فاطمة محمد", comment.getAuthorName());
        assertEquals("https://img.example.com/avatar99.webp", comment.getAuthorAvatarUrl());
        assertTrue(comment.isAuthorVerified());
        assertEquals("حلقة متميزة وثرية بالمعلومات", comment.getContent());
        assertEquals(14, comment.getLikesCount());
        assertTrue(comment.isEdited());
        assertEquals("visible", comment.getStatus());
        assertEquals(1715000000000L, comment.getCreatedAtMillis());
    }
}
