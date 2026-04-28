// ==========================================================
// Admin Panel — AVENUE (professional)
// ==========================================================
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const API_BASE = window.location.origin;

// ------------------------ Token (primary auth) ------------------
const TOKEN_KEY = 'admin_panel_token';

(function captureToken() {
    try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        if (t) {
            localStorage.setItem(TOKEN_KEY, t);
            params.delete('token');
            const clean = window.location.pathname +
                (params.toString() ? '?' + params.toString() : '') +
                window.location.hash;
            history.replaceState(null, '', clean);
        }
    } catch {}
})();

function getAdminToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

// ------------------------ initData fallback --------------------
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
function readSession() {
    try { return sessionStorage.getItem('__admin_tg_data') || ''; } catch { return ''; }
}
function getInitData() {
    if (tg?.initData && tg.initData.length > 0) { cacheInit(tg.initData); return tg.initData; }
    const h = readHash();
    if (h) { cacheInit(h); return h; }
    const s = readSession();
    if (s) { cacheInit(s); return s; }
    const c = readCached();
    if (c) return c;
    const u = tg?.initDataUnsafe?.user;
    if (u?.id) {
        return JSON.stringify({ id: u.id, first_name: u.first_name || '', last_name: u.last_name || '', username: u.username || '' });
    }
    return '';
}

