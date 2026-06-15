import 'package:flutter/material.dart';

import '../../radio/domain/radio_info.dart';
import '../domain/program_repository.dart';
import '../domain/radio_program.dart';

class ProgramsPane extends StatefulWidget {
  const ProgramsPane({
    super.key,
    required this.selectedRadio,
    required this.programRepository,
  });

  final RadioInfo? selectedRadio;
  final ProgramRepository programRepository;

  @override
  State<ProgramsPane> createState() => _ProgramsPaneState();
}

class _ProgramsPaneState extends State<ProgramsPane> {
  Future<List<RadioProgram>>? _programsFuture;

  @override
  void initState() {
    super.initState();
    _loadPrograms();
  }

  @override
  void didUpdateWidget(covariant ProgramsPane oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedRadio?.radioId != widget.selectedRadio?.radioId) {
      _loadPrograms();
    }
  }

  void _loadPrograms() {
    final radio = widget.selectedRadio;
    _programsFuture = radio == null
        ? Future.value(const [])
        : widget.programRepository.fetchPrograms(radio.radioId);
  }

  @override
  Widget build(BuildContext context) {
    final radio = widget.selectedRadio;
    if (radio == null) {
      return const _EmptyPane(
        icon: Icons.library_music,
        title: 'اختر إذاعة',
        message: 'اختر إذاعة أولًا لعرض برامجها.',
      );
    }

    return FutureBuilder<List<RadioProgram>>(
      future: _programsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return _EmptyPane(
            icon: Icons.error_outline,
            title: 'تعذر تحميل البرامج',
            message: 'حدث خطأ أثناء تحميل برامج ${radio.name}.',
          );
        }

        final programs = snapshot.data ?? const [];
        if (programs.isEmpty) {
          return _EmptyPane(
            icon: Icons.library_music,
            title: 'لا توجد برامج',
            message: 'لا توجد برامج متاحة حاليًا لإذاعة ${radio.name}.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: programs.length,
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final program = programs[index];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.library_music),
                title: Text(program.name),
                subtitle: Text(
                  program.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _EmptyPane extends StatelessWidget {
  const _EmptyPane({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: colors.primary),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
