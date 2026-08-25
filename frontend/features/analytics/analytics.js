(function () {
  const storageId = (storage, key) => {
    try {
      let value = storage.getItem(key);
      if (!value) {
        value = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        storage.setItem(key, value);
      }
      return value;
    } catch { return `anonymous-${Date.now()}`; }
  };

  const visitorId = storageId(localStorage, 'portfolio_visitor_id');
  const sessionId = storageId(sessionStorage, 'portfolio_session_id');
  const detectDevice = () => /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';
  const detectBrowser = () => /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent) ? 'Safari' : /Firefox/i.test(navigator.userAgent) ? 'Firefox' : /Edg/i.test(navigator.userAgent) ? 'Edge' : /Chrome/i.test(navigator.userAgent) ? 'Chrome' : 'Other';
  const detectOs = () => /Mac OS/i.test(navigator.userAgent) ? 'macOS' : /Windows/i.test(navigator.userAgent) ? 'Windows' : /Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' : /Linux/i.test(navigator.userAgent) ? 'Linux' : 'Other';

  window.trackAnalyticsEvent = (event, extra = {}) => {
    const payload = {
      visitor_id: visitorId, session_id: sessionId, event, path: window.location.pathname,
      referrer: document.referrer, device: detectDevice(), browser: detectBrowser(), os: detectOs(),
      language: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen_size: `${window.screen.width}x${window.screen.height}`, ...extra
    };
    fetch('/api/analytics/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
  };

  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const loadTime = navigation ? Math.round(navigation.loadEventEnd || performance.now()) : Math.round(performance.now());
    trackAnalyticsEvent('pageview', { load_time_ms: loadTime });
  }, { once: true });
})();