// ------------------------ API ----------------------------------
async function api(path, { method = 'GET', body = null, form = false, query = null } = {}) {
    const initData = getInitData();
    const token = getAdminToken();
    let url = `${API_BASE}${path}`;
    if (method === 'GET' || query) {
        const params = new URLSearchParams(query || {});
        if (token) params.set('admin_token', token);
        else if (initData) params.set('initData', initData);
        url += (path.includes('?') ? '&' : '?') + params.toString();
    }
    const opts = { method, headers: {} };
    if (token) opts.headers['X-Admin-Token'] = token;
    if (method !== 'GET') {
        if (form) {
            if (token) form.append('admin_token', token);
            else if (initData) form.append('initData', initData);
            opts.body = form;
        } else {
            opts.headers['Content-Type'] = 'application/json';
            const payload = { ...(body || {}) };
            if (token) payload.admin_token = token;
            else if (initData) payload.initData = initData;
            opts.body = JSON.stringify(payload);
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

// ------------------------ Helpers ------------------------------
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
function iconStat(name) {
    const icons = {
        clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        chef: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/><path d="M5 13h14"/><path d="M8 9a4 4 0 1 1 8 0"/></svg>',
        truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M15 17.5V9h3l3 4v4.5h-3"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
        box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
        trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    };
    return icons[name] || '';
}
function statusLabel(s) {
    return ({
        pending: 'Yangi', accepted: 'Qabul qilindi', preparing: 'Tayyorlanmoqda',
        delivering: 'Yetkazilmoqda', delivered: 'Yetkazildi', cancelled: 'Bekor qilindi',
    })[s] || s;
}
function trendPct(now, prev) {
    if (!prev) return now > 0 ? { label: '+∞', cls: 'up' } : null;
    const diff = ((now - prev) / prev) * 100;
    if (Math.abs(diff) < 0.5) return null;
    return { label: `${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`, cls: diff > 0 ? 'up' : 'down' };
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
    admins: 'Adminlar',
    settings: 'Sozlamalar',
};

function setActiveNav(view) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });
    document.getElementById('topbar-title').textContent = VIEW_TITLES[view] || '';
    if (window.innerWidth <= 900) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

async function loadView(view) {
    setActiveNav(view);
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="stats-grid">
            ${[0,1,2,3].map(() => '<div class="skeleton" style="height:100px;"></div>').join('')}
        </div>
        <div class="skeleton" style="height:320px;"></div>
    `;
    try {
        if (view === 'dashboard') await renderDashboard(content);
        else if (view === 'orders') await renderOrders(content);
        else if (view === 'products') await renderProducts(content);
        else if (view === 'categories') await renderCategories(content);
        else if (view === 'users') await renderUsers(content);
        else if (view === 'admins') await renderAdmins(content);
        else if (view === 'settings') await renderSettings(content);
    } catch (e) {
        content.innerHTML = `<div class="center-state"><div class="state-icon">⚠️</div><div class="state-text">Xato: ${escapeHtml(e.message)}</div></div>`;
    }
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => loadView(btn.dataset.view));
});

// ==========================================================
// Dashboard
// ==========================================================
let dashboardChart = null;

async function renderDashboard(content) {
    const d = await api('/api/admin/dashboard/');
    const s = d.orders_by_status || {};

    const ordersTrend = trendPct(d.orders_today, d.orders_yesterday);
    const revenueTrend = trendPct(d.revenue_today, d.revenue_yesterday);

    content.innerHTML = `
        <div class="stats-grid">
            ${statCard('Yangi buyurtmalar', s.pending || 0, 'clock', 'bg-yellow', null)}
            ${statCard('Tayyorlanmoqda', s.preparing || 0, 'chef', 'bg-blue', null)}
            ${statCard("Yo'lda", s.delivering || 0, 'truck', 'bg-purple', null)}
            ${statCard('Yetkazildi', s.delivered || 0, 'check', '', null)}
            ${statCard("Bugun buyurtmalar", d.orders_today || 0, 'box', 'bg-cyan', ordersTrend, `Kecha: ${d.orders_yesterday || 0}`)}
            ${statCard("Bugungi daromad", fmtPrice(d.revenue_today) + ' UZS', 'coin', '', revenueTrend, `Kecha: ${fmtPrice(d.revenue_yesterday)} UZS`)}
            ${statCard("O'rtacha buyurtma", fmtPrice(Math.round(d.avg_order_value || 0)) + ' UZS', 'trend', 'bg-pink', null)}
            ${statCard("Foydalanuvchilar", d.users_count, 'users', 'bg-purple', null)}
        </div>

        <div class="dash-grid">
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Buyurtmalar dinamikasi</div>
                        <div class="card-subtitle">Oxirgi 14 kun</div>
                    </div>
                </div>
                <div class="chart-wrap">
                    <canvas id="orders-chart"></canvas>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Eng ko'p sotilayotganlar</div>
                        <div class="card-subtitle">TOP-5 mahsulot</div>
                    </div>
                </div>
                <div class="top-list" id="top-products"></div>
            </div>
        </div>

        <div class="dash-grid">
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">So'nggi buyurtmalar</div>
                    </div>
                </div>
                <div class="table-wrap">
                    <table class="admin-table">
                        <thead><tr><th>ID</th><th>Sana</th><th>Jami</th><th>Holat</th></tr></thead>
                        <tbody id="recent-tbody"></tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Faol mijozlar</div>
                        <div class="card-subtitle">TOP-5 foydalanuvchi</div>
                    </div>
                </div>
                <div class="top-list" id="top-users"></div>
            </div>
        </div>
    `;

    // Recent orders
    const tbody = document.getElementById('recent-tbody');
    tbody.innerHTML = (d.recent_orders || []).map(o => `
        <tr style="cursor:pointer" onclick="openOrderDetail(${o.id})">
            <td><b>#${o.id}</b></td>
            <td>${escapeHtml(fmtDate(o.created_at))}</td>
            <td><b>${fmtPrice(o.total_price)} UZS</b></td>
            <td><span class="badge status-${o.status}">${escapeHtml(statusLabel(o.status))}</span></td>
        </tr>`).join('') || '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--text-muted)">Hech qanday buyurtma yo\'q</td></tr>';

    // Top products
    document.getElementById('top-products').innerHTML = (d.top_products || []).map((p, i) => `
        <div class="top-item">
            <div class="top-rank">${i + 1}</div>
            <div class="top-main">
                <div class="top-name">${escapeHtml(p.name)}</div>
                <div class="top-meta">${p.ordered} ta sotilgan</div>
            </div>
            <div class="top-value">${fmtPrice(p.revenue)} UZS</div>
        </div>
    `).join('') || '<div class="center-state" style="padding:30px;"><div class="state-text">Ma\'lumot yo\'q</div></div>';

    // Top users
    document.getElementById('top-users').innerHTML = (d.top_users || []).map((u, i) => `
        <div class="top-item">
            <div class="top-rank">${i + 1}</div>
            <div class="top-main">
                <div class="top-name">${escapeHtml(u.name.trim() || u.username || u.telegram_id)}</div>
                <div class="top-meta">${u.orders_count} buyurtma${u.username ? ' · @' + escapeHtml(u.username) : ''}</div>
            </div>
            <div class="top-value">${fmtPrice(u.spent)} UZS</div>
        </div>
    `).join('') || '<div class="center-state" style="padding:30px;"><div class="state-text">Ma\'lumot yo\'q</div></div>';

    // Chart
    drawOrdersChart(d.orders_by_day || []);

    // Active count in sidebar
    const activeCount = (s.pending || 0) + (s.accepted || 0) + (s.preparing || 0) + (s.delivering || 0);
    const badge = document.getElementById('nav-orders-badge');
    if (activeCount > 0) {
        badge.textContent = activeCount;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function statCard(label, value, icon, iconBg, trend, sub) {
    const trendHtml = trend
        ? `<span class="stat-trend ${trend.cls}">${trend.label}</span>`
        : '';
    const subHtml = sub ? `<div class="stat-card-sub">${escapeHtml(sub)}</div>` : '';
    return `
        <div class="stat-card">
            <div class="stat-top">
                <div class="stat-card-icon ${iconBg}">${iconStat(icon)}</div>
                ${trendHtml}
            </div>
            <div class="stat-card-label">${escapeHtml(label)}</div>
            <div class="stat-card-value">${typeof value === 'number' ? value : escapeHtml(value)}</div>
            ${subHtml}
        </div>`;
}

function drawOrdersChart(days) {
    const ctx = document.getElementById('orders-chart');
    if (!ctx || !window.Chart) return;
    if (dashboardChart) dashboardChart.destroy();

    const labels = days.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
    });
    const counts = days.map(d => d.count);
    const revenues = days.map(d => d.revenue);

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(139, 195, 74, 0.28)');
    gradient.addColorStop(1, 'rgba(139, 195, 74, 0)');

    dashboardChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Buyurtmalar soni',
                    data: counts,
                    borderColor: '#2E7D32',
                    backgroundColor: gradient,
                    tension: 0.35,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#2E7D32',
                    borderWidth: 2.5,
                    yAxisID: 'y',
                },
                {
                    label: 'Daromad (UZS)',
                    data: revenues,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                    tension: 0.35,
                    borderDash: [6, 4],
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#8B5CF6',
                    borderWidth: 2,
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 14, usePointStyle: true, font: { size: 12 } } },
                tooltip: {
                    backgroundColor: '#0F172A', titleColor: '#fff', bodyColor: '#E2E8F0',
                    cornerRadius: 10, padding: 12, displayColors: true,
                    callbacks: {
                        label: (ctx) => {
                            const v = ctx.raw;
                            return ctx.dataset.label === 'Daromad (UZS)'
                                ? ` ${fmtPrice(v)} UZS`
                                : ` ${v} ta`;
                        },
                    },
                },
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                y: {
                    position: 'left',
                    beginAtZero: true,
                    ticks: { precision: 0, font: { size: 11 } },
                    grid: { color: 'rgba(15,23,42,0.06)' },
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    ticks: { font: { size: 11 }, callback: (v) => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v },
                    grid: { display: false },
                },
            },
        },
    });
}

// ==========================================================
// Orders
// ==========================================================
let ordersState = { status: '', q: '', date_from: '', date_to: '', page: 1, total_pages: 1, selected: new Set() };

async function renderOrders(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">Buyurtmalar</h2>
                    <div class="card-subtitle" id="orders-total-label">-</div>
                </div>
                <div class="toolbar">
                    <input class="input-field" id="orders-q" placeholder="Qidirish..." value="${escapeHtml(ordersState.q)}">
                    <select class="select-field" id="orders-status">
                        <option value="">Barcha holatlar</option>
                        <option value="pending">Yangi</option>
                        <option value="accepted">Qabul qilindi</option>
                        <option value="preparing">Tayyorlanmoqda</option>
                        <option value="delivering">Yetkazilmoqda</option>
                        <option value="delivered">Yetkazildi</option>
                        <option value="cancelled">Bekor qilindi</option>
                    </select>
                    <input type="date" class="input-field" id="orders-from" style="max-width:160px;">
                    <input type="date" class="input-field" id="orders-to" style="max-width:160px;">
                </div>
            </div>
            <div id="orders-bulk" style="display:none;">
                <div class="bulk-bar">
                    <b id="orders-bulk-count">0</b> tanlandi
                    <div class="bulk-bar-spacer"></div>
                    <select id="orders-bulk-action">
                        <option value="">Amalni tanlang...</option>
                        <option value="pending">Yangi</option>
                        <option value="accepted">Qabul qilindi</option>
                        <option value="preparing">Tayyorlanmoqda</option>
                        <option value="delivering">Yetkazilmoqda</option>
                        <option value="delivered">Yetkazildi</option>
                        <option value="cancelled">Bekor qilindi</option>
                    </select>
                    <button class="btn-primary" id="orders-bulk-go">Bajarish</button>
                    <button class="btn-secondary" id="orders-bulk-clear">Bekor qilish</button>
                </div>
            </div>
            <div class="card-body">
                <div id="orders-list"><div class="center-state"><div class="spinner"></div></div></div>
            </div>
            <div id="orders-pager"></div>
        </div>
    `;
    document.getElementById('orders-status').value = ordersState.status;
    document.getElementById('orders-from').value = ordersState.date_from;
    document.getElementById('orders-to').value = ordersState.date_to;

    const reload = () => fetchOrders();
    document.getElementById('orders-q').addEventListener('input', e => {
        ordersState.q = e.target.value.trim(); ordersState.page = 1;
        clearTimeout(window.__ordersQT);
        window.__ordersQT = setTimeout(reload, 320);
    });
    document.getElementById('orders-status').addEventListener('change', e => {
        ordersState.status = e.target.value; ordersState.page = 1; reload();
    });
    document.getElementById('orders-from').addEventListener('change', e => {
        ordersState.date_from = e.target.value; ordersState.page = 1; reload();
    });
    document.getElementById('orders-to').addEventListener('change', e => {
        ordersState.date_to = e.target.value; ordersState.page = 1; reload();
    });

    document.getElementById('orders-bulk-go').addEventListener('click', bulkUpdateOrders);
    document.getElementById('orders-bulk-clear').addEventListener('click', () => {
        ordersState.selected.clear(); updateBulkBar('orders'); renderOrdersTable(window.__ordersCache || []);
    });

    await fetchOrders();
}

async function fetchOrders() {
    const query = { page: ordersState.page };
    if (ordersState.status) query.status = ordersState.status;
    if (ordersState.q) query.q = ordersState.q;
    if (ordersState.date_from) query.date_from = ordersState.date_from;
    if (ordersState.date_to) query.date_to = ordersState.date_to;
    const data = await api('/api/admin/orders/', { query });
    window.__ordersCache = data.results || [];
    ordersState.total_pages = data.total_pages || 1;
    document.getElementById('orders-total-label').textContent = `Jami: ${data.total || 0} ta`;
    renderOrdersTable(window.__ordersCache);
    renderPager('orders-pager', ordersState.page, ordersState.total_pages, (p) => { ordersState.page = p; fetchOrders(); });
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
                        <th style="width:42px;"><input type="checkbox" class="chk" id="orders-chk-all"></th>
                        <th>ID</th><th>Sana</th><th>Manzil</th>
                        <th>Mahsulotlar</th><th>Jami</th><th>Holat</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                    <tr data-id="${o.id}">
                        <td><input type="checkbox" class="chk order-chk" data-id="${o.id}" ${ordersState.selected.has(o.id) ? 'checked' : ''}></td>
                        <td style="cursor:pointer" onclick="openOrderDetail(${o.id})"><b>#${o.id}</b></td>
                        <td style="cursor:pointer" onclick="openOrderDetail(${o.id})">${escapeHtml(fmtDate(o.created_at))}</td>
                        <td style="cursor:pointer;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onclick="openOrderDetail(${o.id})" title="${escapeHtml(o.address || '')}">${escapeHtml(o.address || '')}</td>
                        <td style="cursor:pointer" onclick="openOrderDetail(${o.id})">${(o.items || []).length} ta</td>
                        <td style="cursor:pointer" onclick="openOrderDetail(${o.id})"><b>${fmtPrice(o.total_price)} UZS</b></td>
                        <td style="cursor:pointer" onclick="openOrderDetail(${o.id})"><span class="badge status-${o.status}">${escapeHtml(statusLabel(o.status))}</span></td>
                        <td class="row-actions"><button class="btn-row-action" onclick="openOrderDetail(${o.id})">Ko'rish</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;

    document.getElementById('orders-chk-all').addEventListener('change', (e) => {
        if (e.target.checked) orders.forEach(o => ordersState.selected.add(o.id));
        else orders.forEach(o => ordersState.selected.delete(o.id));
        renderOrdersTable(orders);
        updateBulkBar('orders');
    });
    container.querySelectorAll('.order-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            const id = parseInt(chk.dataset.id, 10);
            if (chk.checked) ordersState.selected.add(id);
            else ordersState.selected.delete(id);
            updateBulkBar('orders');
        });
    });
    updateBulkBar('orders');
}

