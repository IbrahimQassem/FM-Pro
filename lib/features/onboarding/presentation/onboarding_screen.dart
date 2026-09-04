import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../app/providers.dart";
import "../../../core/theme/app_colors.dart";
import "../../../l10n/generated/app_localizations.dart";

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({
    this.isAppTour = false,
    this.onCompleted,
    super.key,
  });

  final bool isAppTour;
  final VoidCallback? onCompleted;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() => _currentPage = index);
    ref.read(onboardingControllerProvider.notifier).setPage(index);
  }

  Future<void> _complete() async {
    if (!widget.isAppTour) {
      await ref.read(onboardingControllerProvider.notifier).completeOnboarding();
    }
    if (widget.onCompleted != null) {
      widget.onCompleted!();
    } else if (widget.isAppTour && mounted) {
      Navigator.of(context).pop();
    }
  }

  void _nextPage() {
    if (_currentPage < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _complete();
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);

    final pages = [
      _OnboardingPageData(
        imageAsset: "assets/images/mascot/mascot_onboarding.webp",
        title: strings.onboardingTitle1,
        subtitle: strings.onboardingSubtitle1,
        badge: strings.appName,
      ),
      _OnboardingPageData(
        imageAsset: "assets/images/mascot/mascot_empty_favorites.webp",
        title: strings.onboardingTitle2,
        subtitle: strings.onboardingSubtitle2,
        badge: strings.favoritesFilter,
      ),
      _OnboardingPageData(
        imageAsset: "assets/images/mascot/mascot_empty_comments.webp",
        title: strings.onboardingTitle3,
        subtitle: strings.onboardingSubtitle3,
        badge: strings.ugcGuidelinesMenu,
      ),
    ];

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: widget.isAppTour
            ? IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
        actions: [
          if (_currentPage < 2 && !widget.isAppTour)
            TextButton(
              key: const Key("onboarding-skip"),
              onPressed: _complete,
              child: Text(
                strings.skip,
                style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: pages.length,
                onPageChanged: _onPageChanged,
                itemBuilder: (context, index) {
                  final page = pages[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          height: 250,
                          alignment: Alignment.center,
                          child: Image.asset(
                            page.imageAsset,
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(height: 28),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            page.badge,
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          page.title,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: theme.colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          page.subtitle,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 16, 28, 28),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      pages.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 8,
                        width: _currentPage == index ? 26 : 8,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? AppColors.primary
                              : AppColors.primary.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton(
                      key: Key(_currentPage == 2 ? "onboarding-start" : "onboarding-next"),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: _nextPage,
                      child: Text(
                        _currentPage == 2
                            ? strings.startListening
                            : strings.next,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPageData {
  const _OnboardingPageData({
    required this.imageAsset,
    required this.title,
    required this.subtitle,
    required this.badge,
  });

  final String imageAsset;
  final String title;
  final String subtitle;
  final String badge;
}
