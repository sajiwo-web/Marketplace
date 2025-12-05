let produkList = [];
let adminLoginState = localStorage.getItem('adminLogin') === 'true';
let currentSearch = '';
let currentCategory = 'all';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let categories = ['all', 'elektronik', 'fashion', 'makanan', 'buku', 'olahraga'];

function formatRupiah(amount) {
    return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function sanitizeInput(input) {
    if (!input) return '';
    return input.toString()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const maxWidth = 800;
                const maxHeight = 600;
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    } else {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressed = canvas.toDataURL('image/jpeg', 0.7);
                const base64Length = compressed.length - (compressed.indexOf(',') + 1);
                const padding = compressed.charAt(compressed.length - 2) === '=' ? 2 : 
                               compressed.charAt(compressed.length - 1) === '=' ? 1 : 0;
                const fileSize = base64Length * 0.75 - padding;
                
                if (fileSize > 500 * 1024) {
                    reject('Ukuran gambar terlalu besar setelah kompresi. Maksimal 500KB.');
                    return;
                }
                resolve(compressed);
            };
            img.onerror = () => reject('Gagal memuat gambar');
        };
        reader.onerror = () => reject('Gagal membaca file');
    });
}

function previewImage(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!input.files || !input.files[0]) {
        preview.innerHTML = '<p>Pratinjau gambar akan muncul di sini</p>';
        return;
    }
    
    const file = input.files[0];
    if (!file.type.match('image.*')) {
        preview.innerHTML = '<p style="color:red;">File harus berupa gambar</p>';
        input.value = '';
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        preview.innerHTML = '<p style="color:red;">Ukuran file maksimal 2MB</p>';
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = event => {
        preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function hapusGambarEdit() {
    document.getElementById('preview-edit').innerHTML = '<p>Gambar akan dihapus saat disimpan</p>';
    document.getElementById('edit-gambar').value = '';
}

async function loadFromFirestore() {
    try {
        showLoading(true);
        const produkRef = firebaseModules.collection(db, 'produk');
        const q = firebaseModules.query(produkRef, firebaseModules.orderBy('tanggal', 'desc'));
        const snapshot = await firebaseModules.getDocs(q);
        
        produkList = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const tanggal = data.tanggal ? data.tanggal.toDate() : new Date();
            produkList.push({
                id: doc.id,
                ...data,
                tanggal: tanggal
            });
        });
        
        renderProduk();
        updateProductCount();
        updateCartCount();
        showLoading(false);
    } catch (error) {
        console.error("Error loading products:", error);
        showLoading(false);
        document.getElementById('firebase-status').textContent = '❌ Error loading data';
        document.getElementById('firebase-status').style.color = '#dc3545';
    }
}

async function tambahProduk() {
    const nama = document.getElementById('input-nama').value.trim();
    const harga = parseInt(document.getElementById('input-harga').value);
    const nomor = document.getElementById('input-nomor').value.trim();
    const deskripsi = document.getElementById('input-deskripsi').value.trim();
    const kategori = document.getElementById('input-kategori').value;
    const gambarInput = document.getElementById('input-gambar');
    
    if (!nama || nama.length < 3) {
        showToast('Nama produk minimal 3 karakter!', 'error');
        return;
    }
    
    if (isNaN(harga) || harga < 1000 || harga > 10000000) {
        showToast('Harga harus antara Rp 1.000 - Rp 10.000.000!', 'error');
        return;
    }
    
    if (!/^62\d{9,12}$/.test(nomor)) {
        showToast('Nomor WA harus diawali 62 dan 10-13 digit angka!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        let gambar = null;
        if (gambarInput.files[0]) {
            try {
                gambar = await compressImageToBase64(gambarInput.files[0]);
            } catch (error) {
                showToast(`Error kompresi gambar: ${error}`, 'error');
                showLoading(false);
                return;
            }
        }
        
        const produkBaru = {
            nama: sanitizeInput(nama),
            harga: harga,
            nomorWa: nomor,
            deskripsi: sanitizeInput(deskripsi) || '',
            kategori: kategori || 'umum',
            gambar: gambar,
            tanggal: firebaseModules.serverTimestamp(),
            createdAt: new Date().toISOString(),
            rating: 0,
            ratingCount: 0
        };
        
        await firebaseModules.addDoc(firebaseModules.collection(db, 'produk'), produkBaru);
        
        document.getElementById('input-nama').value = '';
        document.getElementById('input-harga').value = '';
        document.getElementById('input-nomor').value = '';
        document.getElementById('input-deskripsi').value = '';
        document.getElementById('input-kategori').value = 'umum';
        document.getElementById('input-gambar').value = '';
        document.getElementById('preview-tambah').innerHTML = '<p>Pratinjau gambar akan muncul di sini</p>';
        
        await loadFromFirestore();
        showToast(`✅ Produk "${nama}" berhasil ditambahkan!`);
    } catch (error) {
        console.error("Error adding product:", error);
        showToast('❌ Gagal menambah produk: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function filterByCategory(category) {
    currentCategory = category;
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    renderProduk();
}

function addToCart(productId, quantity = 1) {
    const product = produkList.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            nama: product.nama,
            harga: product.harga,
            gambar: product.gambar,
            quantity: quantity
        });
    }
    
    updateCart();
    showToast(`✅ ${product.nama} ditambahkan ke keranjang`);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    showToast('🗑️ Produk dihapus dari keranjang');
}

function updateCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('❤️ Dihapus dari favorit');
    } else {
        wishlist.push(productId);
        showToast('❤️ Ditambahkan ke favorit');
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    renderProduk();
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('open');
}

function closeCart() {
    document.getElementById('cart-sidebar').classList.remove('open');
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px;">Keranjang kosong</p>';
        totalElement.textContent = formatRupiah(0);
        return;
    }
    
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.harga * item.quantity;
        total += itemTotal;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-img">
                ${item.gambar ? `<img src="${item.gambar}" alt="${item.nama}">` : '<div style="background:#eee; width:100%; height:100%;"></div>'}
            </div>
            <div class="cart-item-info">
                <h4 style="margin:0 0 5px 0;">${item.nama}</h4>
                <p style="margin:0; color:#666;">${formatRupiah(item.harga)}</p>
            </div>
            <div class="cart-item-actions">
                <input type="number" value="${item.quantity}" min="1" 
                    style="width:60px; padding:5px; text-align:center;"
                    onchange="updateCartQuantity('${item.id}', this.value)">
                <button onclick="removeFromCart('${item.id}')" style="background:#dc3545; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">
                    Hapus
                </button>
            </div>
        `;
        container.appendChild(div);
    });
    
    totalElement.textContent = formatRupiah(total);
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item && quantity > 0) {
        item.quantity = parseInt(quantity);
        updateCart();
    }
}

function checkoutCart() {
    if (cart.length === 0) {
        showToast('Keranjang kosong!', 'error');
        return;
    }
    
    let message = 'Halo, saya ingin membeli produk berikut:\n\n';
    let total = 0;
    
    cart.forEach(item => {
        message += `📦 ${item.nama}\n`;
        message += `   Jumlah: ${item.quantity}\n`;
        message += `   Harga: ${formatRupiah(item.harga)} x ${item.quantity} = ${formatRupiah(item.harga * item.quantity)}\n\n`;
        total += item.harga * item.quantity;
    });
    
    message += `💵 *Total: ${formatRupiah(total)}*\n\n`;
    message += 'Mohon konfirmasi ketersediaan dan total pembayaran. Terima kasih!';
    
    const phoneNumber = '6281234567890';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    cart = [];
    updateCart();
    closeCart();
}

async function editProduk(index) {
    const product = produkList[index];
    if (!product) return;
    
    document.getElementById('edit-section').style.display = 'block';
    document.getElementById('edit-index').value = index;
    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-nama').value = product.nama;
    document.getElementById('edit-harga').value = product.harga;
    document.getElementById('edit-nomor').value = product.nomorWa;
    document.getElementById('edit-deskripsi').value = product.deskripsi || '';
    document.getElementById('edit-kategori').value = product.kategori || 'umum';
    
    const preview = document.getElementById('preview-edit');
    if (product.gambar) {
        preview.innerHTML = `<img src="${product.gambar}" alt="Gambar saat ini">`;
    } else {
        preview.innerHTML = '<p>Produk ini belum memiliki gambar</p>';
    }
    
    document.getElementById('edit-gambar').value = '';
    document.getElementById('edit-section').scrollIntoView({ behavior: 'smooth' });
}

async function simpanEdit() {
    const index = document.getElementById('edit-index').value;
    const id = document.getElementById('edit-id').value;
    const nama = document.getElementById('edit-nama').value.trim();
    const harga = parseInt(document.getElementById('edit-harga').value);
    const nomor = document.getElementById('edit-nomor').value.trim();
    const deskripsi = document.getElementById('edit-deskripsi').value.trim();
    const kategori = document.getElementById('edit-kategori').value;
    const gambarInput = document.getElementById('edit-gambar');
    
    if (!nama || nama.length < 3) {
        showToast('Nama produk minimal 3 karakter!', 'error');
        return;
    }
    
    if (isNaN(harga) || harga < 1000 || harga > 10000000) {
        showToast('Harga harus antara Rp 1.000 - Rp 10.000.000!', 'error');
        return;
    }
    
    if (!/^62\d{9,12}$/.test(nomor)) {
        showToast('Nomor WA harus diawali 62 dan 10-13 digit angka!', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const product = produkList[index];
        let gambar = product.gambar;
        
        if (gambarInput.files[0]) {
            try {
                gambar = await compressImageToBase64(gambarInput.files[0]);
            } catch (error) {
                showToast(`Error kompresi gambar: ${error}`, 'error');
                showLoading(false);
                return;
            }
        } else if (document.getElementById('preview-edit').innerHTML.includes('Gambar akan dihapus')) {
            gambar = null;
        }
        
        const updatedProduct = {
            nama: sanitizeInput(nama),
            harga: harga,
            nomorWa: nomor,
            deskripsi: sanitizeInput(deskripsi) || '',
            kategori: kategori || 'umum',
            gambar: gambar,
            updatedAt: new Date().toISOString()
        };
        
        const productRef = firebaseModules.doc(db, 'produk', id);
        await firebaseModules.updateDoc(productRef, updatedProduct);
        
        batalEdit();
        await loadFromFirestore();
        showToast('✅ Produk berhasil diupdate!');
    } catch (error) {
        console.error("Error updating product:", error);
        showToast('❌ Gagal mengupdate produk: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function hapusProduk(index) {
    const product = produkList[index];
    if (!product) return;
    
    if (!confirm(`Yakin ingin menghapus produk "${product.nama}"?`)) return;
    
    try {
        showLoading(true);
        const productRef = firebaseModules.doc(db, 'produk', product.id);
        await firebaseModules.deleteDoc(productRef);
        
        produkList.splice(index, 1);
        renderProduk();
        renderAdminProducts();
        updateProductCount();
        showToast('✅ Produk berhasil dihapus!');
    } catch (error) {
        console.error("Error deleting product:", error);
        showToast('❌ Gagal menghapus produk: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function batalEdit() {
    document.getElementById('edit-section').style.display = 'none';
    document.getElementById('edit-index').value = '';
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-nama').value = '';
    document.getElementById('edit-harga').value = '';
    document.getElementById('edit-nomor').value = '';
    document.getElementById('edit-deskripsi').value = '';
    document.getElementById('edit-kategori').value = 'umum';
    document.getElementById('edit-gambar').value = '';
    document.getElementById('preview-edit').innerHTML = '<p>Gambar saat ini akan muncul di sini</p>';
}

function renderProduk(searchTerm) {
    const container = document.getElementById('daftar-produk');
    const emptyMessage = document.getElementById('no-products');
    if (!container) return;
    
    container.innerHTML = '';
    
    let filtered = produkList;
    
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.kategori === currentCategory);
    }
    
    if (searchTerm && searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(p => 
            p.nama.toLowerCase().includes(term) || 
            (p.deskripsi && p.deskripsi.toLowerCase().includes(term))
        );
    }
    
    if (filtered.length === 0) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.innerHTML = searchTerm ? 
            `<p>Tidak ditemukan produk dengan kata kunci "${searchTerm}"</p>` :
            '<p>Belum ada produk tersedia.</p>';
    } else {
        container.style.display = 'flex';
        emptyMessage.style.display = 'none';
        
        filtered.forEach((product, index) => {
            const originalIndex = produkList.findIndex(p => p.id === product.id);
            const isWishlisted = wishlist.includes(product.id);
            
            const card = document.createElement('div');
            card.className = 'produk-card';
            
            const tanggal = product.tanggal ? product.tanggal.toLocaleDateString('id-ID') : '';
            
            let gambarHTML = '';
            if (product.gambar) {
                gambarHTML = `<div class="produk-gambar"><img src="${product.gambar}" alt="${sanitizeInput(product.nama)}"></div>`;
            } else {
                gambarHTML = `<div class="produk-gambar"><div class="produk-gambar-placeholder"><p>🖼️<br><small>Tidak ada gambar</small></p></div></div>`;
            }
            
            card.innerHTML = `
                ${tanggal ? `<small style="color:#666; display:block; margin-bottom:5px;">${tanggal}</small>` : ''}
                <div class="product-badges">
                    ${product.kategori === 'baru' ? '<span class="badge new">BARU</span>' : ''}
                    ${product.diskon ? '<span class="badge discount">DISKON</span>' : ''}
                </div>
                <button class="wishlist-btn" onclick="toggleWishlist('${product.id}')">
                    ${isWishlisted ? '❤️' : '🤍'}
                </button>
                ${gambarHTML}
                <div class="produk-info">
                    <h3>${sanitizeInput(product.nama)}</h3>
                    ${product.rating > 0 ? `
                        <div class="rating">
                            ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
                            <span class="rating-count">(${product.ratingCount || 0})</span>
                        </div>
                    ` : ''}
                    <div class="produk-harga">${formatRupiah(product.harga)}</div>
                    ${product.deskripsi ? `<div class="produk-deskripsi">${sanitizeInput(product.deskripsi)}</div>` : ''}
                    <button class="tombol-beli" onclick="handleBeliClick(${originalIndex})">💬 Beli via WhatsApp</button>
                    <button class="tombol-beli" style="background:#6C757D; margin-top:8px;" onclick="addToCart('${product.id}', 1)">🛒 Tambah ke Keranjang</button>
                    ${adminLoginState ? `
                        <div class="admin-actions">
                            <button class="btn-edit" onclick="editProduk(${originalIndex})">✏️ Edit</button>
                            <button class="btn-hapus" onclick="hapusProduk(${originalIndex})">🗑️ Hapus</button>
                        </div>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    }
}

function handleBeliClick(index) {
    const product = produkList[index];
    if (!product) return;
    
    const message = `Halo, saya tertarik untuk membeli produk:\n\n📦 *${product.nama}*\n💰 Harga: ${formatRupiah(product.harga)}\n${product.deskripsi ? `📝 ${product.deskripsi}\n\n` : '\n'}Apakah produk ini tersedia?`;
    const url = `https://wa.me/${product.nomorWa}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function updateProductCount() {
    const countElement = document.getElementById('product-count');
    const totalElement = document.getElementById('total-products');
    if (countElement) {
        countElement.textContent = `(${produkList.length} produk)`;
    }
    if (totalElement) {
        totalElement.textContent = produkList.length;
    }
}

