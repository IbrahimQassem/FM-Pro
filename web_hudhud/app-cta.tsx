import { Bell, Car, CheckCircle2, Headphones, Radio, Sparkles, Star, Zap } from 'lucide-react';

export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.sana.dev.fm';

export function GooglePlayIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="google-play-icon"
    >
      <path
        d="M3.609 1.814L13.793 12 3.61 22.186A2.296 2.296 0 0 1 3 20.597V3.403c0-.624.225-1.196.609-1.589z"
        fill="#00C3FF"
      />
      <path
        d="M17.18 8.613L13.793 12l3.387 3.387 3.792-2.155c.783-.445.783-1.173 0-1.618l-3.792-2.001z"
        fill="#FFC107"
      />
      <path
        d="M3.609 1.814l10.184 10.186 3.387-3.387L5.753 1.258a2.126 2.126 0 0 0-2.144.556z"
        fill="#00E676"
      />
      <path
        d="M3.61 22.186a2.126 2.126 0 0 0 2.143.556l11.427-7.355-3.387-3.387L3.61 22.186z"
        fill="#FF3D00"
      />
    </svg>
  );
}

export function GooglePlayButton({
  variant = 'default',
  size = 'normal',
  label = 'Google Play',
  sublabel = 'احصل عليه من',
  className = '',
}: {
  variant?: 'default' | 'hero' | 'compact' | 'light';
  size?: 'small' | 'normal' | 'large';
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  return (
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`play-store-badge-btn variant-${variant} size-${size} ${className}`.trim()}
      aria-label="تحميل تطبيق هدهد إف إم من متجر Google Play (يفتح في علامة تبويب جديدة)"
    >
      <GooglePlayIcon size={size === 'large' ? 28 : size === 'small' ? 18 : 22} />
      <span className="badge-text">
        <span className="badge-sub">{sublabel}</span>
        <span className="badge-title">{label}</span>
      </span>
    </a>
  );
}

export function AppCtaSection() {
  return (
    <section className="content-section app-cta-section" id="app-cta" aria-labelledby="app-cta-title">
      <div className="app-cta-card">
        <div className="app-cta-copy">
          <div className="app-cta-eyebrow">
            <Sparkles size={15} />
            <span>رفيقك اليومي · تطبيق هدهد الرسمي</span>
          </div>
          <h2 id="app-cta-title">
            استمع لإذاعات اليمن بلا انقطاع<br />
            <em>في كل وقت وأينما كنت</em>
          </h2>
          <p className="app-cta-desc">
            حمّل تطبيق هدهد إف إم مجاناً على هاتفك بنظام أندرويد، واستمتع بتجربة استماع متكاملة صُممت لترافق يومك بكل سلاسة، في سيارتك، أثناء عملك، وفي أوقات راحتك.
          </p>

          <div className="app-perks-grid">
            <div className="app-perk-item">
              <span className="app-perk-icon" aria-hidden="true">
                <Headphones size={18} />
              </span>
              <div>
                <strong>استماع مستمر في الخلفية</strong>
                <p>واصل الاستماع حتى مع قفل الشاشة أو أثناء تصفح التطبيقات الأخرى.</p>
              </div>
            </div>

            <div className="app-perk-item">
              <span className="app-perk-icon" aria-hidden="true">
                <Car size={18} />
              </span>
              <div>
                <strong>مثالي أثناء القيادة والتنقل</strong>
                <p>واجهة سهلة وسريعة تتيح لك التبديل بين المحطات بلمسة واحدة بكل أمان.</p>
              </div>
            </div>

            <div className="app-perk-item">
              <span className="app-perk-icon" aria-hidden="true">
                <Zap size={18} />
              </span>
              <div>
                <strong>صوت نقي وموفّر للبيانات</strong>
                <p>بث ذكي يتكيف مع شبكة الهاتف ويمنحك أعلى جودة بأقل استهلاك للباقة.</p>
              </div>
            </div>

            <div className="app-perk-item">
              <span className="app-perk-icon" aria-hidden="true">
                <Bell size={18} />
              </span>
              <div>
                <strong>تنبيهات البرامج المباشرة</strong>
                <p>إشعارات ذكية تنبهك بمجرد بدء برامجك وإذاعاتك المفضلة لتكون أول المستمعين.</p>
              </div>
            </div>
          </div>

          <div className="app-cta-actions">
            <GooglePlayButton variant="default" size="large" />
            <div className="app-trust-pills" aria-label="مزايا التطبيق">
              <span className="trust-pill">
                <Star size={13} fill="currentColor" /> تقييم 4.8 للمستمعين
              </span>
              <span className="trust-pill">
                <CheckCircle2 size={13} /> مجاني 100% وبدون اشتراك
              </span>
              <span className="trust-pill">
                <Zap size={13} /> خفيف الحجم وسريع التثبيت
              </span>
            </div>
          </div>
        </div>

        <div className="app-cta-visual" aria-hidden="true">
          <div className="mascot-aura" />
          <img
            className="app-cta-mascot"
            src="/assets/images/mascot/mascot_onboarding.webp"
            alt=""
            width={340}
            height={356}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="cta-chip chip-float-top">
            <Radio size={14} /> كل إذاعات اليمن في جيبك
          </div>
          <div className="cta-chip chip-float-bottom">
            <Headphones size={14} /> بث مباشر نقي وسلس
          </div>
        </div>
      </div>
    </section>
  );
}

export function StationAppBanner() {
  return (
    <div className="station-app-banner" role="complementary" aria-label="تطبيق الهاتف">
      <div className="station-app-banner-icon" aria-hidden="true">
        <Sparkles size={22} />
      </div>
      <div className="station-app-banner-info">
        <strong>استمع في الخلفية وتلقَّ تنبيهات البث المباشر</strong>
        <p>حمّل تطبيق هدهد إف إم على هاتفك لتستمع بدون انقطاع حتى مع قفل الشاشة.</p>
      </div>
      <GooglePlayButton variant="default" size="small" />
    </div>
  );
}
