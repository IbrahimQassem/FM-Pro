const collectionNames = [
  'locations',
  'stations',
  'banners',
  'users',
  'programs',
  'episodes',
  'comments',
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

  if (errors.length > 0) throw new Error(errors.join('\n'));
  return {
    locations: locations.size,
    stations: stations.size,
    banners: seed.banners.length,
    users: users.size,
    programs: programs.size,
    episodes: episodes.size,
    comments: seed.comments.length,
  };
}

export function buildSeedPlan(seed, { contentOnly = false } = {}) {
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
    entries: contentOnly
      ? contentEntries
      : [...discoveryEntries, ...contentEntries],
    stationCountUpdates,
  };
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
