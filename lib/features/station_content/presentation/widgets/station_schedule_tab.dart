import 'package:flutter/material.dart';

import '../../../../l10n/generated/app_localizations.dart';
import '../../domain/models/program_schedule.dart';
import '../../domain/models/station_program.dart';
import '../controllers/station_content_state.dart';

class StationScheduleTab extends StatelessWidget {
  const StationScheduleTab({
    required this.state,
    required this.now,
    required this.onRefresh,
    required this.onWeekdaySelected,
    required this.onProgramPressed,
    super.key,
  });

  final StationContentState state;
  final DateTime now;
  final Future<void> Function() onRefresh;
  final ValueChanged<int> onWeekdaySelected;
  final ValueChanged<StationProgram> onProgramPressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    if (state.isInitialLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.failure == StationContentFailure.load) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 52),
              const SizedBox(height: 12),
              Text(strings.scheduleLoadError, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh_rounded),
                label: Text(strings.retry),
              ),
            ],
          ),
        ),
      );
    }
    final selected = state.resolvedWeekday(now);
    final programs = state.scheduledPrograms(now);
    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(12, 14, 12, 8),
          child: Row(
            children: [
              for (final weekday in const [6, 7, 1, 2, 3, 4, 5]) ...[
                ChoiceChip(
                  label: Text(_weekdayName(strings, weekday)),
                  selected: selected == weekday,
                  onSelected: (_) => onWeekdaySelected(weekday),
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
        Expanded(
          child: programs.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.event_busy_rounded, size: 52),
                        const SizedBox(height: 12),
                        Text(
                          strings.noScheduleForDay,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: onRefresh,
                          icon: const Icon(Icons.refresh_rounded),
                          label: Text(strings.refresh),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.separated(
                  key: const PageStorageKey('station-schedule-tab'),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  itemCount: programs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final program = programs[index];
                    final status = program.schedule!.statusAt(now, selected);
                    return _ScheduleCard(
                      program: program,
                      status: status,
                      onPressed: () => onProgramPressed(program),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  const _ScheduleCard({
    required this.program,
    required this.status,
    required this.onPressed,
  });

  final StationProgram program;
  final ScheduleSlotStatus status;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final isLive = status == ScheduleSlotStatus.live;
    return Card(
      color: isLive ? colors.primaryContainer : null,
      child: ListTile(
        onTap: onPressed,
        minVerticalPadding: 14,
        leading: SizedBox(
          width: 66,
          child: Text(
            _time(context, program.schedule!.startMinute),
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: isLive ? colors.primary : colors.onSurfaceVariant,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        title: Text(
          program.title,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Text(
          '${_time(context, program.schedule!.startMinute)} – '
          '${_time(context, program.schedule!.endMinute)}',
        ),
        trailing: DecoratedBox(
          decoration: BoxDecoration(
            color: isLive ? colors.primary : colors.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
            child: Text(
              _statusLabel(strings, status),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: isLive ? colors.onPrimary : colors.onSurfaceVariant,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _statusLabel(AppLocalizations strings, ScheduleSlotStatus status) {
  return switch (status) {
    ScheduleSlotStatus.live => strings.scheduleLive,
    ScheduleSlotStatus.next => strings.scheduleNext,
    ScheduleSlotStatus.upcoming => strings.scheduleUpcoming,
    ScheduleSlotStatus.ended => strings.scheduleEnded,
  };
}

String _weekdayName(AppLocalizations strings, int weekday) {
  return switch (weekday) {
    DateTime.monday => strings.monday,
    DateTime.tuesday => strings.tuesday,
    DateTime.wednesday => strings.wednesday,
    DateTime.thursday => strings.thursday,
    DateTime.friday => strings.friday,
    DateTime.saturday => strings.saturday,
    DateTime.sunday => strings.sunday,
    _ => '',
  };
}

String _time(BuildContext context, int minuteOfDay) {
  final normalized = minuteOfDay == 1440 ? 0 : minuteOfDay;
  return TimeOfDay(
    hour: normalized ~/ 60,
    minute: normalized % 60,
  ).format(context);
}
