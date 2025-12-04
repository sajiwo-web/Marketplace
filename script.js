document.addEventListener('DOMContentLoaded', function() {
    const products = [
        {
            id: 1,
            title: "Template Bisnis",
            description: "Template website profesional untuk bisnis dengan desain elegan dan modern.",
            price: "Rp 299.000",
            image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            category: "Bisnis"
        },
        {
            id: 2,
            title: "Template E-Commerce",
            description: "Template lengkap untuk toko online dengan sistem keranjang belanja dan checkout.",
            price: "Rp 499.000",
            image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            category: "E-Commerce"
        },
        {
            id: 3,
            title: "Template Portfolio",
            description: "Template portfolio kreatif untuk menampilkan karya dan keahlian Anda.",
            price: "Rp 249.000",
            image: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            category: "Portfolio"
        },
        {
            id: 4,
            title: "Template Restoran",
            description: "Template website untuk restoran dengan menu online dan sistem reservasi.",
            price: "Rp 349.000",
            image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            category: "Kuliner"
        },
        {
            id: 5,
            title: "Template Blog",
            description: "Template blog modern dengan tata letak yang optimal untuk konten tulisan.",
            price: "Rp 199.000",
            image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            category: "Blog"
        },
        {
            id: 6,
            title: "Template Edukasi",
            description: "Template website untuk kursus online dan platform edukasi digital.",
            price: "Rp 399.000",
            image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            category: "Edukasi"
        }
    ];

    const productsContainer = document.getElementById('products-container');
    const phoneNumber = "6281234567890"; // Ganti dengan nomor WhatsApp Anda

    function loadProducts() {
        productsContainer.innerHTML = '';
        
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            const message = `Halo, saya tertarik dengan produk *${product.title}* seharga *${product.price}*. Bisakah saya mendapatkan informasi lebih lanjut?`;
            const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.title}" class="product-image">
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-price">${product.price}</div>
                    <a href="${whatsappLink}" target="_blank" class="buy-button">
                        <i class="fab fa-whatsapp"></i> Beli Sekarang
                    </a>
                </div>
            `;
            
            productsContainer.appendChild(productCard);
        });
    }

    function initSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    function initNavbarScroll() {
        const header = document.querySelector('header');
        
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.15)';
            } else {
                header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }
        });
    }

    loadProducts();
    initSmoothScroll();
    initNavbarScroll();
    
    console.log('Marketplace Template Website loaded successfully!');
});