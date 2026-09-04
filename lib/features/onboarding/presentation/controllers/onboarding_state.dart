class OnboardingState {
  const OnboardingState({
    this.isCompleted = false,
    this.isLoading = true,
    this.currentPage = 0,
  });

  final bool isCompleted;
  final bool isLoading;
  final int currentPage;

  OnboardingState copyWith({
    bool? isCompleted,
    bool? isLoading,
    int? currentPage,
  }) {
    return OnboardingState(
      isCompleted: isCompleted ?? this.isCompleted,
      isLoading: isLoading ?? this.isLoading,
      currentPage: currentPage ?? this.currentPage,
    );
  }
}
