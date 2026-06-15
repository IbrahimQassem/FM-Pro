import 'package:flutter/material.dart';

import '../../programs/domain/radio_program.dart';
import '../domain/admin_content_service.dart';
import '../domain/admin_media_repository.dart';
import 'admin_media_upload_button.dart';

class AdminProgramForm extends StatefulWidget {
  const AdminProgramForm({
    super.key,
    required this.contentService,
    required this.mediaRepository,
  });

  final GuardedAdminContentService contentService;
  final AdminMediaRepository mediaRepository;

  @override
  State<AdminProgramForm> createState() => _AdminProgramFormState();
}

class _AdminProgramFormState extends State<AdminProgramForm> {
  final _formKey = GlobalKey<FormState>();
  final _programIdController = TextEditingController(text: 'morning-sanaa');
  final _radioIdController = TextEditingController(text: 'sanaa-fm');
  final _nameController = TextEditingController(text: 'صباح هدهد');
  final _descriptionController = TextEditingController(text: 'وصف البرنامج');
  final _profileUrlController = TextEditingController(
    text: 'https://example.com/program.png',
  );
  final _tagController = TextEditingController(text: 'morning');
  final _categoriesController = TextEditingController(text: 'أخبار,صباحي');

  bool _isBusy = false;
  bool _isDisabled = false;

  @override
  void dispose() {
    _programIdController.dispose();
    _radioIdController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _profileUrlController.dispose();
    _tagController.dispose();
    _categoriesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'إدارة برنامج',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              _TextField(
                controller: _programIdController,
                label: 'معرف البرنامج',
              ),
              _TextField(controller: _radioIdController, label: 'معرف الإذاعة'),
              _TextField(controller: _nameController, label: 'اسم البرنامج'),
              _TextField(
                controller: _profileUrlController,
                label: 'رابط صورة البرنامج',
              ),
              AdminMediaUploadButton(
                label: 'رفع صورة البرنامج',
                kind: AdminMediaKind.programProfile,
                repository: widget.mediaRepository,
                urlController: _profileUrlController,
                parentIdResolver: () => _programIdController.text,
              ),
              const SizedBox(height: 10),
              _TextField(controller: _tagController, label: 'وسم البرنامج'),
              _TextField(
                controller: _categoriesController,
                label: 'تصنيفات البرنامج',
                helperText: 'افصل التصنيفات بفواصل',
              ),
              _TextField(
                controller: _descriptionController,
                label: 'الوصف',
                maxLines: 3,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('تعطيل البرنامج'),
                subtitle: const Text('يُحفظ البرنامج لكنه لا يظهر للمستخدمين.'),
                value: _isDisabled,
                onChanged: _isBusy
                    ? null
                    : (value) => setState(() => _isDisabled = value),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _isBusy ? null : _saveProgram,
                      icon: const Icon(Icons.save),
                      label: const Text('حفظ البرنامج'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.filledTonal(
                    tooltip: 'حذف البرنامج',
                    onPressed: _isBusy ? null : _confirmDelete,
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _saveProgram() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isBusy = true);
    try {
      await widget.contentService.saveProgram(_programFromForm());
      if (mounted) {
        _showMessage('تم حفظ البرنامج');
      }
    } on Object {
      if (mounted) {
        _showMessage('تعذر حفظ البرنامج');
      }
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await _confirm(context, 'حذف البرنامج');
    if (confirmed != true) {
      return;
    }

    setState(() => _isBusy = true);
    try {
      await widget.contentService.deleteProgram(
        radioId: _radioIdController.text.trim(),
        programId: _programIdController.text.trim(),
      );
      if (mounted) {
        _showMessage('تم حذف البرنامج');
      }
    } on Object {
      if (mounted) {
        _showMessage('تعذر حذف البرنامج');
      }
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  RadioProgram _programFromForm() {
    return RadioProgram(
      programId: _programIdController.text.trim(),
      radioId: _radioIdController.text.trim(),
      name: _nameController.text.trim(),
      description: _descriptionController.text.trim(),
      profileUrl: _profileUrlController.text.trim(),
      disabled: _isDisabled,
      createdBy: 'admin',
      tag: _tagController.text.trim(),
      categoryList: _categoriesController.text
          .split(',')
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList(growable: false),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

class _TextField extends StatelessWidget {
  const _TextField({
    required this.controller,
    required this.label,
    this.maxLines = 1,
    this.helperText,
  });

  final TextEditingController controller;
  final String label;
  final int maxLines;
  final String? helperText;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          helperText: helperText,
          border: const OutlineInputBorder(),
        ),
        validator: (value) {
          if (value == null || value.trim().isEmpty) {
            return 'هذا الحقل مطلوب';
          }

          return null;
        },
      ),
    );
  }
}

Future<bool?> _confirm(BuildContext context, String title) {
  return showDialog<bool>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: Text(title),
        content: const Text('هل تريد تنفيذ عملية الحذف؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('حذف'),
          ),
        ],
      );
    },
  );
}
