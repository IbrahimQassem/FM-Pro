class DataBatch<T> {
  const DataBatch({
    required this.items,
    required this.rejectedRecords,
    required this.isFromCache,
  });

  final List<T> items;
  final int rejectedRecords;
  final bool isFromCache;
}
