let produkList = [];
let adminLoginState = localStorage.getItem('adminLogin') === 'true';
let currentSearch = '';
let pendingAction = null;

function formatRupiah(angka) {
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function sanitizeInput(str) {
    if (!str) return '';
    return str.toString()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showConfirmModal(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('modal-hidden');
    pendingAction = callback;
}

function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = () => {
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;
                
                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    if (width > height) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    } else {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                
                const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
                const padding = (compressedDataUrl.charAt(compressedDataUrl.length - 2) === '=') ? 
                    2 : ((compressedDataUrl.charAt(compressedDataUrl.length - 1) === '=') ? 1 : 0);
                const fileSize = base64Length * 0.75 - padding;
                
                if (fileSize > 500 * 1024) {
                    reject('Ukuran gambar terlalu besar setelah kompresi. Maksimal 500KB.');
                    return;
                }
                
                resolve(compressedDataUrl);
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
        if (previewId === 'preview-edit') {
            return;
        }
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
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width:100%; max-height:200px;">`;
    };
    reader.readAsDataURL(file);
}

function hapusGambarEdit() {
    const preview = document.getElementById('preview-edit');
    preview.innerHTML = '<p>Gambar akan dihapus saat disimpan</p>';
    document.getElementById('edit-gambar').value = '';
}

async function loadFromFirestore() {
    try {
        showLoading(true);
        const produkCol = firebaseModules.collection(db, 'produk');
        const q = firebaseModules.query(produkCol, firebaseModules.orderBy('tanggal', 'desc'));
        const snapshot = await firebaseModules.getDocs(q);
        
        produkList = [];
        snapshot.forEach((doc) => {
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
    const nomorWa = document.getElementById('input-nomor').value.trim();
    const deskripsi = document.getElementById('input-deskripsi').value.trim();
    const fileInput = document.getElementById('input-gambar');
    
    if (!nama || nama.length < 3) {
        alert('Nama produk minimal 3 karakter!');
        return;
    }
    
    if (isNaN(harga) || harga < 1000 || harga > 10000000) {
        alert('Harga harus antara Rp 1.000 - Rp 10.000.000!');
        return;
    }
    
    if (!/^62\d{9,12}$/.test(nomorWa)) {
        alert('Nomor WA harus diawali 62 dan 10-13 digit angka!');
        return;
    }
    
    try {
        showLoading(true);
        
        let gambarBase64 = null;
        if (fileInput.files[0]) {
            try {
                gambarBase64 = await compressImageToBase64(fileInput.files[0]);
            } catch (error) {
                alert(`Error kompresi gambar: ${error}`);
                showLoading(false);
                return;
            }
        }
        
        const produkData = {
            nama: sanitizeInput(nama),
            harga: harga,
            nomorWa: nomorWa,
            deskripsi: sanitizeInput(deskripsi) || '',
            gambar: gambarBase64,
            tanggal: firebaseModules.serverTimestamp(),
            createdAt: new Date().toISOString()
        };
        
        const docRef = await firebaseModules.addDoc(
            firebaseModules.collection(db, 'produk'), 
            produkData
        );
        
        document.getElementById('input-nama').value = '';
        document.getElementById('input-harga').value = '';
        document.getElementById('input-nomor').value = '';
        document.getElementById('input-deskripsi').value = '';
        document.getElementById('input-gambar').value = '';
        document.getElementById('preview-tambah').innerHTML = '<p>Pratinjau gambar akan muncul di sini</p>';
        
        await loadFromFirestore();
        
        alert(`✅ Produk "${nama}" berhasil ditambahkan!`);
    } catch (error) {
        console.error("Error adding product:", error);
        alert('❌ Gagal menambah produk: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function editProduk(index) {
    const produk = produkList[index];
    if (!produk) return;
    
    document.getElementById('edit-section').style.display = 'block';
    document.getElementById('edit-index').value = index;
    document.getElementById('edit-id').value = produk.id;
    document.getElementById('edit-nama').value = produk.nama;
    document.getElementById('edit-harga').value = produk.harga;
    document.getElementById('edit-nomor').value = produk.nomorWa;
    document.getElementById('edit-deskripsi').value = produk.deskripsi || '';
    
    const preview = document.getElementById('preview-edit');
    if (produk.gambar) {
        preview.innerHTML = `<img src="${produk.gambar}" alt="Gambar saat ini" style="max-width:100%; max-height:200px;">`;
    } else {
        preview.innerHTML = '<p>Produk ini belum memiliki gambar</p>';
    }
    
    document.getElementById('edit-gambar').value = '';
    document.getElementById('edit-section').scrollIntoView({ behavior: 'smooth' });
}

async function simpanEdit() {
    const index = document.getElementById('edit-index').value;
    const productId = document.getElementById('edit-id').value;
    const nama = document.getElementById('edit-nama').value.trim();
    const harga = parseInt(document.getElementById('edit-harga').value);
    const nomorWa = document.getElementById('edit-nomor').value.trim();
    const deskripsi = document.getElementById('edit-deskripsi').value.trim();
    const fileInput = document.getElementById('edit-gambar');
    
    if (index === '' || isNaN(index) || !productId) return;
    
    if (!nama || nama.length < 3) {
        alert('Nama produk minimal 3 karakter!');
        return;
    }
    
    if (isNaN(harga) || harga < 1000 || harga > 10000000) {
        alert('Harga harus antara Rp 1.000 - Rp 10.000.000!');
        return;
    }
    
    if (!/^62\d{9,12}$/.test(nomorWa)) {
        alert('Nomor WA harus diawali 62 dan 10-13 digit angka!');
        return;
    }
    
    try {
        showLoading(true);
        
        const produk = produkList[index];
        let gambarBase64 = produk.gambar;
        
        if (fileInput.files[0]) {
            try {
                gambarBase64 = await compressImageToBase64(fileInput.files[0]);
            } catch (error) {
                alert(`Error kompresi gambar: ${error}`);
                showLoading(false);
                return;
            }
        }
        else if (document.getElementById('preview-edit').innerHTML.includes('Gambar akan dihapus')) {
            gambarBase64 = null;
        }
        
        const produkData = {
            nama: sanitizeInput(nama),
            harga: harga,
            nomorWa: nomorWa,
            deskripsi: sanitizeInput(deskripsi) || '',
            gambar: gambarBase64,
            updatedAt: new Date().toISOString()
        };
        
        const docRef = firebaseModules.doc(db, 'produk', productId);
        await firebaseModules.updateDoc(docRef, produkData);
        
        batalEdit();
        await loadFromFirestore();
        
        alert('✅ Produk berhasil diupdate!');
    } catch (error) {
        console.error("Error updating product:", error);
        alert('❌ Gagal mengupdate produk: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function hapusProduk(index) {
    const produk = produkList[index];
    if (!produk) return;
    
    showConfirmModal(`Hapus produk "${produk.nama}"?`, async (confirmed) => {
        if (confirmed) {
            try {
                showLoading(true);
                const docRef = firebaseModules.doc(db, 'produk', produk.id);
                await firebaseModules.deleteDoc(docRef);
                
                produkList.splice(index, 1);
                renderProduk(currentSearch);
                renderAdminProducts();
                updateProductCount();
                
                alert('✅ Produk berhasil dihapus!');
            } catch (error) {
                console.error("Error deleting product:", error);
                alert('❌ Gagal menghapus produk: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
    });
}

function batalEdit() {
    document.getElementById('edit-section').style.display = 'none';
    document.getElementById('edit-index').value = '';
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-nama').value = '';
    document.getElementById('edit-harga').value = '';
    document.getElementById('edit-nomor').value = '';
    document.getElementById('edit-deskripsi').value = '';
    document.getElementById('edit-gambar').value = '';
    document.getElementById('preview-edit').innerHTML = '<p>Gambar saat ini akan muncul di sini</p>';
}

function renderProduk(filter = '') {
    const container = document.getElementById('daftar-produk');
    const noProducts = document.getElementById('no-products');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    let filteredProducts = produkList;
    if (filter && filter.trim() !== '') {
        const searchTerm = filter.toLowerCase();
        filteredProducts = produkList.filter(produk => 
            produk.nama.toLowerCase().includes(searchTerm) ||
            (produk.deskripsi && produk.deskripsi.toLowerCase().includes(searchTerm))
        );
    }
    
    if (filteredProducts.length === 0) {
        container.style.display = 'none';
        noProducts.style.display = 'block';
        noProducts.innerHTML = filter ? 
            `<p>Tidak ditemukan produk dengan kata kunci "${filter}"</p>` :
            `<p>Belum ada produk tersedia.</p>`;
    } else {
        container.style.display = 'flex';
        noProducts.style.display = 'none';
        
        filteredProducts.forEach((produk, index) => {
            const card = document.createElement('div');
            card.className = 'produk-card';
            
            const tanggal = produk.tanggal ? 
                produk.tanggal.toLocaleDateString('id-ID') : '';
            
            let gambarHTML = '';
            if (produk.gambar) {
                gambarHTML = `
                    <div class="produk-gambar">
                        <img src="${produk.gambar}" alt="${sanitizeInput(produk.nama)}">
                    </div>
                `;
            } else {
                gambarHTML = `
                    <div class="produk-gambar">
                        <div class="produk-gambar-placeholder">
                            <p>🖼️<br><small>Tidak ada gambar</small></p>
                        </div>
                    </div>
                `;
            }
            
            card.innerHTML = `
                ${tanggal ? `<small style="color:#666; display:block; margin-bottom:5px;">${tanggal}</small>` : ''}
                
                ${gambarHTML}
                
                <div class="produk-info">
                    <h3>${sanitizeInput(produk.nama)}</h3>
                    
                    <div class="produk-harga">
                        ${formatRupiah(produk.harga)}
                    </div>
                    
                    ${produk.deskripsi ? `
                        <div class="produk-deskripsi">
                            ${sanitizeInput(produk.deskripsi)}
                        </div>
                    ` : ''}
                    
                    <button class="tombol-beli" 
                            data-index="${index}">
                        💬 Beli via WhatsApp
                    </button>
                    
                    ${adminLoginState ? `
                        <div class="admin-actions">
                            <button class="btn-edit" onclick="editProduk(${index})">✏️ Edit</button>
                            <button class="btn-hapus" onclick="hapusProduk(${index})">🗑️ Hapus</button>
                        </div>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
        
        document.querySelectorAll('.tombol-beli').forEach(button => {
            button.addEventListener('click', handleBeliClick);
        });
    }
}

function handleBeliClick(event) {
    const index = event.target.dataset.index;
    const produk = produkList[index];
    
    if (!produk) return;
    
    const pesan = `Halo, saya tertarik untuk membeli produk:\n\n` +
                  `📦 *${produk.nama}*\n` +
                  `💰 Harga: ${formatRupiah(produk.harga)}\n` +
                  `${produk.deskripsi ? `📝 ${produk.deskripsi}\n\n` : '\n'}` +
                  `Apakah produk ini tersedia?`;
    
    const waUrl = `https://wa.me/${produk.nomorWa}?text=${encodeURIComponent(pesan)}`;
    window.open(waUrl, '_blank');
}

function updateProductCount() {
    const countElement = document.getElementById('product-count');
    const footerCount = document.getElementById('total-products');
    
    if (countElement) {
        countElement.textContent = `(${produkList.length} produk)`;
    }
    
    if (footerCount) {
        footerCount.textContent = produkList.length;
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
    
    produkList.forEach((produk, index) => {
        const card = document.createElement('div');
        card.className = 'produk-card';
        card.style.cursor = 'pointer';
        card.onclick = () => editProduk(index);
        
        let gambarHTML = '';
        if (produk.gambar) {
            gambarHTML = `
                <div class="produk-gambar">
                    <img src="${produk.gambar}" alt="${sanitizeInput(produk.nama)}">
                </div>
            `;
        } else {
            gambarHTML = `
                <div class="produk-gambar">
                    <div class="produk-gambar-placeholder">
                        <p>🖼️<br><small>Tanpa gambar</small></p>
                    </div>
                </div>
            `;
        }
        
        card.innerHTML = `
            ${gambarHTML}
            
            <div class="produk-info">
                <h3>${sanitizeInput(produk.nama)}</h3>
                
                <div class="produk-harga">
                    ${formatRupiah(produk.harga)}
                </div>
                
                ${produk.deskripsi ? `
                    <div class="produk-deskripsi">
                        ${sanitizeInput(produk.deskripsi).substring(0, 80)}...
                    </div>
                ` : ''}
                
                <div style="font-size:12px; color:#666; margin-top:10px;">
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
    document.getElementById('input-gambar').value = '';
    document.getElementById('preview-tambah').innerHTML = '<p>Pratinjau gambar akan muncul di sini</p>';
    
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-msg').textContent = '';
    
    batalEdit();
}

function loginAdmin() {
    const usernameInput = document.getElementById('admin-username').value.trim();
    const passwordInput = document.getElementById('admin-password').value.trim();
    const loginMsg = document.getElementById('login-msg');
    
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'password123';
    
    if (usernameInput === ADMIN_USERNAME && passwordInput === ADMIN_PASSWORD) {
        adminLoginState = true;
        localStorage.setItem('adminLogin', 'true');
        
        document.getElementById('login-form').classList.add('dashboard-hidden');
        document.getElementById('admin-dashboard').classList.remove('dashboard-hidden');
        loginMsg.textContent = '';
        
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
        
        renderAdminProducts();
    } else {
        loginMsg.textContent = 'Username atau password salah.';
        loginMsg.style.color = 'red';
    }
}

function logoutAdmin() {
    adminLoginState = false;
    localStorage.removeItem('adminLogin');
    
    document.getElementById('admin-dashboard').classList.add('dashboard-hidden');
    document.getElementById('login-form').classList.remove('dashboard-hidden');
    
    batalAdmin();
    renderProduk(currentSearch);
}

function confirmAction(confirmed) {
    document.getElementById('confirm-modal').classList.add('modal-hidden');
    
    if (pendingAction && confirmed) {
        pendingAction(confirmed);
    }
    
    pendingAction = null;
}

function initDarkMode() {
    const modeToggle = document.getElementById('mode-toggle');
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (modeToggle) {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            modeToggle.textContent = 'Mode Terang';
        } else {
            modeToggle.textContent = 'Mode Gelap';
        }
        
        modeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isNowDark = document.body.classList.contains('dark-mode');
            
            localStorage.setItem('darkMode', isNowDark);
            modeToggle.textContent = isNowDark ? 'Mode Terang' : 'Mode Gelap';
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
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
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
        
        await loadFromFirestore();
        
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) {
            confirmModal.addEventListener('click', (e) => {
                if (e.target.id === 'confirm-modal') {
                    confirmAction(false);
                }
            });
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', initApp);
