import '../domain/admin_role.dart';
import '../domain/admin_role_repository.dart';

class InMemoryAdminRoleRepository implements AdminRoleRepository {
  const InMemoryAdminRoleRepository({this.role = AdminRole.anonymous});

  final AdminRole role;

  @override
  Future<AdminRole> fetchRole(String userId) async {
    if (role.userId.isEmpty && userId.isNotEmpty) {
      return AdminRole(userId: userId, role: role.role);
    }

    return role;
  }
}
