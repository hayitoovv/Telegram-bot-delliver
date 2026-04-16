// ============================================
// Food Delivery Mini App
// ============================================

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f2f2f7');

const API_BASE = window.APP_CONFIG?.API_BASE || window.location.origin;
const MIN_ORDER_AMOUNT = window.APP_CONFIG?.MIN_ORDER_AMOUNT || 40000;

// State
let categories = [];
let products = [];
let cart = {};
let selectedCategory = null;
let selectedAddress = null; // { lat, lng, label }
let searchQuery = '';

// Map state
let map = null;
let mapMarker = null;
let pendingAddress = null; // { lat, lng, label } while picking
let reverseTimer = null;

// ============================================
// API
// ============================================

const COMMON_HEADERS = {};

function getOrCreateTestId() {
    let id = sessionStorage.getItem('test_tg_id');
    if (!id) {
        id = String(900000000 + Math.floor(Math.random() * 99999999));
        sessionStorage.setItem('test_tg_id', id);
    }
    return parseInt(id, 10);
}

function readHashInitData() {
    try {
        const hash = window.location.hash.substring(1);
        if (!hash) return '';
        const params = new URLSearchParams(hash);
        const data = params.get('tgWebAppData');
        return data ? decodeURIComponent(data) : '';
    } catch {
        return '';
    }
}

function getInitData() {
    if (tg.initData && tg.initData.length > 0) return tg.initData;

    // Try reading from URL hash (Telegram appends data even if SDK doesn't expose it)
    const hashData = readHashInitData();
    if (hashData) return hashData;

    const u = tg.initDataUnsafe?.user;
    if (u && u.id) {
        return JSON.stringify({
            id: u.id,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            username: u.username || '',
        });
    }

    // Dev fallback: unique per browser tab so testing isn't all "Guest"
    const testId = getOrCreateTestId();
    return JSON.stringify({
        id: testId,
        first_name: `Test ${testId.toString().slice(-4)}`,
        last_name: '',
        username: '',
    });
}

async function apiGet(endpoint) {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, { headers: COMMON_HEADERS });
    if (!res.ok) throw new Error(`API xato: ${res.status}`);
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...COMMON_HEADERS },
        body: JSON.stringify({ ...data, initData: getInitData() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API xato: ${res.status}`);
    }
    return res.json();
}

// ============================================
// Load data
// ============================================

async function loadCategories() {
    try {
        const data = await apiGet('categories/');
        categories = data.results || data;
        renderCategoriesGrid();
    } catch (e) {
        console.error('Kategoriyalar yuklanmadi:', e);
        document.getElementById('categories-grid').innerHTML =
            '<div class="empty-state">Kategoriyalar yuklanmadi</div>';
    }
}

async function loadProducts(categoryId) {
    try {
        const endpoint = categoryId
            ? `products/?category_id=${categoryId}`
            : 'products/';
        const data = await apiGet(endpoint);
        products = data.results || data;
        renderProducts();
    } catch (e) {
        console.error('Mahsulotlar yuklanmadi:', e);
        document.getElementById('products-container').innerHTML =
            '<div class="empty-state">Mahsulotlar yuklanmadi</div>';
    }
}

// ============================================
// Render
// ============================================

function renderCategoriesGrid() {
    const container = document.getElementById('categories-grid');

    if (!categories.length) {
        container.innerHTML = '<div class="empty-state">Kategoriyalar yo\'q</div>';
        return;
    }

    let html = '';
    categories.forEach(cat => {
        const img = cat.image
            ? `<img class="category-card-image" src="${cat.image}" alt="${cat.name}" loading="lazy">`
            : `<div class="category-card-image no-image">🍽️</div>`;
        html += `
        <div class="category-card" onclick="openCategory(${cat.id}, '${escapeAttr(cat.name)}')">
            ${img}
            <div class="category-card-name">${cat.name}</div>
        </div>`;
    });
    container.innerHTML = html;
}

function renderProducts() {
    const container = document.getElementById('products-container');
    const list = searchQuery
        ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : products;

    if (!list.length) {
        container.innerHTML = '<div class="empty-state">Mahsulotlar topilmadi</div>';
        return;
    }

    let html = '';
    list.forEach(product => {
        const qty = cart[product.id]?.quantity || 0;
        const imageHtml = product.image
            ? `<img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy">`
            : `<div class="product-image no-image">🍽️</div>`;

        html += `
        <div class="product-card">
            ${imageHtml}
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatPrice(product.price)} UZS</div>
                <div class="product-actions">
                    ${qty === 0
                        ? `<button class="btn-add" onclick="addToCart(${product.id})">+ Qo'shish</button>`
                        : `<div class="quantity-control">
                            <button class="qty-btn" onclick="changeQty(${product.id}, -1)">−</button>
                            <span class="qty-value">${qty}</span>
                            <button class="qty-btn" onclick="changeQty(${product.id}, 1)">+</button>
                           </div>`
                    }
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const items = Object.values(cart);

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">Savat bo\'sh</div>';
        return;
    }

    let html = '';
    items.forEach(item => {
        html += `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price)} UZS</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
            </div>
            <div class="cart-item-subtotal">${formatPrice(item.price * item.quantity)} UZS</div>
        </div>`;
    });
    container.innerHTML = html;
}

