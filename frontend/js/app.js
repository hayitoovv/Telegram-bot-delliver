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

// Language
const urlParams = new URLSearchParams(window.location.search);
const LANG = urlParams.get('lang') || 'uz';

const UI_TEXTS = {
    uz: {
        search_placeholder: "Mahsulotlarni qidirish",
        search_btn: "Qidirish",
        no_categories: "Kategoriyalar yo'q",
        categories_error: "Kategoriyalar yuklanmadi",
        no_products: "Mahsulotlar topilmadi",
        products_error: "Mahsulotlar yuklanmadi",
        loading: "Yuklanmoqda...",
        add_btn: "+ Qo'shish",
        cart_empty: "Savat bo'sh",
        total: "Jami:",
        address_not_selected: "Manzil tanlanmagan",
        address_detecting: "Manzil aniqlanmoqda...",
        select_address: "Iltimos, manzilingizni tanlang",
        sending: "Yuborilmoqda...",
        confirm_order: "✅ Buyurtmani tasdiqlash",
        error_occurred: "Xatolik yuz berdi",
        min_order: "Minimal buyurtma:",
        no_messages: "Hali xabar yo'q",
        chat_error: "Xabar yuborilmadi, qaytadan urinib ko'ring",
        phone_error: "Telefon raqami noto'g'ri",
        register_success: "Tabriklaymiz muvaffaqiyatli tizimga kirdingiz!",
        comment_placeholder: "Izoh qoldiring...",
        order_success_title: "Buyurtmangiz qabul qilindi!",
        order_success_text: "Tez orada siz bilan bog'lanamiz",
        close: "Yopish",
        back_btn: "Orqaga",
        cart_title: "Savat",
        place_order: "Buyurtma berish",
        order_title: "Buyurtma",
        address_label: "Manzil",
        select_from_map: "Xaritadan tanlash",
        comment_label: "Izoh (ixtiyoriy)",
        add_to_cart: "Savatga qo'shish",
        go_to_cart: "Savatga o'tish",
        total_label: "Umumiy",
        continue_btn: "Davom etish",
        clear_cart_confirm: "Savatdan hamma mahsulotlar o'chirilsinmi?",
        cancel_btn: "Bekor qilish",
        delete_btn: "O'chirish",
        addr_prompt_title: "\"Buyurtmangizni qayerga yetkazib berish kerak? 🚀\"",
        addr_prompt_desc: "Joylashuvingizni yuboring, biz esa sizga eng yaqin restoran filialini topib, taomlaringizni tez va qulay yetkazib beramiz!",
        addr_auto: "Joylashuvni avtomatik hisoblash",
        addr_manual: "Manzilni qo'lda ko'rsatish",
        checkout_title: "Buyurtmani rasmiylashtirish",
        delivery_option: "Yetkazib berish",
        delivery_desc: "Buyurtmangizni o'zimiz yetkazib beramiz.",
        pickup_option: "Olib ketish",
        pickup_desc: "O'zingizga eng yaqin filialdan kelib olib ketishingiz mumkin.",
        delivery_address: "Yetkazish manzili",
        entrance: "Kirish yo'lagi",
        floor: "Qavat",
        room: "Xona",
        courier_comment: "Kuryer uchun izoh (domofon kodi)",
        my_addresses: "Manzillarim",
        new_address: "Yangi yaratish",
    },
    ru: {
        search_placeholder: "Поиск продуктов",
        search_btn: "Поиск",
        no_categories: "Нет категорий",
        categories_error: "Не удалось загрузить категории",
        no_products: "Продукты не найдены",
        products_error: "Не удалось загрузить продукты",
        loading: "Загрузка...",
        add_btn: "+ Добавить",
        cart_empty: "Корзина пуста",
        total: "Итого:",
        address_not_selected: "Адрес не выбран",
        address_detecting: "Определение адреса...",
        select_address: "Пожалуйста, выберите адрес",
        sending: "Отправка...",
        confirm_order: "✅ Подтвердить заказ",
        error_occurred: "Произошла ошибка",
        min_order: "Минимальный заказ:",
        no_messages: "Пока нет сообщений",
        chat_error: "Сообщение не отправлено, попробуйте снова",
        phone_error: "Неверный номер телефона",
        register_success: "Поздравляем, вы успешно вошли в систему!",
        comment_placeholder: "Оставьте комментарий...",
        order_success_title: "Ваш заказ принят!",
        order_success_text: "Мы скоро свяжемся с вами",
        close: "Закрыть",
        back_btn: "Назад",
        cart_title: "Корзина",
        place_order: "Оформить заказ",
        order_title: "Заказ",
        address_label: "Адрес",
        select_from_map: "Выбрать на карте",
        comment_label: "Комментарий (необязательно)",
        add_to_cart: "В корзину",
        go_to_cart: "Перейти в корзину",
        total_label: "Общая",
        continue_btn: "Продолжить",
        clear_cart_confirm: "Удалить все товары из корзины?",
        cancel_btn: "Отмена",
        delete_btn: "Удалить",
        addr_prompt_title: "\"Куда доставить ваш заказ? 🚀\"",
        addr_prompt_desc: "Отправьте ваше местоположение, мы найдём ближайший филиал ресторана и доставим ваши блюда быстро и удобно!",
        addr_auto: "Определить местоположение автоматически",
        addr_manual: "Указать адрес вручную",
        checkout_title: "Оформление заказа",
        delivery_option: "Доставка",
        delivery_desc: "Мы сами доставим ваш заказ.",
        pickup_option: "Самовывоз",
        pickup_desc: "Вы можете забрать заказ из ближайшего филиала.",
        delivery_address: "Адрес доставки",
        entrance: "Подъезд",
        floor: "Этаж",
        room: "Квартира",
        courier_comment: "Комментарий для курьера (код домофона)",
        my_addresses: "Мои адреса",
        new_address: "Создать новый",
    },
};

