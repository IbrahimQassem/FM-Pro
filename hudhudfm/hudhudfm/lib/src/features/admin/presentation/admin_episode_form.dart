import 'package:flutter/material.dart';

import '../../episodes/domain/date_time_model.dart';
import '../../episodes/domain/episode.dart';
import '../domain/admin_content_service.dart';
import '../domain/admin_media_repository.dart';
import 'admin_media_upload_button.dart';

class AdminEpisodeForm extends StatefulWidget {
  const AdminEpisodeForm({
    super.key,
    required this.contentService,
    required this.mediaRepository,
  });

  final GuardedAdminContentService contentService;
  final AdminMediaRepository mediaRepository;

  @override
  State<AdminEpisodeForm> createState() => _AdminEpisodeFormState();
}

class _AdminEpisodeFormState extends State<AdminEpisodeForm> {
  final _formKey = GlobalKey<FormState>();
  final _episodeIdController = TextEditingController(text: 'episode-1');
  final _radioIdController = TextEditingController(text: 'sanaa-fm');
  final _programIdController = TextEditingController(text: 'morning-sanaa');
  final _nameController = TextEditingController(text: 'حلقة جديدة');
  final _descriptionController = TextEditingController(text: 'وصف الحلقة');
  final _announcerController = TextEditingController(text: 'فريق هدهد');
  final _profileUrlController = TextEditingController(
    text: 'https://example.com/episode.png',
  );
  final _streamUrlController = TextEditingController(
    text: 'https://example.com/episode.mp3',
  );
  final _programNameController = TextEditingController(text: 'صباح هدهد');
  final _scheduleSlots = <_ScheduleSlotControllers>[
    _ScheduleSlotControllers(
      timeStart: '08:00',
      timeEnd: '09:00',
      weekdays: 'SATURDAY,SUNDAY',
    ),
  ];

  bool _isBusy = false;
  bool _isDisabled = false;

