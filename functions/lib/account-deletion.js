export const recentAuthenticationWindowSeconds = 5 * 60;

export function hasRecentAuthentication(
  authTime,
  nowSeconds,
  windowSeconds = recentAuthenticationWindowSeconds,
) {
  return (
    Number.isFinite(authTime) &&
    Number.isFinite(nowSeconds) &&
    authTime <= nowSeconds &&
    nowSeconds - authTime <= windowSeconds
  );
}

export function mergeEpisodeIds(savedIds, commentDocuments) {
  const ids = new Set(
    Array.isArray(savedIds)
      ? savedIds.filter((value) => typeof value === 'string' && value)
      : [],
  );
  for (const document of commentDocuments) {
    const episodeId = document.get('episodeId');
    if (typeof episodeId === 'string' && episodeId) ids.add(episodeId);
  }
  return [...ids].sort();
}