function txt(key) {
    return (UI_TEXTS[LANG] || UI_TEXTS['uz'])[key] || UI_TEXTS['uz'][key] || key;
}

// State
let categories = [];
let products = [];
let cart = {};
let selectedCategory = null;
let selectedAddress = null; // { lat, lng, label }
let searchQuery = '';

// Load saved address from localStorage
try {
    const saved = localStorage.getItem('selected_address');
    if (saved) selectedAddress = JSON.parse(saved);
} catch {}

let savedAddresses = [];
try {
    const list = localStorage.getItem('saved_addresses');
    if (list) savedAddresses = JSON.parse(list);
} catch {}

let deliveryMethod = 'delivery';

function saveAddress() {
    if (!selectedAddress) return;
    localStorage.setItem('selected_address', JSON.stringify(selectedAddress));
    // Saqlangan manzillar ro'yxatiga qo'shish (takrorlanmasligi uchun)
    const exists = savedAddresses.find(a => a.label === selectedAddress.label);
    if (!exists) {
        savedAddresses.unshift({ ...selectedAddress });
        if (savedAddresses.length > 5) savedAddresses.pop();
        localStorage.setItem('saved_addresses', JSON.stringify(savedAddresses));
    }
}

function selectDeliveryMethod(method) {
    deliveryMethod = method;
    document.querySelectorAll('.delivery-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.method === method);
    });
    const addrBlock = document.getElementById('checkout-address-block');
    if (addrBlock) addrBlock.style.display = method === 'pickup' ? 'none' : 'block';
}

function openAddressesSheet() {
    renderAddressesList();
    document.getElementById('addresses-sheet').style.display = 'flex';
}

function closeAddressesSheet(event) {
    if (event && event.currentTarget && event.target !== event.currentTarget) return;
    document.getElementById('addresses-sheet').style.display = 'none';
}

function renderAddressesList() {
    const list = document.getElementById('addresses-list');
    if (!savedAddresses.length) {
        list.innerHTML = '';
        return;
    }
    let html = '';
    savedAddresses.forEach((addr, i) => {
        const sel = (selectedAddress && selectedAddress.label === addr.label) ? 'selected' : '';
        html += `
        <div class="address-item ${sel}" onclick="chooseSavedAddress(${i})">
            <div class="address-item-radio"></div>
            <div class="address-item-text">${escapeHtml(addr.label)}</div>
        </div>`;
    });
    list.innerHTML = html;
}

function chooseSavedAddress(i) {
    const addr = savedAddresses[i];
    if (!addr) return;
    selectedAddress = { ...addr };
    localStorage.setItem('selected_address', JSON.stringify(selectedAddress));
    restoreAddressUI();
    closeAddressesSheet();
}