function updateBulkBar(view) {
    const state = view === 'orders' ? ordersState : view === 'products' ? productsState : categoriesState;
    const bar = document.getElementById(`${view}-bulk`);
    const cnt = document.getElementById(`${view}-bulk-count`);
    if (!bar || !cnt) return;
    cnt.textContent = state.selected.size;
    bar.style.display = state.selected.size > 0 ? 'block' : 'none';
}

async function bulkUpdateOrders() {
    const action = document.getElementById('orders-bulk-action').value;
    if (!action) { toast("Amalni tanlang"); return; }
    if (!confirm(`${ordersState.selected.size} ta buyurtmaga "${statusLabel(action)}" qilasizmi?`)) return;
    try {
        await api('/api/admin/orders/bulk-status/', { method: 'POST', body: { ids: [...ordersState.selected], status: action } });
        toast('Saqlandi');
        ordersState.selected.clear();
        await fetchOrders();
    } catch (e) { toast('Xato: ' + e.message); }
}

async function openOrderDetail(id) {
    try {
        const o = await api(`/api/admin/orders/${id}/`);
        const u = o.user_detail || {};
        const statusToStep = { pending: 0, accepted: 1, preparing: 1, delivering: 2, delivered: 3, cancelled: -1 };
        const step = statusToStep[o.status] ?? 0;
        const steps = ['Yangi', 'Tayyorlash', "Yo'lda", 'Yetkazildi'];
        const timelineHtml = o.status === 'cancelled'
            ? `<div style="padding:8px 12px;background:#FEE2E2;color:#991B1B;border-radius:10px;font-weight:600;text-align:center;">Bekor qilindi</div>`
            : `<div class="order-timeline">${steps.map((s, i) => `
                <div class="tl-step ${i < step ? 'done' : i === step ? 'active' : ''}">
                    <div class="tl-dot">${i < step ? '✓' : i + 1}</div>
                    <div class="tl-label">${s}</div>
                </div>`).join('')}</div>`;

        openModal({
            title: `Buyurtma #${o.id}`,
            size: 'lg',
            body: `
                <div class="order-detail">
                    ${timelineHtml}
                    <div class="order-field-row"><span class="lbl">Sana</span><span class="val">${escapeHtml(fmtDate(o.created_at))}</span></div>
                    <div class="order-field-row"><span class="lbl">Mijoz</span><span class="val">${escapeHtml((u.first_name || '') + ' ' + (u.last_name || ''))}${u.username ? ' (@' + escapeHtml(u.username) + ')' : ''}</span></div>
                    <div class="order-field-row"><span class="lbl">Telefon</span><span class="val">${escapeHtml(u.phone || '-')}</span></div>
                    <div class="order-field-row"><span class="lbl">Servis</span><span class="val">${o.delivery_method === 'pickup' ? 'Olib ketish' : 'Yetkazib berish'}</span></div>
                    <div class="order-field-row"><span class="lbl">Manzil</span><span class="val">${escapeHtml(o.address || '-')}</span></div>
                    ${o.comment ? `<div class="order-field-row"><span class="lbl">Izoh</span><span class="val">${escapeHtml(o.comment)}</span></div>` : ''}
                    <div class="order-field-row"><span class="lbl">Jami</span><span class="val" style="color:var(--brand-green-dark);font-size:16px;">${fmtPrice(o.total_price)} UZS</span></div>
                    <div class="order-field-row">
                        <span class="lbl">Holat</span>
                        <select class="select-field" id="order-status-sel" style="max-width:240px;">
                            ${['pending','accepted','preparing','delivering','delivered','cancelled']
                                .map(s => `<option value="${s}"${o.status === s ? ' selected' : ''}>${statusLabel(s)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="order-items-section">
                        <div style="font-weight:700;margin-bottom:8px;font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;">Mahsulotlar</div>
                        ${(o.items || []).map(it => `
                            <div class="order-item-row">
                                ${it.image ? `<img class="order-item-img" src="${encodeURI(it.image)}">` : '<div class="order-item-img"></div>'}
                                <div class="order-item-name">${escapeHtml(it.product_name)}</div>
                                <div class="order-item-qty">x${it.quantity}</div>
                                <div class="order-item-price">${fmtPrice(it.subtotal || it.price * it.quantity)} UZS</div>
                            </div>`).join('')}
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
    } catch (e) { toast('Xato: ' + e.message); }
}

// ==========================================================
// Products
// ==========================================================
let productsState = { category_id: '', q: '', is_active: '', ordering: '-created_at', page: 1, total_pages: 1, selected: new Set() };
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
                <div>
                    <h2 class="card-title">Mahsulotlar</h2>
                    <div class="card-subtitle" id="prod-total-label">-</div>
                </div>
                <div class="toolbar">
                    <input class="input-field" id="prod-q" placeholder="Qidirish...">
                    <select class="select-field" id="prod-cat"><option value="">Barcha kategoriyalar</option></select>
                    <select class="select-field" id="prod-active" style="max-width:160px;">
                        <option value="">Hamma</option>
                        <option value="true">Faqat faol</option>
                        <option value="false">Faqat faolsiz</option>
                    </select>
                    <select class="select-field" id="prod-ordering" style="max-width:180px;">
                        <option value="-created_at">Yangi qo'shilgan</option>
                        <option value="created_at">Eski qo'shilgan</option>
                        <option value="name">Nomi (A-Z)</option>
                        <option value="-name">Nomi (Z-A)</option>
                        <option value="price">Narx (arzon)</option>
                        <option value="-price">Narx (qimmat)</option>
                    </select>
                    <div class="toolbar-spacer"></div>
                    <button class="btn-primary" onclick="openProductForm()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Yangi
                    </button>
                </div>
            </div>
            <div id="products-bulk" style="display:none;">
                <div class="bulk-bar">
                    <b id="products-bulk-count">0</b> tanlandi
                    <div class="bulk-bar-spacer"></div>
                    <button class="btn-secondary" onclick="bulkProducts('activate')">Faollashtirish</button>
                    <button class="btn-secondary" onclick="bulkProducts('deactivate')">Faolsizlantirish</button>
                    ${isSuperAdmin() ? `<button class="btn-danger" onclick="bulkProducts('delete')">O'chirish</button>` : ''}
                    <button class="btn-secondary" onclick="productsState.selected.clear(); renderProductsTable(window.__prodCache||[]);">Bekor</button>
                </div>
            </div>
            <div class="card-body">
                <div id="prod-list"><div class="center-state"><div class="spinner"></div></div></div>
            </div>
            <div id="prod-pager"></div>
        </div>
    `;
    const cats = await loadCategoriesCache();
    const sel = document.getElementById('prod-cat');
    sel.innerHTML = '<option value="">Barcha kategoriyalar</option>' + cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    const reload = () => fetchProducts();
    document.getElementById('prod-q').addEventListener('input', e => {
        productsState.q = e.target.value.trim(); productsState.page = 1;
        clearTimeout(window.__prodQT);
        window.__prodQT = setTimeout(reload, 320);
    });
    sel.addEventListener('change', e => { productsState.category_id = e.target.value; productsState.page = 1; reload(); });
    document.getElementById('prod-active').addEventListener('change', e => { productsState.is_active = e.target.value; productsState.page = 1; reload(); });
    document.getElementById('prod-ordering').addEventListener('change', e => { productsState.ordering = e.target.value; productsState.page = 1; reload(); });

    await fetchProducts();
}

async function fetchProducts() {
    const query = { page: productsState.page, ordering: productsState.ordering };
    if (productsState.category_id) query.category_id = productsState.category_id;
    if (productsState.q) query.q = productsState.q;
    if (productsState.is_active) query.is_active = productsState.is_active;
    const d = await api('/api/admin/products/', { query });
    window.__prodCache = d.results || [];
    productsState.total_pages = d.total_pages || 1;
    document.getElementById('prod-total-label').textContent = `Jami: ${d.total || 0} ta`;
    renderProductsTable(window.__prodCache);
    renderPager('prod-pager', productsState.page, productsState.total_pages, (p) => { productsState.page = p; fetchProducts(); });
}

function renderProductsTable(products) {
    const container = document.getElementById('prod-list');
    if (!products.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">🍽️</div><div class="state-text">Mahsulot yo\'q</div></div>';
        updateBulkBar('products');
        return;
    }
    container.innerHTML = `
        <div class="table-wrap"><table class="admin-table">
            <thead><tr>
                <th style="width:42px;"><input type="checkbox" class="chk" id="prod-chk-all"></th>
                <th>Rasm</th><th>Nom</th><th>Kategoriya</th><th>Narx</th><th>Holat</th><th></th>
            </tr></thead>
            <tbody>
                ${products.map(p => `
                    <tr data-id="${p.id}">
                        <td><input type="checkbox" class="chk prod-chk" data-id="${p.id}" ${productsState.selected.has(p.id) ? 'checked' : ''}></td>
                        <td>${p.image ? `<img class="table-img" src="${encodeURI(p.image)}">` : `<div class="table-img">🍽️</div>`}</td>
                        <td><b>${escapeHtml(p.name)}</b>${p.name_ru ? `<div style="color:var(--text-muted);font-size:12px;">${escapeHtml(p.name_ru)}</div>` : ''}</td>
                        <td>${escapeHtml(p.category_name || '-')}</td>
                        <td><b>${fmtPrice(p.price)} UZS</b></td>
                        <td><span class="badge ${p.is_active ? 'bg-green' : 'bg-gray'}">${p.is_active ? 'Faol' : 'Faolsiz'}</span></td>
                        <td class="row-actions">
                            <button class="btn-row-action" data-action="edit" data-pid="${p.id}">Tahrirlash</button>
                            ${isSuperAdmin() ? `<button class="btn-row-action danger" onclick="deleteProduct(${p.id})">O'chirish</button>` : ''}
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table></div>`;

    document.getElementById('prod-chk-all').addEventListener('change', (e) => {
        if (e.target.checked) products.forEach(p => productsState.selected.add(p.id));
        else products.forEach(p => productsState.selected.delete(p.id));
        renderProductsTable(products);
        updateBulkBar('products');
    });
    container.querySelectorAll('.prod-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            const id = parseInt(chk.dataset.id, 10);
            if (chk.checked) productsState.selected.add(id); else productsState.selected.delete(id);
            updateBulkBar('products');
        });
    });
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = products.find(x => x.id == btn.dataset.pid);
            if (p) openProductForm(p);
        });
    });
    updateBulkBar('products');
}

async function bulkProducts(action) {
    if (!productsState.selected.size) return;
    const labels = { activate: 'Faollashtirasizmi', deactivate: 'Faolsizlantirasizmi', delete: "O'chirasizmi" };
    if (!confirm(`${productsState.selected.size} ta mahsulotni ${labels[action]}?`)) return;
    try {
        await api('/api/admin/products/bulk/', { method: 'POST', body: { ids: [...productsState.selected], action } });
        toast('Saqlandi');
        productsState.selected.clear();
        await fetchProducts();
    } catch (e) { toast('Xato: ' + e.message); }
}

function openProductForm(p) {
    const isEdit = !!p;
    const cats = categoriesCache || [];
    openModal({
        title: isEdit ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot',
        body: `
            <form class="form" id="prod-form" onsubmit="return false;">
                <div class="form-row">
                    <div class="image-upload">
                        <div class="image-upload-preview" id="prod-img-preview">
                            ${p?.image ? `<img src="${encodeURI(p.image)}">` : '🍽️'}
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
                    <div class="form-row" style="padding-top:22px;">
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
                    await fetchProducts();
                } catch (e) { toast('Xato: ' + e.message); }
            }},
        ],
    });
    setTimeout(() => {
        const input = document.getElementById('prod-img-input');
        input?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('prod-img-preview').innerHTML = `<img src="${URL.createObjectURL(file)}">`;
        });
    }, 50);
}

