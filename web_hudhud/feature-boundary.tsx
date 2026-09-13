import { Component, type ReactNode } from 'react';
// A failed optional chunk or account SDK must not remove guest browsing/player.
export class FeatureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="content-section" role="alert"><p>تعذر فتح هذا القسم. أعد تحميل الصفحة للمحاولة من جديد.</p><button onClick={() => location.reload()}>إعادة تحميل الصفحة</button></section>;
    return this.props.children;
  }
}
