// ==========================================================
// Admin Panel — AVENUE
// ==========================================================
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const API_BASE = window.location.origin;

// ------------------------ initData cache ------------------------
const CACHE_KEY = 'admin_init_data_cache';
function cacheInit(v) {
    if (!v) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v, at: Date.now() })); } catch {}
}
function readCached() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return '';
        const { v, at } = JSON.parse(raw);
        if (!v || Date.now() - at > 23 * 3600 * 1000) return '';
        return v;
    } catch { return ''; }
}
function readHash() {
    try {
        const h = window.location.hash.substring(1);
        if (!h) return '';
        return new URLSearchParams(h).get('tgWebAppData') || '';
    } catch { return ''; }
}
function getInitData() {
    if (tg?.initData && tg.initData.length > 0) {
        cacheInit(tg.initData);
        return tg.initData;
    }
    const h = readHash();
    if (h) { cacheInit(h); return h; }
    const c = readCached();
    if (c) return c;
    const u = tg?.initDataUnsafe?.user;
    if (u?.id) {
        return JSON.stringify({
            id: u.id,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            username: u.username || '',
        });
    }
    return '';
}

// ------------------------ API helpers --------------------------
async function api(path, { method = 'GET', body = null, form = false, query = null } = {}) {
    const initData = getInitData();
    let url = `${API_BASE}${path}`;
    if (method === 'GET' || query) {
        const params = new URLSearchParams(query || {});
        params.set('initData', initData);
        url += (path.includes('?') ? '&' : '?') + params.toString();
    }
    const opts = { method, headers: {} };
    if (method !== 'GET') {
        if (form) {
            form.append('initData', initData);
            opts.body = form;
        } else {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify({ ...(body || {}), initData });
        }
    }
    const res = await fetch(url, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error || `HTTP ${res.status}`);
        e.status = res.status;
        e.reason = err.reason;
        throw e;
    }
    return res.json();
}

function toast(text) {
    const el = document.getElementById('toast');
    document.getElementById('toast-text').textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 2600);
}

function fmtPrice(n) {
    return (Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ', ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
}

// ------------------------ Sidebar / nav ------------------------
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

const VIEW_TITLES = {
    dashboard: 'Dashboard',
    orders: 'Buyurtmalar',
    products: 'Mahsulotlar',
    categories: 'Kategoriyalar',
    users: 'Foydalanuvchilar',
};

function setActiveNav(view) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });
    document.getElementById('topbar-title').textContent = VIEW_TITLES[view] || '';
    if (window.innerWidth <= 800) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

async function loadView(view) {
    setActiveNav(view);
    const content = document.getElementById('content');
    content.innerHTML = '<div class="center-state"><div class="spinner"></div><div class="state-text">Yuklanmoqda...</div></div>';
    try {
        if (view === 'dashboard') await renderDashboard(content);
        else if (view === 'orders') await renderOrders(content);
        else if (view === 'products') await renderProducts(content);
        else if (view === 'categories') await renderCategories(content);
        else if (view === 'users') await renderUsers(content);
    } catch (e) {
        content.innerHTML = `<div class="center-state"><div class="state-icon">⚠️</div><div class="state-text">Xato: ${escapeHtml(e.message)}</div></div>`;
    }
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => loadView(btn.dataset.view));
});