function renderOrderSummary() {
    const container = document.getElementById('order-summary');
    const items = Object.values(cart);
    const total = getCartTotal();

    let html = '';
    items.forEach(item => {
        html += `
        <div class="order-summary-item">
            <span>${item.name} x${item.quantity}</span>
            <span>${formatPrice(item.price * item.quantity)} UZS</span>
        </div>`;
    });
    html += `
    <div class="order-summary-total">
        <span>Jami:</span>
        <span>${formatPrice(total)} UZS</span>
    </div>`;
    container.innerHTML = html;

    document.getElementById('checkout-address').textContent =
        selectedAddress ? selectedAddress.label : 'Manzil tanlanmagan';
}

// ============================================
// Navigation
// ============================================

function openCategory(id, name) {
    selectedCategory = id;
    searchQuery = '';
    document.getElementById('search-input').value = '';
    document.getElementById('categories-view').style.display = 'none';
    document.getElementById('products-view').style.display = 'block';
    document.getElementById('products-title').textContent = name;
    document.getElementById('products-container').innerHTML = '<div class="loading">Yuklanmoqda...</div>';
    loadProducts(id);
}

function backToCategories() {
    selectedCategory = null;
    searchQuery = '';
    document.getElementById('search-input').value = '';
    document.getElementById('products-view').style.display = 'none';
    document.getElementById('categories-view').style.display = 'block';
}

function runSearch() {
    const q = document.getElementById('search-input').value.trim();
    searchQuery = q;
    if (!q) return;

    // Open products view showing matches across all categories
    if (document.getElementById('products-view').style.display === 'none') {
        document.getElementById('categories-view').style.display = 'none';
        document.getElementById('products-view').style.display = 'block';
        document.getElementById('products-title').textContent = `"${q}"`;
        loadProducts(null).then(renderProducts);
    } else {
        renderProducts();
    }
}

// ============================================
// Cart
// ============================================

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    cart[productId] = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
    };

    updateCartUI();
    renderProducts();
    tg.HapticFeedback?.impactOccurred('light');
}

function changeQty(productId, delta) {
    if (!cart[productId]) return;

    cart[productId].quantity += delta;
    if (cart[productId].quantity <= 0) delete cart[productId];

    updateCartUI();
    renderProducts();
    renderCart();
    tg.HapticFeedback?.impactOccurred('light');
}

