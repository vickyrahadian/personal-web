function formatOverviewDate(value) {
  try { return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return value; }
}

function shortVisitorId(value) {
  const id = String(value || 'anonymous');
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}

function renderRecentVisitors(visitors) {
  const body = document.getElementById('recentVisitors');
  if (!visitors.length) {
    body.innerHTML = '<tr><td colspan="7" class="overview-muted text-center py-4">No visitor data yet.</td></tr>';
    return;
  }

  body.innerHTML = visitors.map(visitor => {
    const location = [visitor.city, visitor.country].filter(Boolean).join(', ') || visitor.timezone || 'Unknown';
    const referrer = visitor.last_referrer || 'Direct';
    return `<tr>
      <td class="visitor-date">${escapeHtml(formatOverviewDate(visitor.last_seen))}<span class="visitor-meta">First: ${escapeHtml(formatOverviewDate(visitor.first_seen))}</span></td>
      <td><span class="visitor-id" title="${escapeHtml(visitor.visitor_id)}">${escapeHtml(shortVisitorId(visitor.visitor_id))}</span><details class="visitor-details"><summary>Details</summary><div>IP hash: ${escapeHtml(visitor.ip_hash || 'Unknown')}<br>Session: ${escapeHtml(visitor.last_session_id || 'Unknown')}<br>Event: ${escapeHtml(visitor.last_event || 'Unknown')}</div></details></td>
      <td><span class="visitor-badge">${escapeHtml(visitor.device || 'Unknown')}</span><span class="visitor-meta">${escapeHtml(visitor.screen_size || 'Unknown')}</span></td>
      <td>${escapeHtml(visitor.browser || 'Unknown')}<span class="visitor-meta">${escapeHtml(visitor.os || 'Unknown')}</span></td>
      <td><span class="visitor-value" title="${escapeHtml(location)}">${escapeHtml(location)}</span><span class="visitor-meta">${escapeHtml(visitor.language || 'Unknown')}</span></td>
      <td><span class="visitor-value" title="${escapeHtml(visitor.last_path || '/')}">${escapeHtml(visitor.last_path || '/')}</span></td>
      <td><span class="visitor-value" title="${escapeHtml(referrer)}">${escapeHtml(referrer)}</span></td>
    </tr>`;
  }).join('');
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
    renderRecentVisitors(data.recentVisitors || []);
    document.getElementById('recentContacts').innerHTML = data.recentContacts.length ? data.recentContacts.map(contact => `<li><span>${escapeHtml(contact.name)}</span><span class="overview-muted">${formatOverviewDate(contact.timestamp)}</span></li>`).join('') : '<li class="overview-muted">No contact submissions yet.</li>';
    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (error) {
    loading.innerHTML = `<i class="bi bi-exclamation-circle"></i>${escapeHtml(error.message)}`;
  }
}
