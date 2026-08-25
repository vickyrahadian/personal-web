function formatOverviewDate(value) {
  try { return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
}

async function loadOverview() {
  const loading = document.getElementById('overviewLoading');
  const content = document.getElementById('overviewContent');
  loading.style.display = 'block';
  content.style.display = 'none';
  try {
    const res = await fetch('/api/analytics/overview', { headers: { 'x-admin-password': adminPassword } });
    if (res.status === 401) return signOut();
    if (!res.ok) throw new Error(`Analytics request failed (HTTP ${res.status}).`);
    const data = await res.json();
    const set = (id, value) => { document.getElementById(id).textContent = value; };
    set('overviewVisitorsToday', data.traffic.visitorsToday);
    set('overviewPageViewsToday', data.traffic.pageViewsToday);
    set('overviewVisitors7', data.traffic.visitorsLast7Days);
    set('overviewPageLoad', data.performance.averagePageLoad);
    set('overviewReferrer', data.traffic.topReferrer);
    set('overviewDesktop', data.traffic.deviceBreakdown.desktop || 0);
    set('overviewMobile', data.traffic.deviceBreakdown.mobile || 0);
    set('overviewTablet', data.traffic.deviceBreakdown.tablet || 0);
    set('overviewHealth', data.health.status);
    set('overviewUptime', `${data.health.uptimeSeconds}s`);
    set('overviewMemory', `${data.health.memoryMb} MB`);
    set('overviewNode', data.health.node);
    document.getElementById('recentVisitors').innerHTML = data.recentVisitors.length ? data.recentVisitors.map(visitor => `<li><span>${escapeHtml(visitor.device || 'Unknown')} · ${escapeHtml(visitor.browser || 'Unknown')}</span><span class="overview-muted">${formatOverviewDate(visitor.last_seen)}</span></li>`).join('') : '<li class="overview-muted">No visitor data yet.</li>';
    document.getElementById('recentContacts').innerHTML = data.recentContacts.length ? data.recentContacts.map(contact => `<li><span>${escapeHtml(contact.name)}</span><span class="overview-muted">${formatOverviewDate(contact.timestamp)}</span></li>`).join('') : '<li class="overview-muted">No contact submissions yet.</li>';
    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (error) {
    loading.innerHTML = `<i class="bi bi-exclamation-circle"></i>${escapeHtml(error.message)}`;
  }
}
