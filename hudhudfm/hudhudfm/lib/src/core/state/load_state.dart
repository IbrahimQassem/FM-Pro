sealed class LoadState<T> {
  const LoadState();

  bool get isLoading => this is LoadingState<T>;
  bool get hasData => this is DataState<T>;
  bool get hasError => this is ErrorState<T>;
}

class LoadingState<T> extends LoadState<T> {
  const LoadingState();
}

class DataState<T> extends LoadState<T> {
  const DataState(this.value);

  final T value;
}

class EmptyState<T> extends LoadState<T> {
  const EmptyState(this.message);

  final String message;
}

class ErrorState<T> extends LoadState<T> {
  const ErrorState(this.message, [this.cause]);

  final String message;
  final Object? cause;
}
