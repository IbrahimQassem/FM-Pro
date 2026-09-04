import "package:flutter_riverpod/flutter_riverpod.dart";
import "../../data/repositories/onboarding_repository.dart";
import "onboarding_state.dart";

class OnboardingController extends StateNotifier<OnboardingState> {
  OnboardingController(this._repository) : super(const OnboardingState()) {
    _loadStatus();
  }

  final OnboardingRepository _repository;

  Future<void> _loadStatus() async {
    final completed = await _repository.hasCompletedOnboarding();
    state = state.copyWith(isCompleted: completed, isLoading: false);
  }

  void setPage(int page) {
    state = state.copyWith(currentPage: page);
  }

  Future<void> completeOnboarding() async {
    await _repository.completeOnboarding();
    state = state.copyWith(isCompleted: true);
  }

  Future<void> resetOnboarding() async {
    await _repository.resetOnboarding();
    state = state.copyWith(isCompleted: false, currentPage: 0);
  }
}
