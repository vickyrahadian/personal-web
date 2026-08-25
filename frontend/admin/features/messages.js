function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

async function loadMessages() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('tableWrap').style.display = 'none';
  try {
    const res = await fetch('/api/messages', { headers: { 'x-admin-password': adminPassword } });
    if (res.status === 401) return signOut();
    if (!res.ok) throw new Error(`Messages request failed (HTTP ${res.status}).`);
    const messages = await res.json();
    document.getElementById('totalCount').textContent = messages.length;
    document.getElementById('sidebarCount').textContent = messages.length;
    document.getElementById('loadingState').style.display = 'none';
    if (!messages.length) return void (document.getElementById('emptyState').style.display = 'block');
    document.getElementById('tableWrap').style.display = 'block';
    document.getElementById('msgTableBody').innerHTML = messages.map((message, index) => `
      <tr id="row-${index}">
        <td class="msg-date">${formatDate(message.timestamp)}</td>
        <td><strong>${escapeHtml(message.name)}</strong></td>
        <td class="hide-mobile"><a href="mailto:${escapeHtml(message.email)}" style="color:#333;">${escapeHtml(message.email)}</a></td>
        <td><div class="msg-text">${escapeHtml(message.message)}</div></td>
        <td><button class="btn-delete" onclick="deleteMessage(${index}, this)" title="Delete"><i class="bi bi-trash"></i></button></td>
      </tr>`).join('');
  } catch (error) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('emptyState').innerHTML = `<i class="bi bi-exclamation-circle"></i>${escapeHtml(error.message)}`;
  }
}

async function deleteMessage(index, button) {
  if (!confirm('Delete this message?')) return;
  button.disabled = true;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
  try {
    const res = await fetch(`/api/messages/${index}`, { method: 'DELETE', headers: { 'x-admin-password': adminPassword } });
    if (!res.ok) throw new Error('Message could not be deleted.');
    document.getElementById(`row-${index}`).remove();
    const remaining = document.querySelectorAll('#msgTableBody tr').length;
    document.getElementById('totalCount').textContent = remaining;
    document.getElementById('sidebarCount').textContent = remaining;
    if (!remaining) { document.getElementById('tableWrap').style.display = 'none'; document.getElementById('emptyState').style.display = 'block'; }
  } catch {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-trash"></i>';
  }
}
