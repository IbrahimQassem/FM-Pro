package com.sana.dev.fm.core.navigation;

import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * DeepLinkRouter parses incoming Uris or URL strings (from push notifications, web links, or app shortcuts)
 * and resolves them into structured navigation routes.
 */
public final class DeepLinkRouter {

    public enum DestinationType {
        HOME,
        SCHEDULE,
        PROGRAMS,
        ACCOUNT,
        STATION,
        PROGRAM,
        EPISODE,
        LIVE
    }

    public static final class Route {
        @NonNull
        private final DestinationType type;
        @Nullable
        private final String targetId;
        @Nullable
        private final String secondaryId;

        public Route(@NonNull DestinationType type, @Nullable String targetId, @Nullable String secondaryId) {
            this.type = type;
            this.targetId = targetId;
            this.secondaryId = secondaryId;
        }

        @NonNull
        public DestinationType getType() {
            return type;
        }

        @Nullable
        public String getTargetId() {
            return targetId;
        }

        @Nullable
        public String getSecondaryId() {
            return secondaryId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Route route = (Route) o;
            if (type != route.type) return false;
            if (targetId != null ? !targetId.equals(route.targetId) : route.targetId != null)
                return false;
            return secondaryId != null ? secondaryId.equals(route.secondaryId) : route.secondaryId == null;
        }

        @Override
        public int hashCode() {
            int result = type.hashCode();
            result = 31 * result + (targetId != null ? targetId.hashCode() : 0);
            result = 31 * result + (secondaryId != null ? secondaryId.hashCode() : 0);
            return result;
        }

        @NonNull
        @Override
        public String toString() {
            return "Route{" +
                    "type=" + type +
                    ", targetId='" + targetId + '\'' +
                    ", secondaryId='" + secondaryId + '\'' +
                    '}';
        }
    }

    private DeepLinkRouter() {
        // Utility class
    }

    @Nullable
    public static Route parse(@Nullable String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return null;
        }
        try {
            URI javaUri = URI.create(rawUrl.trim());
            String scheme = javaUri.getScheme();
            String host = javaUri.getHost();
            if (host == null && javaUri.getAuthority() != null) {
                host = javaUri.getAuthority();
            }
            String path = javaUri.getPath();
            List<String> segments = new ArrayList<>();
            if (path != null) {
                String[] parts = path.split("/");
                for (String part : parts) {
                    if (!part.isEmpty()) {
                        segments.add(part);
                    }
                }
            }
            return resolve(scheme, host, segments);
        } catch (Exception e) {
            return null;
        }
    }

    @Nullable
    public static Route parse(@Nullable Uri uri) {
        if (uri == null) {
            return null;
        }
        try {
            return resolve(uri.getScheme(), uri.getHost(), uri.getPathSegments());
        } catch (Exception e) {
            return parse(uri.toString());
        }
    }

    @Nullable
    private static Route resolve(@Nullable String scheme, @Nullable String host, @Nullable List<String> pathSegments) {
        if (scheme == null) {
            return null;
        }

        // Handle custom schemes (e.g. hudhud://program/prog_1 or fmpro://episode/ep_99)
        if ("hudhud".equalsIgnoreCase(scheme) || "fmpro".equalsIgnoreCase(scheme)) {
            if (host != null && !host.isEmpty()) {
                return parseSegmentRoute(host, pathSegments);
            }
        }

        // Handle HTTP / HTTPS App Links (e.g. https://hudhud.fm/program/prog_1)
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            if (pathSegments != null && !pathSegments.isEmpty()) {
                String firstSegment = pathSegments.get(0);
                List<String> remainingSegments = pathSegments.subList(1, pathSegments.size());
                return parseSegmentRoute(firstSegment, remainingSegments);
            }
        }

        return null;
    }

    @Nullable
    private static Route parseSegmentRoute(@NonNull String key, @Nullable List<String> trailingSegments) {
        String lowerKey = key.toLowerCase();
        String primaryId = (trailingSegments != null && !trailingSegments.isEmpty()) ? trailingSegments.get(0) : null;
        String secondaryId = (trailingSegments != null && trailingSegments.size() > 1) ? trailingSegments.get(1) : null;

        switch (lowerKey) {
            case "home":
                return new Route(DestinationType.HOME, null, null);

            case "schedule":
            case "timeline":
                return new Route(DestinationType.SCHEDULE, primaryId, null);

            case "programs":
            case "categories":
                if (primaryId != null && !primaryId.isEmpty()) {
                    return new Route(DestinationType.PROGRAM, primaryId, secondaryId);
                }
                return new Route(DestinationType.PROGRAMS, null, null);

            case "program":
                return new Route(DestinationType.PROGRAM, primaryId, secondaryId);

            case "station":
            case "radio":
                return new Route(DestinationType.STATION, primaryId, null);

            case "episode":
            case "podcast":
                return new Route(DestinationType.EPISODE, primaryId, secondaryId);

            case "live":
            case "stream":
                return new Route(DestinationType.LIVE, primaryId, null);

            case "account":
            case "profile":
                return new Route(DestinationType.ACCOUNT, null, null);

            default:
                return null;
        }
    }
}
