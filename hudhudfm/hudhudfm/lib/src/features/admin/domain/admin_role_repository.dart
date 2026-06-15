import 'admin_role.dart';

abstract class AdminRoleRepository {
  Future<AdminRole> fetchRole(String userId);
}
