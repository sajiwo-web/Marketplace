// --- Data Produk (Disimpan di sini secara statis untuk contoh) ---
let produkList = [
    { nama: "Jasa Desain Logo", harga: 150000, nomorWa: "6281234567890" },
    { nama: "Ebook Panduan Investasi", harga: 75000, nomorWa: "6289876543210" }
];

// --- FUNGSI TAMPILAN TOKO ---

function renderProduk() {
    const container = document.getElementById('daftar-produk');
    container.innerHTML = ''; // Kosongkan container

    produkList.forEach(produk => {
        const card = document.createElement('div');
        card.className = 'produk-card';
        card.innerHTML = `
            <h3>${produk.nama}</h3>
            <p>Harga: Rp ${formatRupiah(produk.harga)}</p>
            <button class="tombol-beli" 
                    data-nama="${produk.nama}" 
                    data-harga="${produk.harga}" 
                    data-nomor="${produk.nomorWa}">Beli Sekarang (WhatsApp)</button>
        `;
        container.appendChild(card);
    });

    // Pasang Event Listener untuk tombol Beli setelah produk di-render
    document.querySelectorAll('.tombol-beli').forEach(button => {
        button.addEventListener('click', handleBeliClick);
    });
}

function formatRupiah(angka) {
    // Fungsi sederhana untuk format mata uang
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function handleBeliClick(event) {
    const namaProduk = event.target.dataset.nama;
    const hargaProduk = event.target.dataset.harga;
    const nomorWa = event.target.dataset.nomor;

    const pesan = `Halo, saya tertarik untuk membeli produk *${namaProduk}* seharga Rp ${formatRupiah(hargaProduk)}. Apakah produk tersedia?`;
    
    // Encode URI untuk memastikan pesan aman di URL
    const waUrl = `https://wa.me/${nomorWa}?text=${encodeURIComponent(pesan)}`;

    // Buka tab baru dengan link WhatsApp
    window.open(waUrl, '_blank');
}

// --- FUNGSI AREA ADMIN ---

// Konstanta login (STATIS)
const ADMIN_USERNAME = 'admin_toko';
const ADMIN_PASSWORD = 'password123';

document.getElementById('admin-btn').addEventListener('click', toggleAdminArea);

function toggleAdminArea() {
    const adminArea = document.getElementById('admin-area');
    const tokoContainer = document.getElementById('toko-container');
    
    // Toggle tampilan Admin Area
    adminArea.classList.toggle('admin-hidden');

    // Sembunyikan toko saat Admin Area muncul
    if (!adminArea.classList.contains('admin-hidden')) {
        tokoContainer.style.display = 'none';
    } else {
        tokoContainer.style.display = 'block';
    }
}

function loginAdmin() {
    const usernameInput = document.getElementById('admin-username').value;
    const passwordInput = document.getElementById('admin-password').value;
    const loginMsg = document.getElementById('login-msg');

    if (usernameInput === ADMIN_USERNAME && passwordInput === ADMIN_PASSWORD) {
        document.getElementById('login-form').classList.add('dashboard-hidden');
        document.getElementById('admin-dashboard').classList.remove('dashboard-hidden');
        loginMsg.textContent = 'Login berhasil!';
        loginMsg.style.color = 'green';
    } else {
        loginMsg.textContent = 'Username atau password salah.';
        loginMsg.style.color = 'red';
    }
}

function logoutAdmin() {
    document.getElementById('admin-dashboard').classList.add('dashboard-hidden');
    document.getElementById('login-form').classList.remove('dashboard-hidden');
    document.getElementById('login-msg').textContent = '';
    
    // Kosongkan input
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
}

function tambahProduk() {
    const nama = document.getElementById('input-nama').value;
    const harga = parseInt(document.getElementById('input-harga').value);
    const nomorWa = document.getElementById('input-nomor').value;

    if (!nama || isNaN(harga) || !nomorWa) {
        alert("Semua kolom harus diisi dengan benar!");
        return;
    }

    const produkBaru = {
        nama: nama,
        harga: harga,
        nomorWa: nomorWa
    };

    // Tambahkan produk baru ke list
    produkList.push(produkBaru);
    
    // Render ulang tampilan toko
    renderProduk();

    // Reset formulir
    document.getElementById('input-nama').value = '';
    document.getElementById('input-harga').value = '';
    document.getElementById('input-nomor').value = '';

    alert(`Produk "${nama}" berhasil ditambahkan!`);
}


// Inisialisasi: Panggil fungsi render saat halaman dimuat
document.addEventListener('DOMContentLoaded', renderProduk);

