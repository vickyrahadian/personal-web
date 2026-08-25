async function loadGalleryAdmin() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = '<div class="empty-state">Loading gallery...</div>';
  try {
    const res = await fetch('/api/gallery/admin', { headers: { 'x-admin-password': adminPassword } });
    if (res.status === 401) return signOut();
    if (!res.ok) throw new Error(`Gallery request failed (HTTP ${res.status}).`);
    const photos = await res.json();
    document.getElementById('photoCount').textContent = photos.length;
    if (!photos.length) return void (grid.innerHTML = '<div class="empty-state">No photos yet.</div>');
    grid.innerHTML = photos.map(photo => `
      <article class="gallery-card ${photo.is_active ? '' : 'inactive'}">
        <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt_text)}" />
        <div class="gallery-card-body">
          <h3 class="gallery-card-title">${escapeHtml(photo.title)}</h3>
          <div class="gallery-card-file">${escapeHtml(photo.filename)} · order ${photo.sort_order}${photo.is_active ? '' : ' · hidden'}</div>
          <div class="gallery-card-actions">
            <button type="button" onclick="editPhoto('${photo.id}')"><i class="bi bi-pencil me-1"></i>Edit</button>
            <button type="button" onclick="deletePhoto('${photo.id}')"><i class="bi bi-trash me-1"></i>Delete</button>
          </div>
        </div>
      </article>`).join('');
  } catch (error) {
    grid.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-circle"></i>${escapeHtml(error.message)}</div>`;
  }
}

async function editPhoto(id) {
  const res = await fetch('/api/gallery/admin', { headers: { 'x-admin-password': adminPassword } });
  const photos = await res.json();
  const photo = photos.find(item => item.id === id);
  if (!photo) return;
  const title = prompt('Title:', photo.title); if (title === null) return;
  const description = prompt('Description:', photo.description || ''); if (description === null) return;
  const altText = prompt('Alt text:', photo.alt_text || title); if (altText === null) return;
  const sortOrder = prompt('Sort order:', photo.sort_order); if (sortOrder === null) return;
  const isActive = confirm('Show this photo on the public gallery?');
  await fetch(`/api/gallery/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ title, description, alt_text: altText, sort_order: sortOrder, is_active: isActive }) });
  loadGalleryAdmin();
}

async function deletePhoto(id) {
  if (!confirm('Delete this photo permanently?')) return;
  const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE', headers: { 'x-admin-password': adminPassword } });
  if (res.ok) loadGalleryAdmin();
}

document.getElementById('galleryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const file = document.getElementById('photoFile').files[0];
  const feedback = document.getElementById('galleryFeedback');
  const showError = message => { feedback.textContent = message; feedback.className = 'small mt-2 text-danger'; };
  if (!file) return showError('No photo selected. Please choose an image before uploading.');
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return showError('Unsupported image format.');
  if (file.size > 10 * 1024 * 1024) return showError('File exceeds the 10 MB limit.');
  const fileData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  }).catch(error => { showError(error.message); return null; });
  if (!fileData) return;
  const payload = { filename: file.name, mimeType: file.type, data: fileData, title: document.getElementById('photoTitle').value, description: document.getElementById('photoDescription').value, alt_text: document.getElementById('photoAlt').value, sort_order: document.getElementById('photoOrder').value };
  try {
    const res = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify(payload) });
    const result = await res.json().catch(() => ({}));
    feedback.textContent = res.ok ? 'Photo uploaded successfully.' : (result.error || `Upload failed (HTTP ${res.status}).`);
    feedback.className = `small mt-2 ${res.ok ? 'text-success' : 'text-danger'}`;
    if (res.ok) { event.target.reset(); loadGalleryAdmin(); }
  } catch { showError('Upload failed: server cannot be reached.'); }
});