function createNewAddress() {
    closeAddressesSheet();
    showMap();
}

function toggleCourierComment() {
    const input = document.getElementById('comment-input');
    const arrow = document.getElementById('courier-arrow');
    const visible = input.style.display !== 'none';
    input.style.display = visible ? 'none' : 'block';
    arrow.classList.toggle('rotated', !visible);
    if (!visible) input.focus();
}

// Map state
let map = null;
let mapMarker = null;
let pendingAddress = null; // { lat, lng, label } while picking
let reverseTimer = null;

// ============================================
// API
// ============================================

const COMMON_HEADERS = {};

function readHashInitData() {
    try {
        const hash = window.location.hash.substring(1);
        if (!hash) return '';
        const params = new URLSearchParams(hash);
        return params.get('tgWebAppData') || '';
    } catch {
        return '';
    }
}

const INIT_DATA_CACHE_KEY = 'tg_init_data_cache';

function cacheInitData(value) {
    if (!value) return;
    try {
        localStorage.setItem(INIT_DATA_CACHE_KEY, JSON.stringify({ value, at: Date.now() }));
    } catch {}
}

function readCachedInitData() {
    try {
        const raw = localStorage.getItem(INIT_DATA_CACHE_KEY);
        if (!raw) return '';
        const { value, at } = JSON.parse(raw);
        // Telegram signed initData expires after 24h; cache for 23h to be safe.
        if (!value || Date.now() - at > 23 * 3600 * 1000) return '';
        return value;
    } catch {
        return '';
    }
}

function getInitData() {
    if (tg.initData && tg.initData.length > 0) {
        cacheInitData(tg.initData);
        return tg.initData;
    }

    // Telegram bazan initData ni SDK'ga emas, URL hash'ga qo'yadi.
    const hashData = readHashInitData();
    if (hashData) {
        cacheInitData(hashData);
        return hashData;
    }

    // Oxirgi ishlatilgan initData — sahifa reload bo'lsa yoki hash yo'qolsa
    const cached = readCachedInitData();
    if (cached) return cached;

    // DEBUG fallback (backend'da DEBUG=True bo'lsa): faqat user.id mavjud bo'lsa
    const u = tg.initDataUnsafe?.user;
    if (u && u.id) {
        return JSON.stringify({
            id: u.id,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            username: u.username || '',
        });
    }

    console.warn('[getInitData] BOSH! tg.initData=', tg.initData,
                 'initDataUnsafe=', tg.initDataUnsafe,
                 'hash=', window.location.hash.substring(0, 200));
    return '';
}

async function apiGet(endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(`${API_BASE}/api/${endpoint}${sep}lang=${LANG}`, { headers: COMMON_HEADERS });
    if (!res.ok) throw new Error(`API xato: ${res.status}`);
    return res.json();
}

const AUTH_REASON_MSG = {
    uz: {
        empty_init_data: "Botdan \"Menyu\" tugmasi orqali qaytadan oching",
        auth_date_expired: "Sessiya muddati tugadi. Botdan \"Menyu\" ni qaytadan oching",
        hash_missing: "Telegram identifikatsiyasi to'liq emas. Botdan qaytadan oching",
    },
    ru: {
        empty_init_data: "Откройте заново через кнопку \"Меню\" в боте",
        auth_date_expired: "Сессия истекла. Откройте \"Меню\" в боте заново",
        hash_missing: "Идентификация Telegram неполная. Откройте через бот заново",
    },
};

function translateAuthReason(reason) {
    if (!reason) return '';
    const table = AUTH_REASON_MSG[LANG] || AUTH_REASON_MSG.uz;
    for (const key of Object.keys(table)) {
        if (reason.startsWith(key)) return table[key];
    }
    return reason;
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...COMMON_HEADERS },
        body: JSON.stringify({ ...data, initData: getInitData() }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const baseMsg = err.error || `API xato: ${res.status}`;
        const friendly = translateAuthReason(err.reason);
        const suffix = friendly ? `: ${friendly}` : (err.reason ? ` (${err.reason})` : '');
        throw new Error(baseMsg + suffix);
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
        renderCategoriesScroll();
        await loadAllProducts();
    } catch (e) {
        console.error('Kategoriyalar yuklanmadi:', e);
        document.getElementById('categories-scroll').innerHTML =
            `<div class="empty-state">${txt('categories_error')}</div>`;
    }
}

