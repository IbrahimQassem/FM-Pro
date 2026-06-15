import '../domain/radio_info.dart';
import '../domain/radio_repository.dart';

class InMemoryRadioRepository implements RadioRepository {
  @override
  Future<List<RadioInfo>> fetchActiveRadios() async {
    return const [
      RadioInfo(
        id: 'sanaa-fm',
        radioId: 'sanaa-fm',
        name: 'إذاعة صنعاء',
        description: 'بث تجريبي لحين ربط Firestore.',
        streamUrl: 'https://example.com/sanaa.mp3',
        logoUrl: '',
        city: 'صنعاء',
        channelFrequency: 'FM 99.9',
        priority: 1,
        disabled: false,
      ),
      RadioInfo(
        id: 'aden-fm',
        radioId: 'aden-fm',
        name: 'إذاعة عدن',
        description: 'نموذج بيانات يعكس حقول FM-Pro.',
        streamUrl: 'https://example.com/aden.mp3',
        logoUrl: '',
        city: 'عدن',
        channelFrequency: 'FM 88.8',
        priority: 2,
        disabled: false,
      ),
    ];
  }
}