// ------------------------ Dashboard ----------------------------
async function renderDashboard(content) {
    const d = await api('/api/admin/dashboard/');
    const stats = d.orders_by_status;
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-icon bg-yellow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                <div><div class="stat-card-label">Yangi buyurtmalar</div><div class="stat-card-value">${stats.pending || 0}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon bg-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/><path d="M5 13h14"/><path d="M8 9a4 4 0 1 1 8 0"/></svg></div>
                <div><div class="stat-card-label">Tayyorlanmoqda</div><div class="stat-card-value">${stats.preparing || 0}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon bg-purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M15 17.5V9h3l3 4v4.5h-3"/></svg></div>
                <div><div class="stat-card-label">Yo'lda</div><div class="stat-card-value">${stats.delivering || 0}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div><div class="stat-card-label">Yetkazildi</div><div class="stat-card-value">${stats.delivered || 0}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon bg-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
                <div><div class="stat-card-label">Bekor qilindi</div><div class="stat-card-value">${stats.cancelled || 0}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
                <div><div class="stat-card-label">Daromad</div><div class="stat-card-value">${fmtPrice(d.revenue)} UZS</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
                <div><div class="stat-card-label">Mahsulotlar</div><div class="stat-card-value">${d.products_count}</div></div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                <div><div class="stat-card-label">Foydalanuvchilar</div><div class="stat-card-value">${d.users_count}</div></div>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2 class="card-title">So'nggi buyurtmalar</h2></div>
            <div class="card-body">
                <div class="table-wrap">
                    <table class="admin-table">
                        <thead><tr><th>ID</th><th>Sana</th><th>Jami</th><th>Holat</th></tr></thead>
                        <tbody id="recent-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    const tbody = document.getElementById('recent-tbody');
    tbody.innerHTML = (d.recent_orders || []).map(o => `
        <tr style="cursor:pointer" onclick="openOrderDetail(${o.id})">
            <td><b>#${o.id}</b></td>
            <td>${escapeHtml(fmtDate(o.created_at))}</td>
            <td>${fmtPrice(o.total_price)} UZS</td>
            <td><span class="badge status-${o.status}">${escapeHtml(statusLabel(o.status))}</span></td>
        </tr>`).join('') || '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-muted)">Hech qanday buyurtma yo\'q</td></tr>';

    // Active orders badge in sidebar
    const activeCount = (stats.pending || 0) + (stats.accepted || 0) + (stats.preparing || 0) + (stats.delivering || 0);
    const badge = document.getElementById('nav-orders-badge');
    if (activeCount > 0) {
        badge.textContent = activeCount;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function statusLabel(s) {
    return ({
        pending: 'Yangi', accepted: 'Qabul qilindi', preparing: 'Tayyorlanmoqda',
        delivering: 'Yetkazilmoqda', delivered: 'Yetkazildi', cancelled: 'Bekor qilindi',
    })[s] || s;
}

// ------------------------ Orders -------------------------------
let ordersState = { status: '', q: '' };

async function renderOrders(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Buyurtmalar</h2>
                <div class="toolbar">
                    <input class="input-field" id="orders-q" placeholder="Qidirish..." value="${escapeHtml(ordersState.q)}">
                    <select class="select-field" id="orders-status" style="max-width:180px;">
                        <option value="">Barcha holatlar</option>
                        <option value="pending">Yangi</option>
                        <option value="accepted">Qabul qilindi</option>
                        <option value="preparing">Tayyorlanmoqda</option>
                        <option value="delivering">Yetkazilmoqda</option>
                        <option value="delivered">Yetkazildi</option>
                        <option value="cancelled">Bekor qilindi</option>
                    </select>
                </div>
            </div>
            <div class="card-body">
                <div id="orders-list">
                    <div class="center-state"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('orders-status').value = ordersState.status;

    const reload = async () => {
        const query = {};
        if (ordersState.status) query.status = ordersState.status;
        if (ordersState.q) query.q = ordersState.q;
        const data = await api('/api/admin/orders/', { query });
        renderOrdersTable(data.results || []);
    };

    document.getElementById('orders-q').addEventListener('input', e => {
        ordersState.q = e.target.value.trim();
        clearTimeout(window.__ordersQT);
        window.__ordersQT = setTimeout(reload, 320);
    });
    document.getElementById('orders-status').addEventListener('change', e => {
        ordersState.status = e.target.value;
        reload();
    });

    await reload();
}

function renderOrdersTable(orders) {
    const container = document.getElementById('orders-list');
    if (!orders.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">📭</div><div class="state-text">Buyurtmalar yo\'q</div></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Sana</th><th>Manzil</th>
                        <th>Mahsulotlar</th><th>Jami</th><th>Holat</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                    <tr style="cursor:pointer" onclick="openOrderDetail(${o.id})">
                        <td><b>#${o.id}</b></td>
                        <td>${escapeHtml(fmtDate(o.created_at))}</td>
                        <td>${escapeHtml((o.address || '').slice(0, 40))}${(o.address || '').length > 40 ? '…' : ''}</td>
                        <td>${(o.items || []).length} ta</td>
                        <td>${fmtPrice(o.total_price)} UZS</td>
                        <td><span class="badge status-${o.status}">${escapeHtml(statusLabel(o.status))}</span></td>
                        <td class="row-actions"><button class="btn-row-action" onclick="event.stopPropagation(); openOrderDetail(${o.id})">Ko'rish</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

async function openOrderDetail(id) {
    try {
        const o = await api(`/api/admin/orders/${id}/`);
        const u = o.user_detail || {};
        openModal({
            title: `Buyurtma #${o.id}`,
            body: `
                <div class="order-detail">
                    <div class="order-field-row"><span class="lbl">Sana:</span><span class="val">${escapeHtml(fmtDate(o.created_at))}</span></div>
                    <div class="order-field-row"><span class="lbl">Mijoz:</span><span class="val">${escapeHtml((u.first_name || '') + ' ' + (u.last_name || ''))}${u.username ? ' (@' + escapeHtml(u.username) + ')' : ''}</span></div>
                    <div class="order-field-row"><span class="lbl">Telefon:</span><span class="val">${escapeHtml(u.phone || '-')}</span></div>
                    <div class="order-field-row"><span class="lbl">Servis:</span><span class="val">${o.delivery_method === 'pickup' ? 'Olib ketish' : 'Yetkazib berish'}</span></div>
                    <div class="order-field-row"><span class="lbl">Manzil:</span><span class="val">${escapeHtml(o.address || '-')}</span></div>
                    ${o.comment ? `<div class="order-field-row"><span class="lbl">Izoh:</span><span class="val">${escapeHtml(o.comment)}</span></div>` : ''}
                    <div class="order-field-row"><span class="lbl">Jami:</span><span class="val" style="color:var(--brand-green-dark);">${fmtPrice(o.total_price)} UZS</span></div>
                    <div class="order-field-row">
                        <span class="lbl">Holat:</span>
                        <select class="select-field" id="order-status-sel" style="max-width:220px;">
                            <option value="pending"${o.status === 'pending' ? ' selected' : ''}>Yangi</option>
                            <option value="accepted"${o.status === 'accepted' ? ' selected' : ''}>Qabul qilindi</option>
                            <option value="preparing"${o.status === 'preparing' ? ' selected' : ''}>Tayyorlanmoqda</option>
                            <option value="delivering"${o.status === 'delivering' ? ' selected' : ''}>Yetkazilmoqda</option>
                            <option value="delivered"${o.status === 'delivered' ? ' selected' : ''}>Yetkazildi</option>
                            <option value="cancelled"${o.status === 'cancelled' ? ' selected' : ''}>Bekor qilindi</option>
                        </select>
                    </div>

                    <div class="order-items-section">
                        <div style="font-weight:700;margin-bottom:8px;">Mahsulotlar</div>
                        ${(o.items || []).map(it => `
                            <div class="order-item-row">
                                ${it.image ? `<img class="order-item-img" src="${encodeURI(it.image)}" alt="">` : '<div class="order-item-img"></div>'}
                                <div class="order-item-name">${escapeHtml(it.product_name)}</div>
                                <div class="order-item-qty">x${it.quantity}</div>
                                <div class="order-item-price">${fmtPrice(it.subtotal || it.price * it.quantity)} UZS</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
            actions: [
                { label: 'Yopish', class: 'btn-secondary', onClick: closeModal },
                { label: 'Saqlash', class: 'btn-primary', onClick: async () => {
                    const s = document.getElementById('order-status-sel').value;
                    try {
                        await api(`/api/admin/orders/${id}/`, { method: 'PATCH', body: { status: s } });
                        toast('Saqlandi');
                        closeModal();
                        loadView('orders');
                    } catch (e) { toast('Xato: ' + e.message); }
                }},
            ],
        });
    } catch (e) {
        toast('Xato: ' + e.message);
    }
}

// ------------------------ Products -----------------------------
let productsState = { category_id: '', q: '' };
let categoriesCache = null;

async function loadCategoriesCache() {
    if (categoriesCache) return categoriesCache;
    const d = await api('/api/admin/categories/');
    categoriesCache = d.results || [];
    return categoriesCache;
}

async function renderProducts(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Mahsulotlar</h2>
                <div class="toolbar">
                    <input class="input-field" id="prod-q" placeholder="Qidirish...">
                    <select class="select-field" id="prod-cat" style="max-width:200px;"><option value="">Barcha</option></select>
                    <div class="toolbar-spacer"></div>
                    <button class="btn-primary" onclick="openProductForm()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Yangi
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="prod-list"><div class="center-state"><div class="spinner"></div></div></div>
            </div>
        </div>
    `;
    const cats = await loadCategoriesCache();
    const sel = document.getElementById('prod-cat');
    sel.innerHTML = '<option value="">Barcha</option>' + cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    const reload = async () => {
        const query = {};
        if (productsState.category_id) query.category_id = productsState.category_id;
        if (productsState.q) query.q = productsState.q;
        const d = await api('/api/admin/products/', { query });
        renderProductsTable(d.results || []);
    };
    document.getElementById('prod-q').addEventListener('input', e => {
        productsState.q = e.target.value.trim();
        clearTimeout(window.__prodQT);
        window.__prodQT = setTimeout(reload, 320);
    });
    sel.addEventListener('change', e => { productsState.category_id = e.target.value; reload(); });
    await reload();
}

function renderProductsTable(products) {
    const container = document.getElementById('prod-list');
    if (!products.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">🍽️</div><div class="state-text">Mahsulot yo\'q</div></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>Rasm</th><th>Nom</th><th>Kategoriya</th><th>Narx</th><th>Holat</th><th></th></tr></thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td>${p.image ? `<img class="table-img" src="${encodeURI(p.image)}" alt="">` : `<div class="table-img">🍽️</div>`}</td>
                        <td><b>${escapeHtml(p.name)}</b>${p.name_ru ? `<div style="color:var(--text-muted);font-size:12px;">${escapeHtml(p.name_ru)}</div>` : ''}</td>
                        <td>${escapeHtml(p.category_name || '-')}</td>
                        <td>${fmtPrice(p.price)} UZS</td>
                        <td><span class="badge ${p.is_active ? 'bg-green' : 'bg-gray'}">${p.is_active ? 'Faol' : 'Faolsiz'}</span></td>
                        <td class="row-actions">
                            <button class="btn-row-action" onclick='openProductForm(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Tahrirlash</button>
                            <button class="btn-row-action danger" onclick="deleteProduct(${p.id})">O'chirish</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table></div>`;
}

function openProductForm(p) {
    const isEdit = !!p;
    const cats = categoriesCache || [];
    openModal({
        title: isEdit ? `Mahsulotni tahrirlash` : 'Yangi mahsulot',
        body: `
            <form class="form" id="prod-form" onsubmit="return false;">
                <div class="form-row">
                    <div class="image-upload">
                        <div class="image-upload-preview" id="prod-img-preview">
                            ${p?.image ? `<img src="${encodeURI(p.image)}" alt="">` : '🍽️'}
                        </div>
                        <label class="image-upload-label">
                            Rasm tanlash
                            <input type="file" id="prod-img-input" accept="image/*" style="display:none;">
                        </label>
                    </div>
                </div>
                <div class="form-row"><label class="form-label">Kategoriya *</label>
                    <select class="select-field" id="prod-f-cat">
                        ${cats.map(c => `<option value="${c.id}"${p && p.category === c.id ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-two">
                    <div class="form-row"><label class="form-label">Nomi (uz) *</label><input class="input-field" id="prod-f-name" value="${escapeHtml(p?.name || '')}"></div>
                    <div class="form-row"><label class="form-label">Nomi (ru)</label><input class="input-field" id="prod-f-name-ru" value="${escapeHtml(p?.name_ru || '')}"></div>
                </div>
                <div class="form-row"><label class="form-label">Tavsif (uz)</label><textarea class="input-field" id="prod-f-desc">${escapeHtml(p?.description || '')}</textarea></div>
                <div class="form-row"><label class="form-label">Tavsif (ru)</label><textarea class="input-field" id="prod-f-desc-ru">${escapeHtml(p?.description_ru || '')}</textarea></div>
                <div class="form-two">
                    <div class="form-row"><label class="form-label">Narx (UZS) *</label><input type="number" class="input-field" id="prod-f-price" value="${p?.price || ''}"></div>
                    <div class="form-row"><label class="form-label">Faol</label>
                        <label class="switch"><input type="checkbox" id="prod-f-active"${p == null || p.is_active ? ' checked' : ''}><span class="switch-track"></span><span>Faol</span></label>
                    </div>
                </div>
            </form>
        `,
        actions: [
            { label: 'Bekor', class: 'btn-secondary', onClick: closeModal },
            { label: isEdit ? 'Saqlash' : 'Yaratish', class: 'btn-primary', onClick: async () => {
                const fd = new FormData();
                fd.append('category', document.getElementById('prod-f-cat').value);
                fd.append('name', document.getElementById('prod-f-name').value.trim());
                fd.append('name_ru', document.getElementById('prod-f-name-ru').value.trim());
                fd.append('description', document.getElementById('prod-f-desc').value.trim());
                fd.append('description_ru', document.getElementById('prod-f-desc-ru').value.trim());
                fd.append('price', document.getElementById('prod-f-price').value);
                fd.append('is_active', document.getElementById('prod-f-active').checked ? 'true' : 'false');
                const file = document.getElementById('prod-img-input').files[0];
                if (file) fd.append('image', file);
                try {
                    if (isEdit) await api(`/api/admin/products/${p.id}/`, { method: 'PATCH', form: fd });
                    else await api('/api/admin/products/', { method: 'POST', form: fd });
                    toast('Saqlandi');
                    closeModal();
                    loadView('products');
                } catch (e) { toast('Xato: ' + e.message); }
            }},
        ],
    });

    setTimeout(() => {
        const input = document.getElementById('prod-img-input');
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            document.getElementById('prod-img-preview').innerHTML = `<img src="${url}">`;
        });
    }, 50);
}

async function deleteProduct(id) {
    if (!confirm("Mahsulotni o'chirishga ishonchingiz komilmi?")) return;
    try {
        await api(`/api/admin/products/${id}/`, { method: 'DELETE' });
        toast("O'chirildi");
        loadView('products');
    } catch (e) { toast('Xato: ' + e.message); }
}

// ------------------------ Categories ---------------------------
async function renderCategories(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Kategoriyalar</h2>
                <div class="toolbar">
                    <div class="toolbar-spacer"></div>
                    <button class="btn-primary" onclick="openCategoryForm()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Yangi
                    </button>
                </div>
            </div>
            <div class="card-body"><div id="cat-list"><div class="center-state"><div class="spinner"></div></div></div></div>
        </div>
    `;
    categoriesCache = null;
    const cats = await loadCategoriesCache();
    const container = document.getElementById('cat-list');
    if (!cats.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">📂</div><div class="state-text">Kategoriyalar yo\'q</div></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>Rasm</th><th>Nomi</th><th>Mahsulotlar</th><th>Tartib</th><th>Holat</th><th></th></tr></thead>
            <tbody>
                ${cats.map(c => `
                    <tr>
                        <td>${c.image ? `<img class="table-img" src="${encodeURI(c.image)}" alt="">` : `<div class="table-img">📂</div>`}</td>
                        <td><b>${escapeHtml(c.name)}</b>${c.name_ru ? `<div style="color:var(--text-muted);font-size:12px;">${escapeHtml(c.name_ru)}</div>` : ''}</td>
                        <td>${c.products_count || 0}</td>
                        <td>${c.order}</td>
                        <td><span class="badge ${c.is_active ? 'bg-green' : 'bg-gray'}">${c.is_active ? 'Faol' : 'Faolsiz'}</span></td>
                        <td class="row-actions">
                            <button class="btn-row-action" onclick='openCategoryForm(${JSON.stringify(c).replace(/'/g, "&apos;")})'>Tahrirlash</button>
                            <button class="btn-row-action danger" onclick="deleteCategory(${c.id})">O'chirish</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table></div>`;
}

function openCategoryForm(c) {
    const isEdit = !!c;
    openModal({
        title: isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya',
        body: `
            <form class="form" id="cat-form" onsubmit="return false;">
                <div class="form-row">
                    <div class="image-upload">
                        <div class="image-upload-preview" id="cat-img-preview">${c?.image ? `<img src="${encodeURI(c.image)}">` : '📂'}</div>
                        <label class="image-upload-label">
                            Rasm tanlash
                            <input type="file" id="cat-img-input" accept="image/*" style="display:none;">
                        </label>
                    </div>
                </div>
                <div class="form-two">
                    <div class="form-row"><label class="form-label">Nomi (uz) *</label><input class="input-field" id="cat-f-name" value="${escapeHtml(c?.name || '')}"></div>
                    <div class="form-row"><label class="form-label">Nomi (ru)</label><input class="input-field" id="cat-f-name-ru" value="${escapeHtml(c?.name_ru || '')}"></div>
                </div>
                <div class="form-two">
                    <div class="form-row"><label class="form-label">Tartib</label><input type="number" class="input-field" id="cat-f-order" value="${c?.order ?? 0}"></div>
                    <div class="form-row"><label class="form-label">Faol</label>
                        <label class="switch"><input type="checkbox" id="cat-f-active"${c == null || c.is_active ? ' checked' : ''}><span class="switch-track"></span><span>Faol</span></label>
                    </div>
                </div>
            </form>
        `,
        actions: [
            { label: 'Bekor', class: 'btn-secondary', onClick: closeModal },
            { label: isEdit ? 'Saqlash' : 'Yaratish', class: 'btn-primary', onClick: async () => {
                const fd = new FormData();
                fd.append('name', document.getElementById('cat-f-name').value.trim());
                fd.append('name_ru', document.getElementById('cat-f-name-ru').value.trim());
                fd.append('order', document.getElementById('cat-f-order').value || '0');
                fd.append('is_active', document.getElementById('cat-f-active').checked ? 'true' : 'false');
                const file = document.getElementById('cat-img-input').files[0];
                if (file) fd.append('image', file);
                try {
                    if (isEdit) await api(`/api/admin/categories/${c.id}/`, { method: 'PATCH', form: fd });
                    else await api('/api/admin/categories/', { method: 'POST', form: fd });
                    toast('Saqlandi');
                    categoriesCache = null;
                    closeModal();
                    loadView('categories');
                } catch (e) { toast('Xato: ' + e.message); }
            }},
        ],
    });
    setTimeout(() => {
        const input = document.getElementById('cat-img-input');
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            document.getElementById('cat-img-preview').innerHTML = `<img src="${url}">`;
        });
    }, 50);
}

async function deleteCategory(id) {
    if (!confirm("Kategoriyani o'chirishga ishonchingiz komilmi? Mahsulotlari ham o'chadi!")) return;
    try {
        await api(`/api/admin/categories/${id}/`, { method: 'DELETE' });
        categoriesCache = null;
        toast("O'chirildi");
        loadView('categories');
    } catch (e) { toast('Xato: ' + e.message); }
}

// ------------------------ Users --------------------------------
let usersState = { q: '' };

async function renderUsers(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Foydalanuvchilar</h2>
                <div class="toolbar">
                    <input class="input-field" id="users-q" placeholder="Ism, username, telefon, ID..." value="${escapeHtml(usersState.q)}">
                </div>
            </div>
            <div class="card-body"><div id="users-list"><div class="center-state"><div class="spinner"></div></div></div></div>
        </div>
    `;
    const reload = async () => {
        const query = usersState.q ? { q: usersState.q } : {};
        const d = await api('/api/admin/users/', { query });
        renderUsersTable(d.results || []);
    };
    document.getElementById('users-q').addEventListener('input', e => {
        usersState.q = e.target.value.trim();
        clearTimeout(window.__usersQT);
        window.__usersQT = setTimeout(reload, 320);
    });
    await reload();
}

function renderUsersTable(users) {
    const container = document.getElementById('users-list');
    if (!users.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">👥</div><div class="state-text">Foydalanuvchi yo\'q</div></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>ID</th><th>Ism</th><th>Username</th><th>Telefon</th><th>Buyurtmalar</th><th>Til</th><th>Sana</th></tr></thead>
            <tbody>
                ${users.map(u => `
                    <tr>
                        <td><b>${u.telegram_id}</b></td>
                        <td>${escapeHtml((u.first_name || '') + ' ' + (u.last_name || '')).trim() || '-'}</td>
                        <td>${u.username ? '@' + escapeHtml(u.username) : '-'}</td>
                        <td>${escapeHtml(u.phone || '-')}</td>
                        <td>${u.orders_count || 0}</td>
                        <td>${u.language === 'ru' ? '🇷🇺' : '🇺🇿'}</td>
                        <td>${escapeHtml(fmtDate(u.created_at))}</td>
                    </tr>`).join('')}
            </tbody>
        </table></div>`;
}

// ------------------------ Modal --------------------------------
function openModal({ title, body, actions }) {
    const root = document.getElementById('modal-root');
    const actionHtml = (actions || []).map((a, i) => `<button class="${a.class || 'btn-secondary'}" data-action="${i}">${escapeHtml(a.label)}</button>`).join('');
    root.innerHTML = `
        <div class="modal-overlay" id="modal-overlay-inner">
            <div class="modal-box">
                <div class="modal-head">
                    <div class="modal-title">${escapeHtml(title)}</div>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">${body}</div>
                ${actionHtml ? `<div class="modal-foot">${actionHtml}</div>` : ''}
            </div>
        </div>
    `;
    root.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => actions[+btn.dataset.action].onClick());
    });
    document.getElementById('modal-overlay-inner').addEventListener('click', e => {
        if (e.target.id === 'modal-overlay-inner') closeModal();
    });
}
function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
}

// ------------------------ Init / Auth --------------------------
async function init() {
    try {
        const d = await api('/api/admin/dashboard/');
        const u = tg?.initDataUnsafe?.user;
        if (u) document.getElementById('topbar-user').textContent = u.first_name || 'Admin';
        // Render dashboard
        const content = document.getElementById('content');
        await renderDashboardFromData(content, d);
    } catch (e) {
        document.getElementById('auth-gate').style.display = 'flex';
        let msg = e.message || 'Xato';
        if (e.status === 403) {
            if (e.reason && e.reason.startsWith('empty_init_data')) {
                msg = "Telegram ma'lumotlari topilmadi. Ilovani botning \"Admin panel\" tugmasidan qayta oching.";
            } else if (e.reason && e.reason.startsWith('hash_mismatch')) {
                msg = "Telegram imzosi noto'g'ri.";
            } else if (e.reason && e.reason.startsWith('auth_date_expired')) {
                msg = "Sessiya muddati tugadi. Botdan qayta oching.";
            } else if (e.message && e.message.includes('admin huquqlari')) {
                msg = "Sizda admin huquqlari yo'q. Telegram ID sizni admin ro'yxatida emas.";
            } else {
                msg = `Xato: ${e.message}${e.reason ? ' (' + e.reason + ')' : ''}`;
            }
        }
        document.getElementById('auth-text').textContent = msg;
        // Diagnostika uchun: foydalanuvchi ID sini ham ko'rsat
        const u = tg?.initDataUnsafe?.user;
        if (u?.id) {
            const diag = document.createElement('div');
            diag.style.cssText = 'margin-top:14px;font-size:12px;color:var(--text-light);';
            diag.textContent = `Sizning ID: ${u.id}`;
            document.getElementById('auth-text').after(diag);
        }
    }
}

async function renderDashboardFromData(content, d) {
    // reuse renderDashboard by calling it — but data already fetched; to save call, inline:
    await renderDashboard(content);
}

init();