async function loadAllProducts() {
    try {
        const data = await apiGet('products/');
        products = data.results || data;
        renderAllCategoryProducts();
    } catch (e) {
        console.error('Mahsulotlar yuklanmadi:', e);
    }
}

async function loadProducts(categoryId) {
    try {
        const endpoint = categoryId
            ? `products/?category_id=${categoryId}`
            : 'products/';
        const data = await apiGet(endpoint);
        products = data.results || data;
    } catch (e) {
        console.error('Mahsulotlar yuklanmadi:', e);
    }
}

function renderAllCategoryProducts() {
    const container = document.getElementById('all-products-section');

    if (!categories.length) {
        container.innerHTML = `<div class="empty-state">${txt('no_categories')}</div>`;
        return;
    }

    let html = '';
    categories.forEach(cat => {
        let catProducts = products.filter(p => p.category === cat.id);
        if (searchQuery) {
            catProducts = catProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (!catProducts.length) return;

        html += `<div class="category-block" id="cat-${cat.id}">`;
        html += `<div class="category-block-title">${escapeHtml(cat.name)}</div>`;
        html += `<div class="products-hscroll">`;

        catProducts.forEach(product => {
            const qty = cart[product.id]?.quantity || 0;
            const safeName = escapeHtml(product.name);
            const imageHtml = product.image
                ? `<img class="product-image" src="${encodeURI(product.image)}" alt="${safeName}" loading="lazy">`
                : `<div class="product-image no-image">🍽️</div>`;

            if (qty > 0) {
                html += `
                <div class="product-hcard in-cart" onclick="openProductDetail(${product.id})">
                    ${imageHtml}
                    <div class="product-info">
                        <div class="product-name">${safeName}</div>
                    </div>
                    <div class="hcard-cart-row" onclick="event.stopPropagation()">
                        <button class="hcard-qty-btn" onclick="changeQty(${product.id}, -1)">−</button>
                        <span class="hcard-qty-val">${qty}</span>
                        <button class="hcard-qty-btn hcard-plus" onclick="changeQty(${product.id}, 1)">+</button>
                    </div>
                </div>`;
            } else {
                html += `
                <div class="product-hcard" onclick="openProductDetail(${product.id})">
                    ${imageHtml}
                    <div class="product-info">
                        <div class="product-name">${safeName}</div>
                        <div class="product-price-row">
                            <div class="product-price">${formatPrice(product.price)} UZS</div>
                        </div>
                    </div>
                </div>`;
            }
        });

        html += `</div></div>`;
    });

    container.innerHTML = html || `<div class="empty-state">${txt('no_products')}</div>`;
}

// ============================================
// Render
// ============================================

function renderCategoriesScroll() {
    const container = document.getElementById('categories-scroll');

    if (!categories.length) {
        container.innerHTML = `<div class="empty-state">${txt('no_categories')}</div>`;
        return;
    }

    let html = '';
    categories.forEach(cat => {
        const active = cat.id === selectedCategory ? 'active' : '';
        const safeName = escapeHtml(cat.name);
        const img = cat.image
            ? `<img class="category-chip-image" src="${encodeURI(cat.image)}" alt="${safeName}" loading="lazy">`
            : `<div class="category-chip-image no-image">🍽️</div>`;
        html += `
        <div class="category-chip ${active}" onclick="selectCategory(${cat.id}, '${escapeAttr(cat.name)}')">
            ${img}
            <div class="category-chip-name">${safeName}</div>
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
        container.innerHTML = `<div class="empty-state">${txt('no_products')}</div>`;
        return;
    }

    let html = '';
    list.forEach(product => {
        const qty = cart[product.id]?.quantity || 0;
        const safeName = escapeHtml(product.name);
        const imageHtml = product.image
            ? `<img class="product-image" src="${encodeURI(product.image)}" alt="${safeName}" loading="lazy">`
            : `<div class="product-image no-image">🍽️</div>`;

        html += `
        <div class="product-card">
            ${imageHtml}
            <div class="product-info">
                <div class="product-name">${safeName}</div>
                <div class="product-price">${formatPrice(product.price)} UZS</div>
                <div class="product-actions">
                    ${qty === 0
                        ? `<button class="btn-add" onclick="addToCart(${product.id})">${txt('add_btn')}</button>`
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
        container.innerHTML = `<div class="empty-state">${txt('cart_empty')}</div>`;
        return;
    }

    let html = '';
    items.forEach(item => {
        const safeName = escapeHtml(item.name);
        const imgHtml = item.image
            ? `<img class="cart-page-item-img" src="${encodeURI(item.image)}" alt="${safeName}">`
            : `<div class="cart-page-item-img" style="display:flex;align-items:center;justify-content:center;font-size:24px;">🍽️</div>`;
        html += `
        <div class="cart-page-item">
            ${imgHtml}
            <div class="cart-page-item-info">
                <div class="cart-page-item-name">${safeName}</div>
                <div class="cart-page-item-price">${formatPrice(item.price * item.quantity)} UZS</div>
            </div>
            <div class="cart-page-item-qty">
                <button class="cpq-btn" onclick="cartChangeQty(${item.id}, -1)">−</button>
                <span class="cpq-val">${item.quantity}</span>
                <button class="cpq-btn cpq-plus" onclick="cartChangeQty(${item.id}, 1)">+</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function cartChangeQty(productId, delta) {
    if (!cart[productId]) return;

    cart[productId].quantity += delta;
    if (cart[productId].quantity <= 0) {
        delete cart[productId];
    }

    if (Object.keys(cart).length === 0) {
        hideCart();
    }

    updateCartUI();
    renderCart();
    renderAllCategoryProducts();
    tg.HapticFeedback?.impactOccurred('light');
}

function showClearCartDialog() {
    document.getElementById('clear-cart-dialog').style.display = 'flex';
}

function hideClearCartDialog() {
    document.getElementById('clear-cart-dialog').style.display = 'none';
}

function clearCart() {
    cart = {};
    hideClearCartDialog();
    hideCart();
    updateCartUI();
    renderAllCategoryProducts();
    tg.HapticFeedback?.notificationOccurred('success');
}

function renderOrderSummary() {
    const container = document.getElementById('order-summary');
    const items = Object.values(cart);
    const total = getCartTotal();

    let html = '';
    items.forEach(item => {
        html += `
        <div class="order-summary-item">
            <span>${escapeHtml(item.name)} x${item.quantity}</span>
            <span>${formatPrice(item.price * item.quantity)} UZS</span>
        </div>`;
    });
    html += `
    <div class="order-summary-total">
        <span>${txt('total')}</span>
        <span>${formatPrice(total)} UZS</span>
    </div>`;
    container.innerHTML = html;

    const addrText = document.getElementById('checkout-address-text');
    if (addrText) {
        addrText.textContent = selectedAddress ? selectedAddress.label : txt('address_not_selected');
    }
}

// ============================================
// Navigation
// ============================================

function selectCategory(id, name) {
    selectedCategory = id;
    renderCategoriesScroll();
    const el = document.getElementById(`cat-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function runSearch() {
    const q = document.getElementById('search-input').value.trim();
    searchQuery = q;
    if (!q) {
        renderAllCategoryProducts();
        return;
    }
    renderAllCategoryProducts();
}

// ============================================
// Cart
// ============================================

// Product detail modal
let pdProduct = null;
let pdQty = 1;

function openProductDetail(productId) {
    pdProduct = products.find(p => p.id === productId);
    if (!pdProduct) return;

    pdQty = cart[productId]?.quantity || 1;

    // Find category name
    const cat = categories.find(c => c.id === pdProduct.category);
    document.getElementById('pd-cat-name').textContent = cat ? cat.name : '';
    document.getElementById('pd-image').src = pdProduct.image || '';
    document.getElementById('pd-name').textContent = pdProduct.name;
    document.getElementById('pd-price').textContent = formatPrice(pdProduct.price) + ' UZS';
    document.getElementById('pd-desc').textContent = pdProduct.description || '';
    document.getElementById('pd-qty').textContent = pdQty;
    updatePdButton();

    document.getElementById('product-detail-modal').style.display = 'flex';
    tg.HapticFeedback?.impactOccurred('light');
}

function updatePdButton() {
    const btn = document.getElementById('pd-add-btn');
    const inCart = cart[pdProduct.id];
    if (inCart) {
        btn.innerHTML = '🛒 ' + txt('go_to_cart');
        btn.className = 'pd-add-btn go-to-cart';
        btn.onclick = () => { hideProductDetail(); showCart(); };
    } else {
        btn.innerHTML = '🛒 ' + txt('add_to_cart');
        btn.className = 'pd-add-btn';
        btn.onclick = pdAddToCart;
    }
}

function hideProductDetail() {
    document.getElementById('product-detail-modal').style.display = 'none';
}

function pdChangeQty(delta) {
    pdQty = Math.max(1, pdQty + delta);
    document.getElementById('pd-qty').textContent = pdQty;
    tg.HapticFeedback?.impactOccurred('light');
}

function pdAddToCart() {
    if (!pdProduct) return;

    const doAdd = () => {
        cart[pdProduct.id] = {
            id: pdProduct.id,
            name: pdProduct.name,
            price: Number(pdProduct.price),
            image: pdProduct.image || '',
            quantity: pdQty,
        };

        updateCartUI();
        renderAllCategoryProducts();
        hideProductDetail();
        tg.HapticFeedback?.notificationOccurred('success');
    };

    ensureAddress(doAdd);
}

// Pending action after address is chosen
let pendingAfterAddress = null;

function ensureAddress(callback) {
    if (selectedAddress) {
        callback();
        return;
    }
    pendingAfterAddress = callback;
    showAddressRequired();
}

function showAddressRequired() {
    document.getElementById('address-required-modal').style.display = 'flex';
}

function hideAddressRequired(event) {
    if (event && event.target.id !== 'address-required-modal') {
        if (event.currentTarget && event.currentTarget.id !== 'address-required-modal') return;
    }
    document.getElementById('address-required-modal').style.display = 'none';
}

function useAutoLocation() {
    if (!navigator.geolocation) {
        pickAddressManually();
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            hideAddressRequired();
            showMap();
            // Wait for map to init, then set position
            setTimeout(() => {
                if (map && mapMarker) {
                    const ll = [lat, lng];
                    map.setView(ll, 17);
                    mapMarker.setLatLng(ll);
                    scheduleReverse(lat, lng);
                }
            }, 300);
        },
        () => {
            pickAddressManually();
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function pickAddressManually() {
    hideAddressRequired();
    showMap();
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    ensureAddress(() => openProductDetail(productId));
}

function changeQty(productId, delta) {
    if (!cart[productId]) return;

    cart[productId].quantity += delta;
    if (cart[productId].quantity <= 0) delete cart[productId];

    updateCartUI();
    renderAllCategoryProducts();
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
        fab.style.display = 'flex';
        document.getElementById('cart-total').textContent = formatPrice(total);
    } else {
        fab.style.display = 'none';
    }

    document.getElementById('cart-modal-total').textContent = formatPrice(total) + ' UZS';

    const checkoutBtn = document.getElementById('checkout-btn');
    if (total < MIN_ORDER_AMOUNT && count > 0) {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = `<span>${txt('continue_btn')}</span><span class="min-order-hint">Min. buyurtma ${formatPrice(MIN_ORDER_AMOUNT)} UZS</span>`;
    } else {
        checkoutBtn.disabled = count === 0;
        checkoutBtn.innerHTML = `<span>${txt('continue_btn')}</span>`;
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
        errEl.textContent = txt('phone_error');
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
    showToast(txt('register_success'));
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
        body.innerHTML = `<div class="chat-empty">${txt('no_messages')}</div>`;
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
        showToast(txt('chat_error'));
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
    ensureAddress(() => {
        hideCart();
        renderOrderSummary();
        document.getElementById('checkout-modal').style.display = 'flex';
    });
}

function hideCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
}

// ============================================
// Map (Yandex Maps)
// ============================================

function showMap() {
    document.getElementById('map-modal').style.display = 'flex';
    if (window.ymaps) {
        ymaps.ready(() => setTimeout(initMap, 50));
    } else {
        setTimeout(() => showMap(), 200);
    }
}

function hideMap() {
    document.getElementById('map-modal').style.display = 'none';
}

function initMap() {
    const container = document.getElementById('map-container');
    if (map) {
        map.container.fitToViewport();
        return;
    }

    const start = selectedAddress
        ? [selectedAddress.lat, selectedAddress.lng]
        : [41.3111, 69.2797]; // Tashkent default

    map = new ymaps.Map(container, {
        center: start,
        zoom: 16,
        controls: [],
    }, { suppressMapOpenBlock: true });

    const pinLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="yandex-pin"><svg viewBox="0 0 24 32" fill="#4CAF50"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"/><circle cx="12" cy="12" r="5" fill="#ffffff"/></svg></div>'
    );

    mapMarker = new ymaps.Placemark(start, {}, {
        iconLayout: pinLayout,
        iconShape: { type: 'Rectangle', coordinates: [[-16, -32], [16, 0]] },
        draggable: true,
    });
    map.geoObjects.add(mapMarker);

    mapMarker.events.add('dragend', () => {
        const coords = mapMarker.geometry.getCoordinates();
        map.panTo(coords);
        scheduleReverse(coords[0], coords[1]);
    });

    map.events.add('click', (e) => {
        const coords = e.get('coords');
        mapMarker.geometry.setCoordinates(coords);
        scheduleReverse(coords[0], coords[1]);
    });

    map.events.add('boundschange', () => {
        if (!mapMarker) return;
        const center = map.getCenter();
        mapMarker.geometry.setCoordinates(center);
        scheduleReverse(center[0], center[1]);
    });

    // Custom zoom buttons
    document.getElementById('map-zoom-in').onclick = () => map.setZoom(map.getZoom() + 1, { duration: 200 });
    document.getElementById('map-zoom-out').onclick = () => map.setZoom(map.getZoom() - 1, { duration: 200 });
    document.getElementById('map-locate').onclick = locateUser;

    // Initial geolocate
    locateUser();
    scheduleReverse(start[0], start[1]);

    // Search via Yandex Geocoder + Nominatim fallback
    const searchInput = document.getElementById('map-search-input');
    searchInput.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter') return;
        const q = searchInput.value.trim();
        if (!q) return;
        const found = await forwardGeocode(q);
        if (found) {
            map.setCenter([found.lat, found.lng], 17);
            mapMarker.geometry.setCoordinates([found.lat, found.lng]);
            setPending(found.lat, found.lng, found.label);
        }
    });
}

async function forwardGeocodeYandex(query) {
    if (!window.ymaps || !ymaps.geocode) return null;
    try {
        const result = await ymaps.geocode(query, { results: 1 });
        const firstGeoObject = result.geoObjects.get(0);
        if (!firstGeoObject) return null;
        const coords = firstGeoObject.geometry.getCoordinates();
        return { lat: coords[0], lng: coords[1], label: firstGeoObject.getAddressLine() || query };
    } catch (e) {
        console.warn('Yandex forward geocode xato:', e);
        return null;
    }
}

async function forwardGeocodeNominatim(query) {
    try {
        const langParam = LANG === 'ru' ? 'ru' : 'uz,ru,en';
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=${langParam}&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const arr = await res.json();
        if (!arr.length) return null;
        const hit = arr[0];
        return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon), label: hit.display_name || query };
    } catch (e) {
        console.warn('Nominatim forward geocode xato:', e);
        return null;
    }
}

async function forwardGeocode(query) {
    return (await forwardGeocodeYandex(query)) || (await forwardGeocodeNominatim(query));
}

function locateUser() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const coords = [pos.coords.latitude, pos.coords.longitude];
            if (map) {
                map.setCenter(coords, 17);
                mapMarker.geometry.setCoordinates(coords);
                scheduleReverse(coords[0], coords[1]);
            }
        },
        (err) => console.warn('Geo xato:', err),
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

function setPending(lat, lng, label) {
    pendingAddress = { lat, lng, label };
    document.getElementById('map-selected-label').textContent = label;
}

function isCoordsLabel(label) {
    return !label || /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(label);
}

async function reverseGeocodeYandex(lat, lng) {
    if (!window.ymaps || !ymaps.geocode) return '';
    try {
        const result = await ymaps.geocode([lat, lng], { results: 1 });
        const firstGeoObject = result.geoObjects.get(0);
        return firstGeoObject ? (firstGeoObject.getAddressLine() || '') : '';
    } catch (e) {
        console.warn('Yandex reverse geocode xato:', e);
        return '';
    }
}

async function reverseGeocodeNominatim(lat, lng) {
    try {
        const langParam = LANG === 'ru' ? 'ru' : 'uz,ru,en';
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${langParam}&zoom=18`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return '';
        const data = await res.json();
        return data.display_name || '';
    } catch (e) {
        console.warn('Nominatim reverse geocode xato:', e);
        return '';
    }
}

async function reverseGeocode(lat, lng) {
    const yandex = await reverseGeocodeYandex(lat, lng);
    if (yandex) return yandex;
    const nominatim = await reverseGeocodeNominatim(lat, lng);
    if (nominatim) return nominatim;
    return '';
}

function scheduleReverse(lat, lng) {
    const labelEl = document.getElementById('map-selected-label');
    labelEl.textContent = txt('address_detecting');
    pendingAddress = { lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };

    if (reverseTimer) clearTimeout(reverseTimer);
    reverseTimer = setTimeout(async () => {
        const label = await reverseGeocode(lat, lng);
        if (label && pendingAddress && pendingAddress.lat === lat && pendingAddress.lng === lng) {
            setPending(lat, lng, label);
        }
    }, 400);
}

async function confirmLocation() {
    if (!pendingAddress) return;

    // Agar label hali koordinata bo'lsa, reverse geocode ni kutish
    if (isCoordsLabel(pendingAddress.label)) {
        const label = await reverseGeocode(pendingAddress.lat, pendingAddress.lng);
        if (label) {
            pendingAddress.label = label;
        }
    }
    selectedAddress = { ...pendingAddress };
    saveAddress();
    const label = selectedAddress.label;
    document.getElementById('address-text').textContent = label.length > 40
        ? label.slice(0, 40) + '…'
        : label;
    const checkoutAddrText = document.getElementById('checkout-address-text');
    if (checkoutAddrText) checkoutAddrText.textContent = label;
    hideMap();
    tg.HapticFeedback?.notificationOccurred('success');
    if (pendingAfterAddress) {
        const cb = pendingAfterAddress;
        pendingAfterAddress = null;
        cb();
    }
}

// ============================================
// Submit order
// ============================================

async function submitOrder() {
    if (deliveryMethod === 'delivery' && !selectedAddress) {
        alert(txt('select_address'));
        return;
    }

    const comment = document.getElementById('comment-input').value.trim();
    const entrance = document.getElementById('checkout-entrance').value.trim();
    const floor = document.getElementById('checkout-floor').value.trim();
    const apartment = document.getElementById('checkout-apartment').value.trim();

    const items = Object.values(cart).map(item => ({
        product_id: item.id,
        quantity: item.quantity,
    }));

    const fullComment = [
        entrance && `Kirish: ${entrance}`,
        floor && `Qavat: ${floor}`,
        apartment && `Xona: ${apartment}`,
        comment,
    ].filter(Boolean).join(' | ');

    const submitBtn = document.getElementById('submit-order-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = txt('sending');

    try {
        await apiPost('order/', {
            items,
            address: deliveryMethod === 'pickup' ? 'Pickup (olib ketish)' : selectedAddress.label,
            comment: fullComment,
            latitude: deliveryMethod === 'pickup' ? null : selectedAddress?.lat,
            longitude: deliveryMethod === 'pickup' ? null : selectedAddress?.lng,
            delivery_method: deliveryMethod,
        });

        hideCheckout();
        cart = {};
        updateCartUI();
        renderAllCategoryProducts();
        document.getElementById('success-modal').style.display = 'flex';
        tg.HapticFeedback?.notificationOccurred('success');
    } catch (e) {
        alert(e.message || txt('error_occurred'));
        tg.HapticFeedback?.notificationOccurred('error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = txt('confirm_order');
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
            renderAllCategoryProducts();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runSearch();
        });
    }
});

// ============================================
// Init
// ============================================

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = txt(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });
}

function restoreAddressUI() {
    if (!selectedAddress) return;
    const label = selectedAddress.label;
    const el = document.getElementById('address-text');
    if (el) {
        el.textContent = label.length > 40 ? label.slice(0, 40) + '…' : label;
    }
    const checkoutAddrText = document.getElementById('checkout-address-text');
    if (checkoutAddrText) checkoutAddrText.textContent = label;
}

async function init() {
    applyTranslations();
    restoreAddressUI();
    try {
        await apiPost('auth/', {});
    } catch (e) {
        console.error('Auth xato:', e);
    }
    await loadCategories();
}

init();