  @override
  void dispose() {
    _episodeIdController.dispose();
    _radioIdController.dispose();
    _programIdController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _announcerController.dispose();
    _profileUrlController.dispose();
    _streamUrlController.dispose();
    _programNameController.dispose();
    for (final slot in _scheduleSlots) {
      slot.dispose();
    }
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
                'إدارة حلقة',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              _TextField(
                controller: _episodeIdController,
                label: 'معرف الحلقة',
              ),
              _TextField(controller: _radioIdController, label: 'معرف الإذاعة'),
              _TextField(
                controller: _programIdController,
                label: 'معرف البرنامج',
              ),
              _TextField(controller: _nameController, label: 'اسم الحلقة'),
              _TextField(
                controller: _programNameController,
                label: 'اسم البرنامج',
              ),
              _TextField(controller: _announcerController, label: 'المذيع'),
              _TextField(
                controller: _profileUrlController,
                label: 'رابط صورة الحلقة',
              ),
              AdminMediaUploadButton(
                label: 'رفع صورة الحلقة',
                kind: AdminMediaKind.episodeProfile,
                repository: widget.mediaRepository,
                urlController: _profileUrlController,
                parentIdResolver: () => _episodeIdController.text,
              ),
              const SizedBox(height: 10),
              _TextField(
                controller: _streamUrlController,
                label: 'رابط الحلقة',
              ),
              _TextField(
                controller: _descriptionController,
                label: 'الوصف',
                maxLines: 3,
              ),
              const Divider(height: 24),
              Text('جدول البث', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 10),
              for (var index = 0; index < _scheduleSlots.length; index++)
                _ScheduleSlotFields(
                  slot: _scheduleSlots[index],
                  index: index,
                  canRemove: _scheduleSlots.length > 1,
                  onRemove: () => _removeScheduleSlot(index),
                ),
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: OutlinedButton.icon(
                  onPressed: _addScheduleSlot,
                  icon: const Icon(Icons.add),
                  label: const Text('إضافة موعد'),
                ),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('تعطيل الحلقة'),
                subtitle: const Text('تُحفظ الحلقة لكنها لا تظهر للمستخدمين.'),
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
                      onPressed: _isBusy ? null : _saveEpisode,
                      icon: _isBusy
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save),
                      label: const Text('حفظ الحلقة'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.filledTonal(
                    tooltip: 'حذف الحلقة',
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

  Future<void> _saveEpisode() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isBusy = true);
    try {
      await widget.contentService.saveEpisode(_episodeFromForm());
      if (!mounted) {
        return;
      }
      _showMessage('تم حفظ الحلقة');
    } on Object {
      if (!mounted) {
        return;
      }
      _showMessage('تعذر حفظ الحلقة');
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('حذف الحلقة'),
          content: const Text('هل تريد حذف هذه الحلقة؟'),
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

    if (confirmed != true) {
      return;
    }

    setState(() => _isBusy = true);
    try {
      await widget.contentService.deleteEpisode(
        radioId: _radioIdController.text.trim(),
        episodeId: _episodeIdController.text.trim(),
      );
      if (!mounted) {
        return;
      }
      _showMessage('تم حذف الحلقة');
    } on Object {
      if (!mounted) {
        return;
      }
      _showMessage('تعذر حذف الحلقة');
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  Episode _episodeFromForm() {
    return Episode(
      episodeId: _episodeIdController.text.trim(),
      programId: _programIdController.text.trim(),
      radioId: _radioIdController.text.trim(),
      name: _nameController.text.trim(),
      description: _descriptionController.text.trim(),
      announcer: _announcerController.text.trim(),
      profileUrl: _profileUrlController.text.trim(),
      streamUrl: _streamUrlController.text.trim(),
      programName: _programNameController.text.trim(),
      disabled: _isDisabled,
      schedule: _scheduleSlots
          .map((slot) => slot.toDateTimeModel())
          .toList(growable: false),
    );
  }

  void _addScheduleSlot() {
    setState(() {
      _scheduleSlots.add(
        _ScheduleSlotControllers(timeStart: '10:00', timeEnd: '11:00'),
      );
    });
  }

  void _removeScheduleSlot(int index) {
    if (_scheduleSlots.length == 1) {
      return;
    }

    setState(() {
      _scheduleSlots.removeAt(index).dispose();
    });
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

class _ScheduleSlotFields extends StatelessWidget {
  const _ScheduleSlotFields({
    required this.slot,
    required this.index,
    required this.canRemove,
    required this.onRemove,
  });

  final _ScheduleSlotControllers slot;
  final int index;
  final bool canRemove;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'موعد ${index + 1}',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
              if (canRemove)
                IconButton(
                  tooltip: 'حذف الموعد ${index + 1}',
                  onPressed: onRemove,
                  icon: const Icon(Icons.close),
                ),
            ],
          ),
          _TextField(
            controller: slot.dateStartController,
            label: 'تاريخ البداية ${index + 1}',
            isRequired: false,
          ),
          _TextField(
            controller: slot.dateEndController,
            label: 'تاريخ النهاية ${index + 1}',
            isRequired: false,
          ),
          _TextField(
            controller: slot.timeStartController,
            label: 'وقت البداية ${index + 1}',
          ),
          _TextField(
            controller: slot.timeEndController,
            label: 'وقت النهاية ${index + 1}',
          ),
          _TextField(
            controller: slot.weekdaysController,
            label: 'أيام الأسبوع ${index + 1}',
            helperText: 'مثال: SATURDAY,SUNDAY',
          ),
        ],
      ),
    );
  }
}

class _ScheduleSlotControllers {
  _ScheduleSlotControllers({
    String dateStart = '',
    String dateEnd = '',
    String timeStart = '',
    String timeEnd = '',
    String weekdays = '',
  }) : dateStartController = TextEditingController(text: dateStart),
       dateEndController = TextEditingController(text: dateEnd),
       timeStartController = TextEditingController(text: timeStart),
       timeEndController = TextEditingController(text: timeEnd),
       weekdaysController = TextEditingController(text: weekdays);

  final TextEditingController dateStartController;
  final TextEditingController dateEndController;
  final TextEditingController timeStartController;
  final TextEditingController timeEndController;
  final TextEditingController weekdaysController;

  DateTimeModel toDateTimeModel() {
    return DateTimeModel(
      dateStart: dateStartController.text.trim(),
      dateEnd: dateEndController.text.trim(),
      timeStart: timeStartController.text.trim(),
      timeEnd: timeEndController.text.trim(),
      weekdays: weekdaysController.text
          .split(',')
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList(growable: false),
      asMainTime: true,
    );
  }

  void dispose() {
    dateStartController.dispose();
    dateEndController.dispose();
    timeStartController.dispose();
    timeEndController.dispose();
    weekdaysController.dispose();
  }
}

class _TextField extends StatelessWidget {
  const _TextField({
    required this.controller,
    required this.label,
    this.maxLines = 1,
    this.helperText,
    this.isRequired = true,
  });

  final TextEditingController controller;
  final String label;
  final int maxLines;
  final String? helperText;
  final bool isRequired;

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
          if (!isRequired) {
            return null;
          }

          if (value == null || value.trim().isEmpty) {
            return 'هذا الحقل مطلوب';
          }

          return null;
        },
      ),
    );
  }
}
