export type ResourceKey =
  | 'stations'
  | 'programs'
  | 'episodes'
  | 'banners'
  | 'users'
  | 'comments'
  | 'reports'
  | 'favorites'
  | 'subscriptions';

export type ResourceDefinition = {
  key: ResourceKey;
  label: string;
  singular: string;
  path?: string;
  group?: string;
  titleField: string;
  relationField?: string;
  statusField?: string;
  editable: boolean;
  creatable: boolean;
  deletable: boolean;
  template?: Record<string, unknown>;
};

const root = 'HudHudDev';

export const resourceDefinitions: Record<ResourceKey, ResourceDefinition> = {
  stations: {
    key: 'stations',
    label: 'المحطات',
    singular: 'محطة',
    path: `${root}/stations/stations`,
    titleField: 'name',
    relationField: 'cityNameAr',
    statusField: 'isActive',
    editable: true,
    creatable: true,
    deletable: true,
    template: {
      name: '',
      nameEn: '',
      tagline: '',
      description: '',
      streamUrl: 'https://',
      frequency: '',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'sanaa',
      cityNameAr: 'صنعاء',
      priority: 0,
      isLive: true,
      isActive: true,
      isVerified: false,
      isFeatured: false,
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
    },
  },
  programs: {
    key: 'programs',
    label: 'البرامج والجداول',
    singular: 'برنامج',
    path: `${root}/programs/programs`,
    titleField: 'title',
    relationField: 'stationId',
    statusField: 'isActive',
    editable: true,
    creatable: true,
    deletable: true,
    template: {
      stationId: '',
      title: '',
      titleEn: '',
      description: '',
      coverUrl: '',
      thumbnailUrl: '',
      categories: [],
      presenters: [],
      priority: 0,
      isActive: true,
      isFeatured: false,
      schedule: {
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        startMinute: 480,
        endMinute: 540,
        utcOffsetMinutes: 180,
      },
      stats: { episodesCount: 0, subscribersCount: 0, totalPlays: 0 },
    },
  },
  episodes: {
    key: 'episodes',
    label: 'الحلقات',
    singular: 'حلقة',
    path: `${root}/episodes/episodes`,
    titleField: 'title',
    relationField: 'programId',
    statusField: 'isPublished',
    editable: true,
    creatable: true,
    deletable: true,
    template: {
      programId: '',
      stationId: '',
      title: '',
      description: '',
      audioUrl: 'https://',
      durationSeconds: 0,
      coverUrl: '',
      presenter: '',
      guest: '',
      priority: 0,
      isPublished: false,
      isFeatured: false,
      broadcastAt: new Date().toISOString(),
      utcOffsetMinutes: 180,
      publishedAt: null,
      stats: { playsCount: 0, likesCount: 0, commentsCount: 0 },
    },
  },
  banners: {
    key: 'banners',
    label: 'الإعلانات',
    singular: 'إعلان',
    path: `${root}/banners/banners`,
    titleField: 'title',
    relationField: 'targetType',
    statusField: 'isActive',
    editable: true,
    creatable: true,
    deletable: true,
    template: {
      title: '',
      imageUrl: 'https://',
      targetType: 'none',
      targetId: '',
      targetUrl: '',
      priority: 0,
      isActive: true,
      startAt: null,
      expiresAt: null,
    },
  },
  users: {
    key: 'users',
    label: 'المستخدمون',
    singular: 'مستخدم',
    path: `${root}/users/users`,
    titleField: 'displayName',
    relationField: 'role',
    statusField: 'isActive',
    editable: false,
    creatable: false,
    deletable: false,
  },
  comments: {
    key: 'comments',
    label: 'التعليقات',
    singular: 'تعليق',
    group: 'comments',
    titleField: 'content',
    relationField: 'authorName',
    editable: false,
    creatable: false,
    deletable: false,
  },
  reports: {
    key: 'reports',
    label: 'طابور الإشراف',
    singular: 'بلاغ',
    group: 'moderationReports',
    titleField: 'reason',
    relationField: 'commentId',
    statusField: 'status',
    editable: false,
    creatable: false,
    deletable: false,
  },
  favorites: {
    key: 'favorites',
    label: 'المفضلة',
    singular: 'عنصر مفضل',
    group: 'favorites',
    titleField: 'targetId',
    relationField: 'targetType',
    editable: false,
    creatable: false,
    deletable: true,
  },
  subscriptions: {
    key: 'subscriptions',
    label: 'الاشتراكات',
    singular: 'اشتراك',
    group: 'subscriptions',
    titleField: 'targetId',
    relationField: 'targetType',
    statusField: 'isActive',
    editable: false,
    creatable: false,
    deletable: true,
  },
};
