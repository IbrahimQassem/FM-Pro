import 'package:flutter/material.dart';

import '../../radio/domain/radio_info.dart';
import '../domain/admin_content_service.dart';
import '../domain/admin_media_repository.dart';
import 'admin_media_upload_button.dart';

class AdminRadioForm extends StatefulWidget {
  const AdminRadioForm({
    super.key,
    required this.contentService,
    required this.mediaRepository,
  });

  final GuardedAdminContentService contentService;
  final AdminMediaRepository mediaRepository;

  @override
  State<AdminRadioForm> createState() => _AdminRadioFormState();
}

class _AdminRadioFormState extends State<AdminRadioForm> {
  final _formKey = GlobalKey<FormState>();
  final _radioIdController = TextEditingController(text: 'sanaa-fm');
  final _nameController = TextEditingController(text: 'إذاعة صنعاء');
  final _descriptionController = TextEditingController(text: 'وصف الإذاعة');
  final _streamUrlController = TextEditingController(
    text: 'https://example.com/live.mp3',
  );
  final _logoUrlController = TextEditingController(
    text: 'https://example.com/logo.png',
  );
  final _tagController = TextEditingController(text: '@sanaa_fm');
  final _englishNameController = TextEditingController(text: 'Sanaa FM');
  final _cityController = TextEditingController(text: 'صنعاء');
  final _frequencyController = TextEditingController(text: 'FM 99.9');
  final _priorityController = TextEditingController(text: '1');

  bool _isBusy = false;
  bool _isDisabled = false;

  @override
  void dispose() {
    _radioIdController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _streamUrlController.dispose();
    _logoUrlController.dispose();
    _tagController.dispose();
    _englishNameController.dispose();
    _cityController.dispose();
    _frequencyController.dispose();
    _priorityController.dispose();
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
                'إدارة إذاعة',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              _TextField(controller: _radioIdController, label: 'معرف الإذاعة'),
              _TextField(controller: _nameController, label: 'اسم الإذاعة'),
              _TextField(controller: _streamUrlController, label: 'رابط البث'),
              _TextField(controller: _logoUrlController, label: 'رابط الشعار'),
              AdminMediaUploadButton(
                label: 'رفع شعار الإذاعة',
                kind: AdminMediaKind.radioLogo,
                repository: widget.mediaRepository,
                urlController: _logoUrlController,
                parentIdResolver: () => _radioIdController.text,
              ),
              const SizedBox(height: 10),
              _TextField(controller: _tagController, label: 'وسم الإذاعة'),
              _TextField(
                controller: _englishNameController,
                label: 'الاسم الإنجليزي',
              ),
              _TextField(controller: _cityController, label: 'المدينة'),
              _TextField(controller: _frequencyController, label: 'التردد'),
              _TextField(
                controller: _priorityController,
                label: 'الأولوية',
                keyboardType: TextInputType.number,
              ),
              _TextField(
                controller: _descriptionController,
                label: 'الوصف',
                maxLines: 3,
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('تعطيل الإذاعة'),
                subtitle: const Text('تُحفظ الإذاعة لكنها لا تظهر للمستخدمين.'),
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
                      onPressed: _isBusy ? null : _saveRadio,
                      icon: const Icon(Icons.save),
                      label: const Text('حفظ الإذاعة'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.filledTonal(
                    tooltip: 'حذف الإذاعة',
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

  Future<void> _saveRadio() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isBusy = true);
    try {
      await widget.contentService.saveRadio(_radioFromForm());
      if (mounted) {
        _showMessage('تم حفظ الإذاعة');
      }
    } on Object {
      if (mounted) {
        _showMessage('تعذر حفظ الإذاعة');
      }
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await _confirm(context, 'حذف الإذاعة');
    if (confirmed != true) {
      return;
    }

    setState(() => _isBusy = true);
    try {
      await widget.contentService.deleteRadio(_radioIdController.text.trim());
      if (mounted) {
        _showMessage('تم حذف الإذاعة');
      }
    } on Object {
      if (mounted) {
        _showMessage('تعذر حذف الإذاعة');
      }
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  RadioInfo _radioFromForm() {
    final radioId = _radioIdController.text.trim();

    return RadioInfo(
      id: radioId,
      radioId: radioId,
      name: _nameController.text.trim(),
      description: _descriptionController.text.trim(),
      streamUrl: _streamUrlController.text.trim(),
      logoUrl: _logoUrlController.text.trim(),
      city: _cityController.text.trim(),
      channelFrequency: _frequencyController.text.trim(),
      priority: int.tryParse(_priorityController.text.trim()) ?? 0,
      disabled: _isDisabled,
      tag: _tagController.text.trim(),
      englishName: _englishNameController.text.trim(),
      createdBy: 'admin',
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
    this.keyboardType,
  });

  final TextEditingController controller;
  final String label;
  final int maxLines;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
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
