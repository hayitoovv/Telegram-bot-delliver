// ============================================
// Food Delivery Mini App
// ============================================

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Telegram tema ranglarini qo'llash
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#3390ec');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f0f0f0');

// Konfiguratsiya
const API_BASE = window.APP_CONFIG?.API_BASE || '';
const MIN_ORDER_AMOUNT = window.APP_CONFIG?.MIN_ORDER_AMOUNT || 40000;

// State
let categories = [];
let products = [];
let cart = {};
let selectedCategory = 'all';
let userLocation = null;

// ============================================
// API
// ============================================

async function apiGet(endpoint) {
    const res = await fetch(`${API_BASE}/api/${endpoint}`);
    if (!res.ok) throw new Error(`API xato: ${res.status}`);
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, initData: tg.initData }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `API xato: ${res.status}`);
    }
    return res.json();
}

// ============================================
// Ma'lumotlarni yuklash
// ============================================

async function loadCategories() {
    try {
        const data = await apiGet('categories/');
        categories = data.results || data;
        renderCategories();
    } catch (e) {
        console.error('Kategoriyalar yuklanmadi:', e);
    }
}

async function loadProducts(categoryId) {
    try {
        const endpoint = categoryId && categoryId !== 'all'
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

function renderCategories() {
    const container = document.getElementById('categories-container');
    let html = `<button class="category-btn ${selectedCategory === 'all' ? 'active' : ''}"
                        data-id="all" onclick="selectCategory('all')">Barchasi</button>`;

    categories.forEach(cat => {
        html += `<button class="category-btn ${selectedCategory == cat.id ? 'active' : ''}"
                         data-id="${cat.id}" onclick="selectCategory(${cat.id})">${cat.name}</button>`;
    });

    container.innerHTML = html;
}

function renderProducts() {
    const container = document.getElementById('products-container');

    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">Mahsulotlar topilmadi</div>';
        return;
    }

    let html = '';
    products.forEach(product => {
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
}

// ============================================
// Savat
// ============================================

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    cart[productId] = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
    };

    updateCartUI();
    renderProducts();
    tg.HapticFeedback.impactOccurred('light');
}

function changeQty(productId, delta) {
    if (!cart[productId]) return;

    cart[productId].quantity += delta;

    if (cart[productId].quantity <= 0) {
        delete cart[productId];
    }

    updateCartUI();
    renderProducts();
    renderCart();
    tg.HapticFeedback.impactOccurred('light');
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

    // Modal ichidagi jami
    document.getElementById('cart-modal-total').textContent = formatPrice(total) + ' UZS';

    // Minimal summa tekshirish
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
// Kategoriya tanlash
// ============================================

function selectCategory(categoryId) {
    selectedCategory = categoryId;
    renderCategories();
    loadProducts(categoryId);
}

// ============================================
// Modallar
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
// Lokatsiya
// ============================================

function sendLocation() {
    if (!navigator.geolocation) {
        alert('Geolokatsiya qo\'llab-quvvatlanmaydi');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userLocation = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            };
            document.getElementById('address-input').value =
                `📍 Lokatsiya yuborildi (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
            tg.HapticFeedback.notificationOccurred('success');
        },
        (err) => {
            console.error('Lokatsiya olishda xato:', err);
            alert('Lokatsiyani olishda xatolik yuz berdi');
        }
    );
}

// ============================================
// Buyurtma yuborish
// ============================================

async function submitOrder() {
    const address = document.getElementById('address-input').value.trim();
    const comment = document.getElementById('comment-input').value.trim();

    if (!address) {
        alert('Iltimos, manzilingizni kiriting');
        return;
    }

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
            address,
            comment,
            latitude: userLocation?.latitude || null,
            longitude: userLocation?.longitude || null,
        });

        // Muvaffaqiyat
        hideCheckout();
        cart = {};
        updateCartUI();
        renderProducts();
        document.getElementById('success-modal').style.display = 'flex';
        tg.HapticFeedback.notificationOccurred('success');

    } catch (e) {
        alert(e.message || 'Xatolik yuz berdi');
        tg.HapticFeedback.notificationOccurred('error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Buyurtmani tasdiqlash';
    }
}

// ============================================
// Yordamchi funksiyalar
// ============================================

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function closeApp() {
    tg.close();
}

// ============================================
// Auth va boshlash
// ============================================

async function init() {
    // Foydalanuvchini autentifikatsiya qilish
    try {
        await apiPost('auth/', {});
    } catch (e) {
        console.error('Auth xatosi:', e);
    }

    // Ma'lumotlarni yuklash
    await Promise.all([loadCategories(), loadProducts()]);
}

// Ilovani ishga tushirish
init();