async function deleteProduct(id) {
    if (!confirm("Mahsulotni o'chirasizmi?")) return;
    try {
        await api(`/api/admin/products/${id}/`, { method: 'DELETE' });
        toast("O'chirildi");
        await fetchProducts();
    } catch (e) { toast('Xato: ' + e.message); }
}

// ==========================================================
// Categories
// ==========================================================
let categoriesState = { selected: new Set() };

async function renderCategories(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div><h2 class="card-title">Kategoriyalar</h2></div>
                <div class="toolbar">
                    <div class="toolbar-spacer"></div>
                    <button class="btn-primary" onclick="openCategoryForm()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Yangi
                    </button>
                </div>
            </div>
            <div id="categories-bulk" style="display:none;">
                <div class="bulk-bar">
                    <b id="categories-bulk-count">0</b> tanlandi
                    <div class="bulk-bar-spacer"></div>
                    <button class="btn-secondary" onclick="bulkCategories('activate')">Faollashtirish</button>
                    <button class="btn-secondary" onclick="bulkCategories('deactivate')">Faolsizlantirish</button>
                    ${isSuperAdmin() ? `<button class="btn-danger" onclick="bulkCategories('delete')">O'chirish</button>` : ''}
                    <button class="btn-secondary" onclick="categoriesState.selected.clear(); renderCategoriesTable(categoriesCache||[]);">Bekor</button>
                </div>
            </div>
            <div class="card-body"><div id="cat-list"><div class="center-state"><div class="spinner"></div></div></div></div>
        </div>
    `;
    categoriesCache = null;
    const cats = await loadCategoriesCache();
    renderCategoriesTable(cats);
}

function renderCategoriesTable(cats) {
    const container = document.getElementById('cat-list');
    if (!cats.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">📂</div><div class="state-text">Kategoriyalar yo\'q</div></div>';
        updateBulkBar('categories');
        return;
    }
    container.innerHTML = `
        <div class="table-wrap"><table class="admin-table">
            <thead><tr>
                <th style="width:42px;"><input type="checkbox" class="chk" id="cat-chk-all"></th>
                <th>Rasm</th><th>Nomi</th><th>Mahsulotlar</th><th>Tartib</th><th>Holat</th><th></th>
            </tr></thead>
            <tbody>
                ${cats.map(c => `
                    <tr data-id="${c.id}">
                        <td><input type="checkbox" class="chk cat-chk" data-id="${c.id}" ${categoriesState.selected.has(c.id) ? 'checked' : ''}></td>
                        <td>${c.image ? `<img class="table-img" src="${encodeURI(c.image)}">` : `<div class="table-img">📂</div>`}</td>
                        <td><b>${escapeHtml(c.name)}</b>${c.name_ru ? `<div style="color:var(--text-muted);font-size:12px;">${escapeHtml(c.name_ru)}</div>` : ''}</td>
                        <td>${c.products_count || 0}</td>
                        <td>${c.order}</td>
                        <td><span class="badge ${c.is_active ? 'bg-green' : 'bg-gray'}">${c.is_active ? 'Faol' : 'Faolsiz'}</span></td>
                        <td class="row-actions">
                            <button class="btn-row-action" data-action="edit" data-cid="${c.id}">Tahrirlash</button>
                            ${isSuperAdmin() ? `<button class="btn-row-action danger" onclick="deleteCategory(${c.id})">O'chirish</button>` : ''}
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table></div>`;
    document.getElementById('cat-chk-all').addEventListener('change', (e) => {
        if (e.target.checked) cats.forEach(c => categoriesState.selected.add(c.id));
        else cats.forEach(c => categoriesState.selected.delete(c.id));
        renderCategoriesTable(cats);
        updateBulkBar('categories');
    });
    container.querySelectorAll('.cat-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            const id = parseInt(chk.dataset.id, 10);
            if (chk.checked) categoriesState.selected.add(id); else categoriesState.selected.delete(id);
            updateBulkBar('categories');
        });
    });
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = cats.find(x => x.id == btn.dataset.cid);
            if (c) openCategoryForm(c);
        });
    });
    updateBulkBar('categories');
}

async function bulkCategories(action) {
    if (!categoriesState.selected.size) return;
    const labels = { activate: 'Faollashtirasizmi', deactivate: 'Faolsizlantirasizmi', delete: "O'chirasizmi (mahsulotlari ham o'chadi)" };
    if (!confirm(`${categoriesState.selected.size} ta kategoriyani ${labels[action]}?`)) return;
    try {
        await api('/api/admin/categories/bulk/', { method: 'POST', body: { ids: [...categoriesState.selected], action } });
        toast('Saqlandi');
        categoriesState.selected.clear();
        categoriesCache = null;
        const cats = await loadCategoriesCache();
        renderCategoriesTable(cats);
    } catch (e) { toast('Xato: ' + e.message); }
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
                    <div class="form-row" style="padding-top:22px;">
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
                    const cats = await loadCategoriesCache();
                    renderCategoriesTable(cats);
                } catch (e) { toast('Xato: ' + e.message); }
            }},
        ],
    });
    setTimeout(() => {
        const input = document.getElementById('cat-img-input');
        input?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('cat-img-preview').innerHTML = `<img src="${URL.createObjectURL(file)}">`;
        });
    }, 50);
}

async function deleteCategory(id) {
    if (!confirm("Kategoriyani o'chirasizmi? (mahsulotlari ham o'chadi)")) return;
    try {
        await api(`/api/admin/categories/${id}/`, { method: 'DELETE' });
        categoriesCache = null;
        toast("O'chirildi");
        const cats = await loadCategoriesCache();
        renderCategoriesTable(cats);
    } catch (e) { toast('Xato: ' + e.message); }
}

// ==========================================================
// Users
// ==========================================================
let usersState = { q: '', page: 1, total_pages: 1 };

async function renderUsers(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">Foydalanuvchilar</h2>
                    <div class="card-subtitle" id="users-total-label">-</div>
                </div>
                <div class="toolbar">
                    <input class="input-field" id="users-q" placeholder="Ism, username, telefon, ID..." value="${escapeHtml(usersState.q)}">
                </div>
            </div>
            <div class="card-body"><div id="users-list"><div class="center-state"><div class="spinner"></div></div></div></div>
            <div id="users-pager"></div>
        </div>
    `;
    document.getElementById('users-q').addEventListener('input', e => {
        usersState.q = e.target.value.trim(); usersState.page = 1;
        clearTimeout(window.__usersQT);
        window.__usersQT = setTimeout(fetchUsers, 320);
    });
    await fetchUsers();
}

async function fetchUsers() {
    const query = { page: usersState.page };
    if (usersState.q) query.q = usersState.q;
    const d = await api('/api/admin/users/', { query });
    usersState.total_pages = d.total_pages || 1;
    document.getElementById('users-total-label').textContent = `Jami: ${d.total || 0} ta`;
    renderUsersTable(d.results || []);
    renderPager('users-pager', usersState.page, usersState.total_pages, (p) => { usersState.page = p; fetchUsers(); });
}

function renderUsersTable(users) {
    const container = document.getElementById('users-list');
    if (!users.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">👥</div><div class="state-text">Foydalanuvchi yo\'q</div></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>ID</th><th>Ism</th><th>Username</th><th>Telefon</th><th>Buyurtmalar</th><th>Sarflagan</th><th>Til</th><th>Sana</th><th></th></tr></thead>
            <tbody>
                ${users.map(u => `
                    <tr style="cursor:pointer" onclick="openUserDetail(${u.id})">
                        <td><b>${u.telegram_id}</b></td>
                        <td>${escapeHtml((u.first_name || '') + ' ' + (u.last_name || '')).trim() || '-'}</td>
                        <td>${u.username ? '@' + escapeHtml(u.username) : '-'}</td>
                        <td>${escapeHtml(u.phone || '-')}</td>
                        <td>${u.orders_count || 0}</td>
                        <td><b>${fmtPrice(u.spent)} UZS</b></td>
                        <td>${u.language === 'ru' ? '🇷🇺' : '🇺🇿'}</td>
                        <td>${escapeHtml(fmtDate(u.created_at))}</td>
                        <td class="row-actions"><button class="btn-row-action" onclick="event.stopPropagation(); openUserDetail(${u.id})">Ko'rish</button></td>
                    </tr>`).join('')}
            </tbody>
        </table></div>`;
}

async function openUserDetail(id) {
    try {
        const u = await api(`/api/admin/users/${id}/`);
        openModal({
            title: `${(u.first_name || '') + ' ' + (u.last_name || '')}`.trim() || 'Foydalanuvchi',
            size: 'lg',
            body: `
                <div class="order-detail">
                    <div class="order-field-row"><span class="lbl">Telegram ID</span><span class="val">${u.telegram_id}</span></div>
                    <div class="order-field-row"><span class="lbl">Username</span><span class="val">${u.username ? '@' + escapeHtml(u.username) : '-'}</span></div>
                    <div class="order-field-row"><span class="lbl">Telefon</span><span class="val">${escapeHtml(u.phone || '-')}</span></div>
                    <div class="order-field-row"><span class="lbl">Til</span><span class="val">${u.language === 'ru' ? '🇷🇺 Русский' : "🇺🇿 O'zbek"}</span></div>
                    <div class="order-field-row"><span class="lbl">Ro'yxatdan</span><span class="val">${escapeHtml(fmtDate(u.created_at))}</span></div>
                    <div class="order-field-row"><span class="lbl">Buyurtmalar</span><span class="val">${u.orders_count} ta</span></div>
                    <div class="order-field-row"><span class="lbl">Jami sarflagan</span><span class="val" style="color:var(--brand-green-dark);font-size:16px;">${fmtPrice(u.spent)} UZS</span></div>

                    <div class="user-orders">
                        <div class="user-orders-head">Buyurtmalar tarixi</div>
                        ${(u.orders || []).length ? (u.orders || []).map(o => `
                            <div class="user-order-row" style="cursor:pointer;" onclick="openOrderDetail(${o.id})">
                                <div class="user-order-id">#${o.id}</div>
                                <div class="user-order-date">${escapeHtml(fmtDate(o.created_at))}</div>
                                <span class="badge status-${o.status}">${escapeHtml(statusLabel(o.status))}</span>
                                <div class="user-order-price">${fmtPrice(o.total_price)} UZS</div>
                            </div>`).join('') : '<div style="color:var(--text-muted);font-size:13px;">Buyurtma yo\'q</div>'}
                    </div>
                </div>
            `,
            actions: [{ label: 'Yopish', class: 'btn-secondary', onClick: closeModal }],
        });
    } catch (e) { toast('Xato: ' + e.message); }
}

// ==========================================================
// Adminlar
// ==========================================================
async function renderAdmins(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">Adminlar</h2>
                    <div class="card-subtitle">Admin panelga kirish huquqiga ega foydalanuvchilar</div>
                </div>
                <div class="toolbar">
                    <div class="toolbar-spacer"></div>
                    <button class="btn-primary" onclick="openAddAdminForm()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Admin qo'shish
                    </button>
                </div>
            </div>
            <div class="card-body"><div id="admins-list"><div class="center-state"><div class="spinner"></div></div></div></div>
        </div>
    `;
    await fetchAdmins();
}

async function fetchAdmins() {
    const d = await api('/api/admin/admins/');
    const container = document.getElementById('admins-list');
    const admins = d.admins || [];
    if (!admins.length) {
        container.innerHTML = '<div class="center-state"><div class="state-icon">🛡️</div><div class="state-text">Admin yo\'q</div></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrap"><table class="admin-table">
            <thead><tr><th>Telegram ID</th><th>Ism</th><th>Username</th><th>Telefon</th><th>Roli</th><th>Manba</th><th></th></tr></thead>
            <tbody>
                ${admins.map(a => {
                    const roleBadge = a.is_super_admin
                        ? '<span class="badge bg-green">Super admin</span>'
                        : '<span class="badge bg-gray">Admin</span>';
                    const sourceBadge = a.source === 'env'
                        ? '<span class="badge" style="background:#FEF3C7;color:#92400E;">.env</span>'
                        : '<span class="badge" style="background:#DBEAFE;color:#1E40AF;">Panel</span>';
                    let actions = '';
                    if (a.super_locked) {
                        actions = '<span style="color:var(--text-light);font-size:12px;">.env himoyalangan</span>';
                    } else if (a.id) {
                        if (a.is_super_admin) {
                            actions += `<button class="btn-row-action" onclick="promoteAdmin(${a.id}, 'demote')">Oddiy admin qilish</button>`;
                        } else {
                            actions += `<button class="btn-row-action" onclick="promoteAdmin(${a.id}, 'promote')">Super qilish</button>`;
                        }
                        if (a.removable) {
                            actions += `<button class="btn-row-action danger" onclick="removeAdmin(${a.id})">Olib tashlash</button>`;
                        }
                    }
                    return `
                    <tr>
                        <td><b>${a.telegram_id}</b></td>
                        <td>${escapeHtml(a.name || '-')}</td>
                        <td>${a.username ? '@' + escapeHtml(a.username) : '-'}</td>
                        <td>${escapeHtml(a.phone || '-')}</td>
                        <td>${roleBadge}</td>
                        <td>${sourceBadge}</td>
                        <td class="row-actions">${actions}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table></div>
    `;
}

async function promoteAdmin(id, action) {
    const msg = action === 'promote'
        ? "Bu admin'ni Super admin qilasizmi?"
        : "Super admin'lik huquqini olib tashlaysizmi?";
    if (!confirm(msg)) return;
    try {
        await api(`/api/admin/admins/${id}/promote/`, { method: 'POST', body: { action } });
        toast(action === 'promote' ? 'Super admin qilindi' : 'Oddiy admin qilindi');
        await fetchAdmins();
    } catch (e) { toast('Xato: ' + e.message); }
}

function openAddAdminForm() {
    openModal({
        title: 'Yangi admin qo\'shish',
        body: `
            <form class="form" id="admin-add-form" onsubmit="return false;">
                <div class="form-row">
                    <label class="form-label">Telegram ID</label>
                    <input class="input-field" id="adm-tg" type="number" placeholder="1234567890">
                </div>
                <div class="form-row">
                    <label class="form-label">yoki Username (@)</label>
                    <input class="input-field" id="adm-user" placeholder="username">
                </div>
                <div class="form-row">
                    <label class="switch">
                        <input type="checkbox" id="adm-super">
                        <span class="switch-track"></span>
                        <span>Super admin sifatida qo'shish</span>
                    </label>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:4px;padding-left:54px;">
                        Super admin: barcha sozlamalar va admin'larni boshqarish huquqi
                    </div>
                </div>
                <div style="padding:0 4px;color:var(--text-muted);font-size:12.5px;line-height:1.5;">
                    ⚠️ Foydalanuvchi botga kamida bir marta <b>/start</b> yozgan bo'lishi kerak.
                </div>
            </form>
        `,
        actions: [
            { label: 'Bekor', class: 'btn-secondary', onClick: closeModal },
            { label: "Qo'shish", class: 'btn-primary', onClick: async () => {
                const tg = document.getElementById('adm-tg').value.trim();
                const user = document.getElementById('adm-user').value.trim();
                const isSuper = document.getElementById('adm-super').checked;
                if (!tg && !user) { toast('Telegram ID yoki username kiriting'); return; }
                try {
                    const body = { is_super: isSuper };
                    if (tg) body.telegram_id = tg;
                    if (user) body.username = user;
                    await api('/api/admin/admins/add/', { method: 'POST', body });
                    toast(isSuper ? 'Super admin qo\'shildi' : 'Admin qo\'shildi');
                    closeModal();
                    await fetchAdmins();
                } catch (e) { toast('Xato: ' + e.message); }
            }},
        ],
    });
}

async function removeAdmin(id) {
    if (!confirm("Adminni olib tashlaysizmi?")) return;
    try {
        await api(`/api/admin/admins/${id}/remove/`, { method: 'POST' });
        toast("Olib tashlandi");
        await fetchAdmins();
    } catch (e) { toast('Xato: ' + e.message); }
}

// ==========================================================
// Sozlamalar
// ==========================================================
async function renderSettings(content) {
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">Sayt sozlamalari</h2>
                    <div class="card-subtitle">Minimal buyurtma va boshqa parametrlar</div>
                </div>
            </div>
            <div id="settings-body"><div class="center-state"><div class="spinner"></div></div></div>
        </div>
    `;
    const cfg = await api('/api/admin/settings/');
    document.getElementById('settings-body').innerHTML = `
        <form class="form" onsubmit="return false;" style="max-width:480px;">
            <div class="form-row">
                <label class="form-label">Minimal buyurtma summasi (UZS)</label>
                <input class="input-field" id="set-min" type="number" min="0" value="${cfg.min_order_amount || 0}">
            </div>
            <div class="form-row">
                <label class="form-label">Yetkazib berish narxi (UZS)</label>
                <input class="input-field" id="set-delivery" type="number" min="0" value="${cfg.delivery_fee || 0}">
            </div>
            <div class="form-row">
                <label class="form-label">Qo'llab-quvvatlash username (@)</label>
                <input class="input-field" id="set-support" placeholder="support" value="${escapeHtml(cfg.support_username || '')}">
            </div>
            <div style="display:flex;justify-content:flex-end;padding-top:6px;">
                <button class="btn-primary" onclick="saveSettings()">Saqlash</button>
            </div>
        </form>
    `;
}

async function saveSettings() {
    const body = {
        min_order_amount: document.getElementById('set-min').value || 0,
        delivery_fee: document.getElementById('set-delivery').value || 0,
        support_username: document.getElementById('set-support').value,
    };
    try {
        await api('/api/admin/settings/', { method: 'PATCH', body });
        toast('Saqlandi');
    } catch (e) { toast('Xato: ' + e.message); }
}

// ==========================================================
// Pagination helper
// ==========================================================
function renderPager(containerId, page, totalPages, onGo) {
    const c = document.getElementById(containerId);
    if (!c || totalPages <= 1) { if (c) c.innerHTML = ''; return; }
    let pages = [];
    const maxShow = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxShow - 1);
    start = Math.max(1, end - maxShow + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    c.innerHTML = `
        <div class="pagination">
            <div>Sahifa <b>${page}</b> / ${totalPages}</div>
            <div class="pagination-controls">
                <button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-p="${page - 1}">←</button>
                ${start > 1 ? `<button class="page-btn" data-p="1">1</button>${start > 2 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : ''}` : ''}
                ${pages.map(p => `<button class="page-btn ${p === page ? 'active' : ''}" data-p="${p}">${p}</button>`).join('')}
                ${end < totalPages ? `${end < totalPages - 1 ? '<span style="padding:0 4px;color:var(--text-muted)">…</span>' : ''}<button class="page-btn" data-p="${totalPages}">${totalPages}</button>` : ''}
                <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} data-p="${page + 1}">→</button>
            </div>
        </div>
    `;
    c.querySelectorAll('[data-p]').forEach(btn => {
        btn.addEventListener('click', () => onGo(parseInt(btn.dataset.p, 10)));
    });
}

// ==========================================================
// Modal
// ==========================================================
function openModal({ title, body, actions, size }) {
    const root = document.getElementById('modal-root');
    const actionHtml = (actions || []).map((a, i) => `<button class="${a.class || 'btn-secondary'}" data-action="${i}">${escapeHtml(a.label)}</button>`).join('');
    root.innerHTML = `
        <div class="modal-overlay" id="modal-overlay-inner">
            <div class="modal-box ${size === 'lg' ? 'modal-lg' : ''}">
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

// ==========================================================
// Init / Auth
// ==========================================================
let CURRENT_ADMIN = { is_super_admin: false, name: '', telegram_id: null };

function isSuperAdmin() {
    return !!CURRENT_ADMIN.is_super_admin;
}

function applyRolePermissions() {
    // Super admin emas bo'lsa — Adminlar va Sozlamalar bo'limlarini yashirish
    if (!isSuperAdmin()) {
        document.querySelectorAll('.nav-item').forEach(el => {
            if (['admins', 'settings'].includes(el.dataset.view)) {
                el.style.display = 'none';
            }
        });
    }
}

async function init() {
    try {
        // Avval rolni olish
        try {
            const me = await api('/api/admin/whoami/');
            CURRENT_ADMIN = me;
            document.getElementById('topbar-user').textContent =
                (me.name || '').trim() || (tg?.initDataUnsafe?.user?.first_name) || 'Admin';
        } catch {}
        applyRolePermissions();
        await loadView('dashboard');
    } catch (e) {
        showAuthError(e);
    }
}

function showAuthError(e) {
    document.getElementById('auth-gate').style.display = 'flex';
    let msg = e.message || 'Xato';
    if (e.status === 403) {
        if (e.reason && e.reason.startsWith('empty_init_data')) {
            msg = "Telegram ma'lumotlari topilmadi. Ilovani botning \"Admin panel\" tugmasidan qayta oching.";
        } else if (e.message && e.message.includes('admin huquqlari')) {
            msg = "Sizda admin huquqlari yo'q.";
        } else {
            msg = `${e.message}${e.reason ? ' (' + e.reason + ')' : ''}`;
        }
    }
    document.getElementById('auth-text').textContent = msg;
}

init();