function cariProduk() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        currentSearch = searchInput.value.trim();
        renderProduk(currentSearch);
    }
}

function resetPencarian() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        currentSearch = '';
        renderProduk('');
    }
}

function renderAdminProducts() {
    const container = document.getElementById('admin-produk-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (produkList.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Belum ada produk.</p>';
        return;
    }
    
    produkList.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'produk-card';
        card.style.cursor = 'pointer';
        card.onclick = () => editProduk(index);
        
        let gambarHTML = '';
        if (product.gambar) {
            gambarHTML = `<div class="produk-gambar"><img src="${product.gambar}" alt="${sanitizeInput(product.nama)}"></div>`;
        } else {
            gambarHTML = `<div class="produk-gambar"><div class="produk-gambar-placeholder"><p>🖼️<br><small>Tanpa gambar</small></p></div></div>`;
        }
        
        card.innerHTML = `
            ${gambarHTML}
            <div class="produk-info">
                <h3>${sanitizeInput(product.nama)}</h3>
                <div class="produk-harga">${formatRupiah(product.harga)}</div>
                ${product.deskripsi ? `<div class="produk-deskripsi">${sanitizeInput(product.deskripsi).substring(0, 80)}...</div>` : ''}
                <div style="font-size:12px; color:#666; margin-top:10px;">
                    <p>Kategori: ${product.kategori || 'umum'}</p>
                    <p>Klik untuk edit</p>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleAdminArea() {
    const adminArea = document.getElementById('admin-area');
    const tokoContainer = document.getElementById('toko-container');
    adminArea.classList.toggle('admin-hidden');
    
    if (!adminArea.classList.contains('admin-hidden')) {
        tokoContainer.style.display = 'none';
        resetAdminForm();
        renderAdminProducts();
    } else {
        tokoContainer.style.display = 'block';
        resetAdminForm();
    }
}

function batalAdmin() {
    document.getElementById('admin-area').classList.add('admin-hidden');
    document.getElementById('toko-container').style.display = 'block';
    resetAdminForm();
}

function resetAdminForm() {
    document.getElementById('input-nama').value = '';
    document.getElementById('input-harga').value = '';
    document.getElementById('input-nomor').value = '';
    document.getElementById('input-deskripsi').value = '';
    document.getElementById('input-kategori').value = 'umum';
    document.getElementById('input-gambar').value = '';
    document.getElementById('preview-tambah').innerHTML = '<p>Pratinjau gambar akan muncul di sini</p>';
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-msg').textContent = '';
    batalEdit();
}

function loginAdmin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const messageElement = document.getElementById('login-msg');
    const correctUsername = 'admin';
    const correctPassword = 'password123';
    
    if (username === correctUsername && password === correctPassword) {
        adminLoginState = true;
        localStorage.setItem('adminLogin', 'true');
        document.getElementById('login-form').classList.add('dashboard-hidden');
        document.getElementById('admin-dashboard').classList.remove('dashboard-hidden');
        messageElement.textContent = '';
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
        renderAdminProducts();
        showToast('✅ Login admin berhasil!');
    } else {
        messageElement.textContent = 'Username atau password salah.';
        messageElement.style.color = 'red';
    }
}

function logoutAdmin() {
    adminLoginState = false;
    localStorage.removeItem('adminLogin');
    document.getElementById('admin-dashboard').classList.add('dashboard-hidden');
    document.getElementById('login-form').classList.remove('dashboard-hidden');
    batalAdmin();
    renderProduk(currentSearch);
    showToast('👋 Logout berhasil');
}

function initDarkMode() {
    const toggle = document.getElementById('mode-toggle');
    const isDark = localStorage.getItem('darkMode') === 'true';
    
    if (toggle) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            toggle.textContent = '☀️ Mode Terang';
        } else {
            toggle.textContent = '🌙 Mode Gelap';
        }
        
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isNowDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isNowDark);
            toggle.textContent = isNowDark ? '☀️ Mode Terang' : '🌙 Mode Gelap';
            showToast(isNowDark ? 'Mode gelap diaktifkan' : 'Mode terang diaktifkan');
        });
    }
}

async function initApp() {
    setTimeout(async () => {
        initDarkMode();
        
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', toggleAdminArea);
        }
        
        const cartBtn = document.getElementById('cart-btn');
        if (cartBtn) {
            cartBtn.addEventListener('click', toggleCart);
        }
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', event => {
                if (event.key === 'Enter') {
                    cariProduk();
                }
            });
        }
        
        if (adminLoginState) {
            const loginForm = document.getElementById('login-form');
            const adminDashboard = document.getElementById('admin-dashboard');
            if (loginForm && adminDashboard) {
                loginForm.classList.add('dashboard-hidden');
                adminDashboard.classList.remove('dashboard-hidden');
            }
        }
        
        renderCartItems();
        updateCartCount();
        
        await loadFromFirestore();
    }, 1000);
}

document.addEventListener('DOMContentLoaded', initApp);
