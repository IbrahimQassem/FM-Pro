import 'package:flutter/material.dart';

import '../../../app/app_bootstrap.dart';
import '../../account/domain/account_controller.dart';
import '../../account/presentation/account_screen.dart';
import '../../admin/presentation/admin_screen.dart';
import '../../episodes/presentation/episodes_pane.dart';
import '../../player/application/player_controller.dart';
import '../../player/presentation/player_bar.dart';
import '../../programs/presentation/programs_pane.dart';
import '../../radio/domain/radio_info.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.bootstrapData,
    required this.playerController,
  });

  final AppBootstrapData bootstrapData;
  final PlayerController playerController;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  late RadioInfo? _selectedRadio;
  late final AccountController _accountController;

  @override
  void initState() {
    super.initState();
    _selectedRadio = widget.bootstrapData.radios.firstOrNull;
    _accountController = AccountController(
      authSessionRepository: widget.bootstrapData.authSessionRepository,
      initialSession: widget.bootstrapData.authSession,
    );
  }

  @override
  void dispose() {
    _accountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canSeeAdminTools = widget.bootstrapData.adminRole.canSeeAdminTools;
    final selectedIndex = _selectedIndex.clamp(0, canSeeAdminTools ? 4 : 3);

    return Scaffold(
      appBar: AppBar(
        title: const Text('هدهد FM'),
        actions: [
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 12),
            child: Center(
              child: Text(
                widget.bootstrapData.dataSourceLabel,
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: selectedIndex,
        children: [
          _RadioList(
            radios: widget.bootstrapData.radios,
            selectedRadioId: _selectedRadio?.radioId,
            playerController: widget.playerController,
            onRadioSelected: (radio) {
              setState(() => _selectedRadio = radio);
            },
          ),
          ProgramsPane(
            selectedRadio: _selectedRadio,
            programRepository: widget.bootstrapData.programRepository,
          ),
          EpisodesPane(
            selectedRadio: _selectedRadio,
            episodeRepository: widget.bootstrapData.episodeRepository,
          ),
          AccountScreen(
            controller: _accountController,
            remoteConfig: widget.bootstrapData.remoteConfig,
            profileRepository: widget.bootstrapData.userProfileRepository,
          ),
          if (widget.bootstrapData.adminRole.canSeeAdminTools)
            AdminScreen(
              role: widget.bootstrapData.adminRole,
              contentRepository: widget.bootstrapData.adminContentRepository,
              mediaRepository: widget.bootstrapData.adminMediaRepository,
            ),
        ],
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          PlayerBar(controller: widget.playerController),
          NavigationBar(
            selectedIndex: selectedIndex,
            onDestinationSelected: (index) {
              setState(() => _selectedIndex = index);
            },
            destinations: [
              const NavigationDestination(
                icon: Icon(Icons.radio),
                label: 'إذاعات',
              ),
              const NavigationDestination(
                icon: Icon(Icons.library_music),
                label: 'برامج',
              ),
              const NavigationDestination(
                icon: Icon(Icons.podcasts),
                label: 'حلقات',
              ),
              const NavigationDestination(
                icon: Icon(Icons.person),
                label: 'حسابي',
              ),
              if (canSeeAdminTools)
                const NavigationDestination(
                  icon: Icon(Icons.admin_panel_settings),
                  label: 'إدارة',
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RadioList extends StatelessWidget {
  const _RadioList({
    required this.radios,
    required this.selectedRadioId,
    required this.playerController,
    required this.onRadioSelected,
  });

  final List<RadioInfo> radios;
  final String? selectedRadioId;
  final PlayerController playerController;
  final ValueChanged<RadioInfo> onRadioSelected;

  @override
  Widget build(BuildContext context) {
    if (radios.isEmpty) {
      return const _PlaceholderPane(
        icon: Icons.radio,
        title: 'لا توجد إذاعات',
        message: 'لم يتم العثور على إذاعات متاحة حاليًا.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: radios.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final radio = radios[index];

        return _RadioCard(
          radio: radio,
          isSelected: radio.radioId == selectedRadioId,
          onSelected: () => onRadioSelected(radio),
          onPlayPressed: () => playerController.play(radio),
        );
      },
    );
  }
}

class _RadioCard extends StatelessWidget {
  const _RadioCard({
    required this.radio,
    required this.isSelected,
    required this.onSelected,
    required this.onPlayPressed,
  });

  final RadioInfo radio;
  final bool isSelected;
  final VoidCallback onSelected;
  final VoidCallback onPlayPressed;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Card(
      color: isSelected ? colors.primaryContainer : colors.surface,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onSelected,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: colors.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.radio, color: colors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      radio.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${radio.city} · ${radio.channelFrequency}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      radio.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (isSelected) ...[
                Icon(Icons.check_circle, color: colors.primary),
                const SizedBox(width: 8),
              ],
              IconButton.filled(
                tooltip: 'تشغيل ${radio.name}',
                onPressed: radio.canPlay ? onPlayPressed : null,
                icon: const Icon(Icons.play_arrow),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlaceholderPane extends StatelessWidget {
  const _PlaceholderPane({
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
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 56, color: colors.primary),
              const SizedBox(height: 14),
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
