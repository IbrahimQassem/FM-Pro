// Explicit development fixture. Not imported by the production entry point.
import { createRoot } from 'react-dom/client';
import { PublicHome } from '../public-home';
import { stationFromSnapshot } from '../lib/stations';
import '../styles.css';
const mode = new URLSearchParams(location.search).get('state');
const loadCatalog = async () => {
  if (mode === 'error') throw new Error('Synthetic unavailable catalog');
  if (mode === 'empty') return [];
  return ['صنعاء', 'عدن', 'تعز'].map((city, index) => stationFromSnapshot({
    id: `review-${index}`, data: () => ({ name: `إذاعة ${city} — صوت المجتمع والثقافة`, cityNameAr: city,
      cityCode: `city-${index}`, isActive: true, isFeatured: index === 0, isLive: true,
      description: 'بيانات تجريبية لفحص الواجهة فقط.', streamUrl: '', backupStreamUrl: '', }),
  }));
};
createRoot(document.getElementById('root')!).render(<PublicHome loadCatalog={loadCatalog} />);