function getCartTotal() {
    return Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartUI() {
    const fab = document.getElementById('cart-fab');
    const count = getCartCount();
    const total = getCartTotal();

    if (count > 0) {
        fab.style.display = 'block';
        document.getElementById('cart-count').textContent = count;
        document.getElementById('cart-total').textContent = formatPrice(total);
    } else {
        fab.style.display = 'none';
    }

    document.getElementById('cart-modal-total').textContent = formatPrice(total) + ' UZS';

    const warning = document.getElementById('min-order-warning');
    const checkoutBtn = document.getElementById('checkout-btn');
    if (total < MIN_ORDER_AMOUNT && count > 0) {
        warning.style.display = 'block';
        document.getElementById('min-amount').textContent = formatPrice(MIN_ORDER_AMOUNT);
        checkoutBtn.disabled = true;
    } else {
        warning.style.display = 'none';
        checkoutBtn.disabled = false;
    }
}

// ============================================
// Drawer & chat
// ============================================

function showDrawer() {
    document.getElementById('drawer').style.display = 'flex';
    tg.HapticFeedback?.impactOccurred('light');
}

function hideDrawer(event) {
    if (event && event.target.id !== 'drawer') return;
    document.getElementById('drawer').style.display = 'none';
}

// ============================================
// Phone registration + Chat
// ============================================

function currentTgId() {
    return tg.initDataUnsafe?.user?.id || null;
}

function getUserPhone() {
    try {
        const data = JSON.parse(localStorage.getItem('user_data') || '{}');
        const tgId = currentTgId();
        if (tgId && data.tg_id === tgId) return data.phone || null;
    } catch {}
    return null;
}

function setUserPhone(phone) {
    const tgId = currentTgId();
    if (!tgId) return;
    localStorage.setItem('user_data', JSON.stringify({ tg_id: tgId, phone }));
}

function openChat() {
    if (getUserPhone()) {
        showChatModal();
    } else {
        showRegister();
    }
}

function showRegister() {
    document.getElementById('register-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('phone-input').focus(), 200);
}

function hideRegister() {
    document.getElementById('register-modal').style.display = 'none';
    document.getElementById('phone-error').style.display = 'none';
    document.getElementById('phone-wrap').classList.remove('error');
}

async function submitPhone() {
    const input = document.getElementById('phone-input');
    const raw = input.value.replace(/\D/g, '');
    const errEl = document.getElementById('phone-error');
    const wrap = document.getElementById('phone-wrap');

    if (raw.length !== 9) {
        errEl.textContent = "Telefon raqami noto'g'ri";
        errEl.style.display = 'block';
        wrap.classList.add('error');
        tg.HapticFeedback?.notificationOccurred('error');
        return;
    }

    const fullPhone = '+998' + raw;

    try {
        await apiPost('auth/', { phone: fullPhone });
    } catch (e) {
        console.error('Auth xato:', e);
    }

    setUserPhone(fullPhone);
    hideRegister();
    showToast('Tabriklaymiz muvaffaqiyatli tizimga kirdingiz!');
    setTimeout(showChatModal, 700);
    tg.HapticFeedback?.notificationOccurred('success');
}

function showToast(text) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = text;
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

function showChatModal() {
    document.getElementById('chat-modal').style.display = 'flex';
    renderChatMessages();
    setTimeout(() => document.getElementById('chat-input').focus(), 200);
}

function hideChat() {
    document.getElementById('chat-modal').style.display = 'none';
}

function getChatMessages() {
    try {
        return JSON.parse(localStorage.getItem('chat_messages') || '[]');
    } catch {
        return [];
    }
}

function saveChatMessages(msgs) {
    localStorage.setItem('chat_messages', JSON.stringify(msgs));
}

function renderChatMessages() {
    const body = document.getElementById('chat-body');
    const msgs = getChatMessages();
    if (!msgs.length) {
        body.innerHTML = '<div class="chat-empty">Hali xabar yo\'q</div>';
        return;
    }
    body.innerHTML = msgs.map(m =>
        `<div class="chat-msg ${m.from === 'me' ? 'me' : 'them'}">${escapeHtml(m.text)}</div>`
    ).join('');
    body.scrollTop = body.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const msgs = getChatMessages();
    msgs.push({ from: 'me', text, at: Date.now() });
    saveChatMessages(msgs);
    input.value = '';
    renderChatMessages();
    tg.HapticFeedback?.impactOccurred('light');

    try {
        await apiPost('chat/', { text });
    } catch (e) {
        console.error('Chat xato:', e);
        showToast('Xabar yuborilmadi, qaytadan urinib ko\'ring');
    }
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    const chatIn = document.getElementById('chat-input');
    if (chatIn) {
        chatIn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    const phoneIn = document.getElementById('phone-input');
    if (phoneIn) {
        phoneIn.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
            document.getElementById('phone-error').style.display = 'none';
            document.getElementById('phone-wrap').classList.remove('error');
        });
    }
});

// ============================================
// Modals
// ============================================

function showCart() {
    renderCart();
    updateCartUI();
    document.getElementById('cart-modal').style.display = 'flex';
}

function hideCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function showCheckout() {
    hideCart();
    renderOrderSummary();
    document.getElementById('checkout-modal').style.display = 'flex';
}

function hideCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
}

// ============================================
// Map (Leaflet + OSM)
// ============================================

function showMap() {
    document.getElementById('map-modal').style.display = 'flex';
    setTimeout(initMap, 50);
}

function hideMap() {
    document.getElementById('map-modal').style.display = 'none';
}

