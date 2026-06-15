import 'package:flutter/material.dart';

import '../domain/admin_content_repository.dart';
import '../domain/admin_content_service.dart';
import '../domain/admin_media_repository.dart';
import '../domain/admin_role.dart';
import 'admin_episode_form.dart';
import 'admin_program_form.dart';
import 'admin_radio_form.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({
    super.key,
    required this.role,
    required this.contentRepository,
    required this.mediaRepository,
  });

  final AdminRole role;
  final AdminContentRepository contentRepository;
  final AdminMediaRepository mediaRepository;

  @override
  Widget build(BuildContext context) {
    final contentService = GuardedAdminContentService(
      role: role,
      repository: contentRepository,
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'لوحة الإدارة',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 10),
                Text(
                  'تظهر هذه اللوحة بعد تحميل صلاحية المستخدم من مصدر البيانات.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 12),
                _StatusRow(label: 'نوع المستخدم', value: _roleLabel(role.role)),
                const SizedBox(height: 8),
                _StatusRow(
                  label: 'إدارة المحتوى',
                  value: role.canManageContent ? 'مسموحة' : 'غير مفعلة',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (role.canManageContent) ...[
          AdminRadioForm(
            contentService: contentService,
            mediaRepository: mediaRepository,
          ),
          const SizedBox(height: 16),
          AdminProgramForm(
            contentService: contentService,
            mediaRepository: mediaRepository,
          ),
          const SizedBox(height: 16),
          AdminEpisodeForm(
            contentService: contentService,
            mediaRepository: mediaRepository,
          ),
        ] else
          const _ReadOnlyAdminNotice(),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'حارس الكتابة',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                const Text(
                  'لن تُفعّل عمليات إنشاء أو تعديل أو حذف الإذاعات والبرامج والحلقات قبل وجود قواعد Firestore أو backend يتحقق من الصلاحية.',
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _roleLabel(UserRole role) {
    return switch (role) {
      UserRole.user => 'مستخدم',
      UserRole.admin => 'مشرف',
      UserRole.superAdmin => 'مشرف أعلى',
    };
  }
}

class _ReadOnlyAdminNotice extends StatelessWidget {
  const _ReadOnlyAdminNotice();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              Icons.lock_outline,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'تحتاج صلاحية إدارة المحتوى قبل إظهار نماذج الإنشاء والتعديل.',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 110,
          child: Text(label, style: Theme.of(context).textTheme.labelLarge),
        ),
        Expanded(child: Text(value)),
      ],
    );
  }
}
