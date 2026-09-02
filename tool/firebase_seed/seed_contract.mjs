const collectionNames = [
  'locations',
  'stations',
  'banners',
  'users',
  'programs',
  'episodes',
  'comments',
  'favorites',
  'subscriptions',
];

export function validateSeed(seed, expectedProjectId = 'sanadev-fm') {
  const errors = [];
  if (seed.projectId !== expectedProjectId || seed.root !== 'HudHudDev') {
    errors.push('Seed metadata does not match the Development target.');
  }

  for (const name of collectionNames) {
    if (!Array.isArray(seed[name]) || seed[name].length === 0) {
      errors.push(`${name} must be a non-empty array.`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join('\n'));

  const locations = indexEntries(seed.locations, 'locations', errors);
  const stations = indexEntries(seed.stations, 'stations', errors);
  const users = indexEntries(seed.users, 'users', errors);
  const programs = indexEntries(seed.programs, 'programs', errors);
  const episodes = indexEntries(seed.episodes, 'episodes', errors);
  indexEntries(seed.banners, 'banners', errors);
  indexEntries(seed.comments, 'comments', errors);
  indexEntries(seed.favorites, 'favorites', errors);
  indexEntries(seed.subscriptions, 'subscriptions', errors);

  const locationCityCodes = new Set(
    [...locations.values()].map((entry) => entry.data.cityCode),
  );
  for (const station of stations.values()) {
    if (!locationCityCodes.has(station.data.cityCode)) {
      errors.push(
        `Station ${station.id} references missing city ${station.data.cityCode}.`,
      );
    }
  }

  const programCounts = countBy(seed.programs, (entry) => entry.data.stationId);
  for (const program of programs.values()) {
    if (!stations.has(program.data.stationId)) {
      errors.push(
        `Program ${program.id} references missing station ${program.data.stationId}.`,
      );
    }
  }
  compareCounters(
    stations,
    programCounts,
    'programsCount',
    'station',
    'program',
    errors,
  );

  const episodeCounts = countBy(seed.episodes, (entry) => entry.data.programId);
  for (const episode of episodes.values()) {
    const program = programs.get(episode.data.programId);
    if (!program) {
      errors.push(
        `Episode ${episode.id} references missing program ${episode.data.programId}.`,
      );
    } else if (episode.data.stationId !== program.data.stationId) {
      errors.push(
        `Episode ${episode.id} station does not match program ${program.id}.`,
      );
    }
    requireIsoDate(episode, 'broadcastAt', errors);
    if (episode.data.publishedAt != null) {
      requireIsoDate(episode, 'publishedAt', errors);
    }
  }
  compareCounters(
    programs,
    episodeCounts,
    'episodesCount',
    'program',
    'episode',
    errors,
  );

  const commentCounts = countBy(seed.comments, (entry) => entry.data.episodeId);
  const usedAuthors = new Set();
  for (const comment of seed.comments) {
    const episode = episodes.get(comment.data.episodeId);
    const author = users.get(comment.data.authorId);
    if (!episode) {
      errors.push(
        `Comment ${comment.id} references missing episode ${comment.data.episodeId}.`,
      );
    }
    if (!author) {
      errors.push(
        `Comment ${comment.id} references missing author ${comment.data.authorId}.`,
      );
    } else {
      usedAuthors.add(author.id);
      if (comment.data.authorName !== author.data.displayName) {
        errors.push(`Comment ${comment.id} authorName does not match its user.`);
      }
      if (author.data.isActive !== true || author.data.role !== 'listener') {
        errors.push(`Comment ${comment.id} author is not an active listener.`);
      }
    }
    if (
      typeof comment.data.content !== 'string' ||
      comment.data.content.trim().length === 0 ||
      comment.data.content.trim().length > 1000
    ) {
      errors.push(`Comment ${comment.id} content is invalid.`);
    }
    if (typeof comment.data.isEdited !== 'boolean') {
      errors.push(`Comment ${comment.id} isEdited must be boolean.`);
    }
    if (comment.data.status !== 'published') {
      errors.push(`Comment ${comment.id} status must be published.`);
    }
    requireIsoDate(comment, 'createdAt', errors);
  }
  compareCounters(
    episodes,
    commentCounts,
    'commentsCount',
    'episode',
    'comment',
    errors,
  );
  for (const user of users.values()) {
    if (!usedAuthors.has(user.id)) {
      errors.push(`Demo user ${user.id} is not referenced by a comment.`);
    }
    requireIsoDate(user, 'createdAt', errors);
    requireIsoDate(user, 'updatedAt', errors);
    const allowedKeys = new Set([
      'displayName',
      'username',
      'avatarUrl',
      'isActive',
      'role',
      'createdAt',
      'updatedAt',
    ]);
    if (Object.keys(user.data).some((key) => !allowedKeys.has(key))) {
      errors.push(`Demo user ${user.id} contains a forbidden profile field.`);
    }
    if (
      typeof user.data.displayName !== 'string' ||
      user.data.displayName.trim().length < 2 ||
      typeof user.data.username !== 'string' ||
      typeof user.data.avatarUrl !== 'string' ||
      user.data.isActive !== true ||
      user.data.role !== 'listener'
    ) {
      errors.push(`Demo user ${user.id} profile is invalid.`);
    }
  }

  const targetIndexes = new Map([
    ['station', stations],
    ['program', programs],
    ['episode', episodes],
  ]);
  const engagementUsers = new Set();
  for (const favorite of seed.favorites) {
    validateEngagementOwner(favorite, users, engagementUsers, 'Favorite', errors);
    const targetIndex = targetIndexes.get(favorite.data.targetType);
    if (!targetIndex?.has(favorite.data.targetId)) {
      errors.push(`Favorite ${favorite.id} references a missing target.`);
    }
    if (
      Object.keys(favorite.data).some(
        (key) => !['targetType', 'targetId', 'createdAt'].includes(key),
      )
    ) {
      errors.push(`Favorite ${favorite.id} contains a forbidden field.`);
    }
    requireIsoDate(favorite, 'createdAt', errors);
  }
  for (const subscription of seed.subscriptions) {
    validateEngagementOwner(
      subscription,
      users,
      engagementUsers,
      'Subscription',
      errors,
    );
    const targetIndex =
      subscription.data.targetType === 'station'
        ? stations
        : subscription.data.targetType === 'program'
          ? programs
          : null;
    if (!targetIndex?.has(subscription.data.targetId)) {
      errors.push(`Subscription ${subscription.id} references a missing target.`);
    }
    if (
      typeof subscription.data.notificationsEnabled !== 'boolean' ||
      subscription.data.isActive !== true
    ) {
      errors.push(`Subscription ${subscription.id} flags are invalid.`);
    }
    if (
      Object.keys(subscription.data).some(
        (key) =>
          ![
            'targetType',
            'targetId',
            'notificationsEnabled',
            'isActive',
            'createdAt',
            'updatedAt',
          ].includes(key),
      )
    ) {
      errors.push(`Subscription ${subscription.id} contains a forbidden field.`);
    }
    requireIsoDate(subscription, 'createdAt', errors);
    requireIsoDate(subscription, 'updatedAt', errors);
  }
  for (const user of users.keys()) {
    if (!engagementUsers.has(user)) {
      errors.push(`Demo user ${user} has no favorite or subscription.`);
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'));
  return {
    locations: locations.size,
    stations: stations.size,
    banners: seed.banners.length,
    users: users.size,
    programs: programs.size,
    episodes: episodes.size,
    comments: seed.comments.length,
    favorites: seed.favorites.length,
    subscriptions: seed.subscriptions.length,
  };
}

export function buildSeedPlan(
  seed,
  { contentOnly = false, engagementOnly = false } = {},
) {
  const discoveryEntries = [
    ...seed.locations.map((entry) => documentEntry(
      `${seed.root}/locations/locations/${entry.id}`,
      entry.data,
    )),
    ...seed.stations.map((entry) => documentEntry(
      `${seed.root}/stations/stations/${entry.id}`,
      entry.data,
    )),
    ...seed.banners.map((entry) => documentEntry(
      `${seed.root}/banners/banners/${entry.id}`,
      entry.data,
    )),
  ];
  const engagementEntries = [
    ...seed.favorites.map((entry) => documentEntry(
      `${seed.root}/users/users/${entry.userId}/favorites/${entry.id}`,
      withDates(entry.data, ['createdAt']),
    )),
    ...seed.subscriptions.map((entry) => documentEntry(
      `${seed.root}/users/users/${entry.userId}/subscriptions/${entry.id}`,
      withDates(entry.data, ['createdAt', 'updatedAt']),
    )),
  ];
  const contentEntries = [
    ...seed.users.map((entry) => documentEntry(
      `${seed.root}/users/users/${entry.id}`,
      withDates(entry.data, ['createdAt', 'updatedAt']),
    )),
    ...seed.programs.map((entry) => documentEntry(
      `${seed.root}/programs/programs/${entry.id}`,
      entry.data,
    )),
    ...seed.episodes.map((entry) => documentEntry(
      `${seed.root}/episodes/episodes/${entry.id}`,
      withDates(entry.data, ['broadcastAt', 'publishedAt']),
    )),
    ...seed.comments.map((entry) => documentEntry(
      `${seed.root}/episodes/episodes/${entry.data.episodeId}/comments/${entry.id}`,
      withDates(entry.data, ['createdAt']),
    )),
    ...engagementEntries,
  ];
  const stationCountUpdates = contentOnly
    ? seed.stations.map((station) => ({
        path: `${seed.root}/stations/stations/${station.id}`,
        count: seed.programs.filter(
          (program) => program.data.stationId === station.id,
        ).length,
      }))
    : [];
  return {
    entries: engagementOnly
      ? engagementEntries
      : contentOnly
        ? contentEntries
        : [...discoveryEntries, ...contentEntries],
    stationCountUpdates,
  };
}

function validateEngagementOwner(entry, users, usedUsers, type, errors) {
  if (typeof entry.userId !== 'string' || !users.has(entry.userId)) {
    errors.push(`${type} ${entry.id} references a missing user.`);
    return;
  }
  usedUsers.add(entry.userId);
  if (
    typeof entry.data.targetId !== 'string' ||
    entry.data.targetId.trim().length === 0
  ) {
    errors.push(`${type} ${entry.id} targetId is invalid.`);
  }
}

function indexEntries(entries, name, errors) {
  const index = new Map();
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      entry.id.trim().length === 0 ||
      entry.id.includes('/') ||
      !entry.data ||
      typeof entry.data !== 'object'
    ) {
      errors.push(`${name} contains an invalid entry.`);
      continue;
    }
    if (index.has(entry.id)) {
      errors.push(`${name} contains duplicate ID ${entry.id}.`);
    }
    index.set(entry.id, entry);
  }
  return index;
}

function countBy(entries, selectKey) {
  const counts = new Map();
  for (const entry of entries) {
    const key = selectKey(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function compareCounters(
  index,
  actualCounts,
  key,
  type,
  requiredChildType,
  errors,
) {
  for (const entry of index.values()) {
    const declared = entry.data.stats?.[key];
    const actual = actualCounts.get(entry.id) ?? 0;
    if (actual === 0) {
      errors.push(
        `${type} ${entry.id} must have at least one ${requiredChildType}.`,
      );
    }
    if (declared !== actual) {
      errors.push(
        `${type} ${entry.id} declares ${key}=${declared}; expected ${actual}.`,
      );
    }
  }
}

function requireIsoDate(entry, key, errors) {
  const value = entry.data[key];
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    errors.push(`${entry.id}.${key} must be an ISO date.`);
  }
}

function withDates(data, keys) {
  const converted = { ...data };
  for (const key of keys) {
    if (converted[key] != null) converted[key] = new Date(converted[key]);
  }
  return converted;
}

function documentEntry(path, data) {
  return { path, data };
}