function initMap() {
    const container = document.getElementById('map-container');
    if (map) {
        setTimeout(() => map.invalidateSize(), 50);
        return;
    }

    const start = selectedAddress
        ? [selectedAddress.lat, selectedAddress.lng]
        : [41.3111, 69.2797]; // Tashkent default

    map = L.map(container, { zoomControl: false, attributionControl: false }).setView(start, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 20,
        subdomains: 'abc',
    }).addTo(map);

    const greenIcon = L.divIcon({
        className: 'custom-pin',
        html: '<div class="pin-dot"></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    mapMarker = L.marker(start, { draggable: true, icon: greenIcon }).addTo(map);
    mapMarker.on('drag', () => {
        const ll = mapMarker.getLatLng();
        scheduleReverse(ll.lat, ll.lng);
    });
    mapMarker.on('dragend', () => {
        const ll = mapMarker.getLatLng();
        map.panTo(ll);
        scheduleReverse(ll.lat, ll.lng);
    });
    map.on('click', (e) => {
        mapMarker.setLatLng(e.latlng);
        scheduleReverse(e.latlng.lat, e.latlng.lng);
    });
    map.on('moveend', () => {
        if (!mapMarker) return;
        mapMarker.setLatLng(map.getCenter());
        scheduleReverse(map.getCenter().lat, map.getCenter().lng);
    });

    // Custom zoom buttons
    document.getElementById('map-zoom-in').onclick = () => map.zoomIn();
    document.getElementById('map-zoom-out').onclick = () => map.zoomOut();
    document.getElementById('map-locate').onclick = locateUser;

    // Initial geolocate
    locateUser();
    scheduleReverse(start[0], start[1]);

    // Search via Nominatim
    const searchInput = document.getElementById('map-search-input');
    searchInput.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter') return;
        const q = searchInput.value.trim();
        if (!q) return;
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
                { headers: { 'Accept': 'application/json' } }
            );
            const results = await res.json();
            if (results.length) {
                const { lat, lon, display_name } = results[0];
                const ll = [parseFloat(lat), parseFloat(lon)];
                map.setView(ll, 17);
                mapMarker.setLatLng(ll);
                setPending(parseFloat(lat), parseFloat(lon), display_name);
            }
        } catch (err) {
            console.error('Qidirish xato:', err);
        }
    });

    setTimeout(() => map.invalidateSize(), 100);
}

function locateUser() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const ll = [pos.coords.latitude, pos.coords.longitude];
            map.setView(ll, 17);
            mapMarker.setLatLng(ll);
            scheduleReverse(ll[0], ll[1]);
        },
        (err) => console.warn('Geo xato:', err),
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

function setPending(lat, lng, label) {
    pendingAddress = { lat, lng, label };
    document.getElementById('map-selected-label').textContent = label;
}

function scheduleReverse(lat, lng) {
    const labelEl = document.getElementById('map-selected-label');
    labelEl.textContent = 'Manzil aniqlanmoqda...';
    pendingAddress = { lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };

    if (reverseTimer) clearTimeout(reverseTimer);
    reverseTimer = setTimeout(async () => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`,
                { headers: { 'Accept': 'application/json' } }
            );
            const data = await res.json();
            if (data.display_name) setPending(lat, lng, data.display_name);
        } catch (err) {
            console.error('Reverse geocode xato:', err);
        }
    }, 400);
}

function confirmLocation() {
    if (!pendingAddress) return;
    selectedAddress = { ...pendingAddress };
    const label = selectedAddress.label;
    document.getElementById('address-text').textContent = label.length > 40
        ? label.slice(0, 40) + '…'
        : label;
    document.getElementById('checkout-address').textContent = label;
    hideMap();
    tg.HapticFeedback?.notificationOccurred('success');
}

// ============================================
// Submit order
// ============================================

async function submitOrder() {
    if (!selectedAddress) {
        alert('Iltimos, manzilingizni tanlang');
        return;
    }

    const comment = document.getElementById('comment-input').value.trim();
    const items = Object.values(cart).map(item => ({
        product_id: item.id,
        quantity: item.quantity,
    }));

    const submitBtn = document.getElementById('submit-order-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Yuborilmoqda...';

    try {
        await apiPost('order/', {
            items,
            address: selectedAddress.label,
            comment,
            latitude: selectedAddress.lat,
            longitude: selectedAddress.lng,
        });

        hideCheckout();
        cart = {};
        updateCartUI();
        renderProducts();
        document.getElementById('success-modal').style.display = 'flex';
        tg.HapticFeedback?.notificationOccurred('success');
    } catch (e) {
        alert(e.message || 'Xatolik yuz berdi');
        tg.HapticFeedback?.notificationOccurred('error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Buyurtmani tasdiqlash';
    }
}

// ============================================
// Helpers
// ============================================

function formatPrice(price) {
    return Number(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeAttr(s) {
    return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function closeApp() {
    tg.close();
}

// Live search on type
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('search-input');
    if (input) {
        input.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            if (document.getElementById('products-view').style.display !== 'none') {
                renderProducts();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runSearch();
        });
    }
});

// ============================================
// Init
// ============================================

async function init() {
    try {
        await apiPost('auth/', {});
    } catch (e) {
        console.error('Auth xato:', e);
    }
    await loadCategories();
}

init();
