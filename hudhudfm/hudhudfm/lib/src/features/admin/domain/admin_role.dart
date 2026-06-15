enum UserRole { user, admin, superAdmin }

class AdminRole {
  const AdminRole({
    required this.userId,
    required this.role,
    this.allowedPermissions = const [],
  });

  factory AdminRole.fromMap(String userId, Map<String, Object?> map) {
    return AdminRole(
      userId: userId,
      role: _roleFromLegacyValue(map['userType']),
      allowedPermissions: _permissionsFromValue(map['allowedPermissions']),
    );
  }

  static const anonymous = AdminRole(userId: '', role: UserRole.user);

  final String userId;
  final UserRole role;
  final List<String> allowedPermissions;

  bool get canSeeAdminTools {
    return role == UserRole.admin || role == UserRole.superAdmin;
  }

  bool get canManageContent {
    return role == UserRole.superAdmin ||
        allowedPermissions.contains('manage_content');
  }
}

UserRole _roleFromLegacyValue(Object? value) {
  final normalized = value?.toString().trim().toLowerCase();
  return switch (normalized) {
    'admin' => UserRole.admin,
    'superadmin' => UserRole.superAdmin,
    'super_admin' => UserRole.superAdmin,
    _ => UserRole.user,
  };
}

List<String> _permissionsFromValue(Object? value) {
  if (value is Iterable) {
    return value.map((item) => item.toString()).toList(growable: false);
  }

  return const [];
}
