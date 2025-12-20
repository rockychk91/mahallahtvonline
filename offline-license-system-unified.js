// ============================================================
// SISTEM LISENSI OFFLINE UNIFIED - Versi ES5 untuk STB Indihome
// DIMODIFIKASI UNTUK KOMPATIBILITAS STB HG680-P
// ============================================================

(function() {
    'use strict';
    
    // ==================== KONSTRUKTOR UTAMA ====================
    var OfflineLicenseSystem = function() {
        // Kode lisensi valid (bisa diubah oleh admin)
        this.validLicenseKeys = {
            'RH-MTV-1Q2W3E': { // Trial
                package: 'trial',
                expiryDays: 2,
                created: '2024-01-01'
            },
            'RH-MTV-4R5T6Y': { // Dasar
                package: 'basic', 
                expiryDays: 365,
                created: '2024-01-01'
            },
            'RH-MTV-7U8I9O': { // Premium
                package: 'premium',
                expiryDays: 365,
                created: '2024-01-01'
            },
            'RH-MTV-0PASD1': { // VIP
                package: 'vip',
                expiryDays: 9999,
                created: '2024-01-01'
            },
            'RH-MTV-VIP001': { // Kode khusus
                package: 'vip',
                expiryDays: 9999,
                created: '2025-12-18'
            },
            'RH-MTV-BAS001': { // Kode contoh untuk paket dasar
                package: 'basic',
                expiryDays: 365,
                created: '2025-12-18'
            },
            'RH-MTV-PRE001': { // Kode contoh untuk paket premium
                package: 'premium',
                expiryDays: 365,
                created: '2025-12-18'
            }
        };

        // Load validLicenseKeys dari localStorage (jika ada)
        this.loadValidLicenseKeys();
        
        // Data paket dengan fitur
        this.licensePackages = {
            'trial': {
                name: 'Uji Coba',
                price: 50000,
                features: {
                    hiddenLogo: true,
                    hiddenSlides: [2, 3, 4],
                    hiddenPowerButton: true,
                    hiddenVillageName: true,
                    maxImages: 2,
                    hiddenImsakSyuruq: true,
                    maghribIsyaActiveMinutes: 15,
                    hiddenSettingsButtons: ['data-masjid', 'running-text', 'slider-duration'],
                    hiddenAdzanButtons: ['countdown-adzan', 'countdown-iqamah', 'overlay-duration'],
                    hiddenAudio: ['shalawat', 'adzan'],
                    ads: {
                        enabled: true,
                        duration: 15,
                        interval: 10,
                        overlayBehavior: 'behind'
                    }
                }
            },
            'basic': {
                name: 'Dasar',
                price: 340000,
                features: {
                    hiddenLogo: true,
                    hiddenSlides: [2, 4],
                    hiddenPowerButton: false,
                    hiddenVillageName: false,
                    maxImages: 2,
                    hiddenImsakSyuruq: false,
                    maghribIsyaActiveMinutes: 0,
                    hiddenSettingsButtons: ['slider-duration'],
                    hiddenAdzanButtons: ['overlay-duration'],
                    hiddenAudio: ['shalawat', 'adzan'],
                    ads: {
                        enabled: true,
                        duration: 5,
                        interval: 300,
                        overlayBehavior: 'behind'
                    }
                }
            },
            'premium': {
                name: 'Premium',
                price: 570000,
                features: {
                    hiddenLogo: false,
                    hiddenSlides: [],
                    hiddenPowerButton: false,
                    hiddenVillageName: false,
                    maxImages: 5,
                    hiddenImsakSyuruq: false,
                    maghribIsyaActiveMinutes: 0,
                    hiddenSettingsButtons: [],
                    hiddenAdzanButtons: [],
                    hiddenAudio: [],
                    ads: { enabled: false }
                }
            },
            'vip': {
                name: 'VIP',
                price: 1420000,
                features: {
                    hiddenLogo: false,
                    hiddenSlides: [],
                    hiddenPowerButton: false,
                    hiddenVillageName: false,
                    maxImages: 7,
                    hiddenImsakSyuruq: false,
                    maghribIsyaActiveMinutes: 0,
                    hiddenSettingsButtons: [],
                    hiddenAdzanButtons: [],
                    hiddenAudio: [],
                    ads: { enabled: false }
                }
            },
            'demo': {
                name: 'Demo',
                price: 0,
                features: {
                    hiddenLogo: false,
                    hiddenSlides: [],
                    hiddenPowerButton: false,
                    hiddenVillageName: false,
                    maxImages: 7,
                    hiddenImsakSyuruq: false,
                    maghribIsyaActiveMinutes: 0,
                    hiddenSettingsButtons: [],
                    hiddenAdzanButtons: [],
                    hiddenAudio: [],
                    ads: { enabled: false }
                }
            }
        };
        
        this.currentLicense = null;
        this.deviceId = this.getDeviceId();
        this.adsTimer = null;
        this.isShowingAds = false;
        this.demoUsedKey = 'demo_used_' + this.deviceId;
        this.licenseValidationCache = {};
        this.cacheTimeout = 300000; // 5 menit
        this.previewUpdateTimeout = null;

        // Default gambar iklan
        this.adImages = [
            'ads/ad1.jpg',
            'ads/ad2.jpg',
            'ads/ad3.jpg'
        ];
    };

    // ==================== INISIALISASI ====================
    OfflineLicenseSystem.prototype.initialize = function() {
        console.log('Sistem Lisensi Offline - Inisialisasi...');
        
        // 1. Tambahkan styles
        this.addStyles();
        
        // 2. Load license yang sudah ada
        this.loadLicense();
        
        // 3. Validasi license
        var isValid = this.validateLicense();
        
        // 4. Tampilkan popup sesuai status
        if (!isValid) {
            this.showActivationPopup();
        } else {
            // Terapkan fitur lisensi
            this.applyLicenseFeatures();
            
            // Tampilkan info lisensi singkat
            this.showBriefLicenseInfo();
        }
        
        // 5. Setup iklan jika diperlukan
        this.setupAds();
        
        return isValid;
    };

    // ==================== FUNGSI BARU: VALIDASI LISENSI ONLINE (FIXED) ====================
    OfflineLicenseSystem.prototype.validateLicenseOnline = function(licenseKey) {
        var self = this;
        
        return new Promise(function(resolve, reject) {
            // Cek dulu di cache
            var cached = self.getCachedValidation(licenseKey);
            if (cached) {
                console.log('[ONLINE VALIDATION] Using cached result for:', licenseKey);
                resolve(cached);
                return;
            }
            
            // Jika tidak ada API online, reject
            if (!window.onlineLicenseAPI || typeof window.onlineLicenseAPI.validateLicenseOnline !== 'function') {
                reject(new Error('Online API not available'));
                return;
            }
            
            // Generate callback name yang unik
            var callbackName = 'validate_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
            
            // Simpan callback ke window
            window[callbackName] = function(response) {
                try {
                    console.log('[ONLINE VALIDATION] Response received:', response);
                    
                    // Hapus callback dari window setelah digunakan
                    delete window[callbackName];
                    
                    // Hapus script element
                    var script = document.getElementById('jsonp_script_' + callbackName);
                    if (script && script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    
                    if (response && response.success !== undefined) {
                        var validationResult = {
                            valid: response.success,
                            status: response.status || 'unknown',
                            message: response.message || '',
                            details: response.details || {}
                        };
                        
                        // Simpan ke cache
                        self.setCachedValidation(licenseKey, validationResult);
                        
                        resolve(validationResult);
                    } else {
                        reject(new Error('Invalid response format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            // Timeout untuk mencegah hanging
            var timeoutId = setTimeout(function() {
                // Hapus callback jika timeout
                delete window[callbackName];
                
                // Hapus script element
                var script = document.getElementById('jsonp_script_' + callbackName);
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                
                reject(new Error('Validation timeout'));
            }, 10000); // 10 detik timeout
            
            // Buat script element untuk JSONP
            var script = document.createElement('script');
            script.id = 'jsonp_script_' + callbackName;
            script.src = 'exec?action=validateLicense&code=' + encodeURIComponent(licenseKey) + 
                        '&callback=' + encodeURIComponent(callbackName) + 
                        '&t=' + Date.now();
            
            script.onload = function() {
                clearTimeout(timeoutId);
            };
            
            script.onerror = function() {
                clearTimeout(timeoutId);
                
                // Hapus callback
                delete window[callbackName];
                
                // Hapus script element
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                
                reject(new Error('Failed to load validation script'));
            };
            
            // Tambahkan script ke document
            document.head.appendChild(script);
            
        }).catch(function(error) {
            console.warn('[ONLINE VALIDATION] Failed for', licenseKey + ':', error.message);
            throw error;
        });
    };

    // ==================== FUNGSI BARU: ACTIVATE LICENSE ONLINE (FIXED) ====================
    OfflineLicenseSystem.prototype.activateLicenseOnline = function(licenseKey) {
        var self = this;
        
        return new Promise(function(resolve, reject) {
            // Jika tidak ada API online, reject
            if (!window.onlineLicenseAPI || typeof window.onlineLicenseAPI.activateLicense !== 'function') {
                reject(new Error('Online API not available'));
                return;
            }
            
            // Generate callback name yang unik
            var callbackName = 'activate_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
            
            // Simpan callback ke window
            window[callbackName] = function(response) {
                try {
                    console.log('[ONLINE ACTIVATION] Response received:', response);
                    
                    // Hapus callback dari window setelah digunakan
                    delete window[callbackName];
                    
                    // Hapus script element
                    var script = document.getElementById('jsonp_script_' + callbackName);
                    if (script && script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    
                    if (response && response.success !== undefined) {
                        resolve({
                            success: response.success,
                            message: response.message || '',
                            data: response.data || {}
                        });
                    } else {
                        reject(new Error('Invalid response format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            // Timeout untuk mencegah hanging
            var timeoutId = setTimeout(function() {
                // Hapus callback jika timeout
                delete window[callbackName];
                
                // Hapus script element
                var script = document.getElementById('jsonp_script_' + callbackName);
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                
                reject(new Error('Activation timeout'));
            }, 15000); // 15 detik timeout untuk aktivasi
            
            // Buat script element untuk JSONP
            var script = document.createElement('script');
            script.id = 'jsonp_script_' + callbackName;
            script.src = 'exec?action=activateLicense&code=' + encodeURIComponent(licenseKey) + 
                        '&deviceId=' + encodeURIComponent(self.deviceId) + 
                        '&callback=' + encodeURIComponent(callbackName) + 
                        '&t=' + Date.now();
            
            script.onload = function() {
                clearTimeout(timeoutId);
            };
            
            script.onerror = function() {
                clearTimeout(timeoutId);
                
                // Hapus callback
                delete window[callbackName];
                
                // Hapus script element
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                
                reject(new Error('Failed to load activation script'));
            };
            
            // Tambahkan script ke document
            document.head.appendChild(script);
            
        }).catch(function(error) {
            console.warn('[ONLINE ACTIVATION] Failed for', licenseKey + ':', error.message);
            throw error;
        });
    };

    // ==================== LICENSE MANAGEMENT ====================
    OfflineLicenseSystem.prototype.loadLicense = function() {
        try {
            var saved = localStorage.getItem('adzan_offline_license');
            if (saved) {
                this.currentLicense = JSON.parse(saved);
                console.log('Lisensi ditemukan:', this.currentLicense.package);
            }
        } catch (error) {
            console.error('Error loading license:', error);
            this.currentLicense = null;
        }
    };

    OfflineLicenseSystem.prototype.saveLicense = function() {
        try {
            localStorage.setItem('adzan_offline_license', JSON.stringify(this.currentLicense));
            
            // Juga simpan di key lama untuk kompatibilitas
            localStorage.setItem('adzanAppLicense', JSON.stringify({
                package: this.currentLicense.package,
                startDate: this.currentLicense.startDate,
                endDate: this.currentLicense.expiry,
                paymentStatus: this.currentLicense.status === 'active' ? 'paid' : 'pending'
            }));
            
            return true;
        } catch (error) {
            console.error('Error saving license:', error);
            return false;
        }
    };

    OfflineLicenseSystem.prototype.validateLicense = function() {
        if (!this.currentLicense) return false;
        
        // Cek format license
        if (!this.currentLicense.key || !this.currentLicense.expiry) {
            return false;
        }
        
        // Cek apakah kode masih valid
        var licenseInfo = this.validLicenseKeys[this.currentLicense.key];
        if (!licenseInfo) {
            console.log('License key not found in valid keys');
            return false;
        }
        
        // Cek expiry date
        var now = new Date();
        var expiry = new Date(this.currentLicense.expiry);
        
        if (now > expiry) {
            console.log('License expired');
            // Tampilkan popup expired
            this.showExpiredPopup();
            return false;
        }
        
        return true;
    };

    // ==================== FUNGSI BARU: SHOW EXPIRED POPUP ====================
    OfflineLicenseSystem.prototype.showExpiredPopup = function() {
        this.removeExistingPopup();
        
        var overlay = this.createOverlay();
        overlay.style.pointerEvents = 'auto';
        
        overlay.innerHTML = [
            '<div class="offline-license-popup expired">',
            '    <div class="popup-header expired">',
            '        <div class="header-icon">',
            '            <i class="bi bi-exclamation-triangle-fill"></i>',
            '        </div>',
            '        <h2>LISENSI KADALUARSA</h2>',
            '        <p class="subtitle">Aplikasi terkunci hingga diperpanjang</p>',
            '    </div>',
            '    ',
            '    <div class="popup-body">',
            '        <div class="expired-warning-card">',
            '            <div class="warning-icon">',
            '                <i class="bi bi-lock-fill"></i>',
            '            </div>',
            '            ',
            '            <h3>MASA AKTIF TELAH BERAKHIR</h3>',
            '            ',
            '            <div class="warning-message">',
            '                <p>Aplikasi tidak dapat digunakan karena lisensi telah habis masa berlakunya.</p>',
            '                <p>Untuk melanjutkan penggunaan, silahkan perpanjang lisensi.</p>',
            '            </div>',
            '            ',
            '            <div class="package-comparison">',
            '                <h4><i class="bi bi-gift"></i> PAKET TERSEDIA:</h4>',
            '                <div class="packages-grid">',
            '                    <div class="package-card basic">',
            '                        <h5>DASAR</h5>',
            '                        <div class="price">Rp 340.000</div>',
            '                        <div class="duration">1 TAHUN</div>',
            '                        <ul>',
            '                            <li>2 Gambar</li>',
            '                            <li>Iklan terbatas</li>',
            '                            <li>Audio terbatas</li>',
            '                        </ul>',
            '                    </div>',
            '                    ',
            '                    <div class="package-card premium">',
            '                        <div class="popular-badge">POPULER</div>',
            '                        <h5>PREMIUM</h5>',
            '                        <div class="price">Rp 570.000</div>',
            '                        <div class="duration">1 TAHUN</div>',
            '                        <ul>',
            '                            <li>5 Gambar</li>',
            '                            <li>Tanpa iklan</li>',
            '                            <li>Audio lengkap</li>',
            '                        </ul>',
            '                    </div>',
            '                    ',
            '                    <div class="package-card vip">',
            '                        <div class="vip-badge">VIP</div>',
            '                        <h5>VIP</h5>',
            '                        <div class="price">Rp 1.420.000</div>',
            '                        <div class="duration">SEUMUR HIDUP</div>',
            '                        <ul>',
            '                            <li>7 Gambar</li>',
            '                            <li>Semua fitur</li>',
            '                            <li>+ STB & Kabel HDMI</li>',
            '                        </ul>',
            '                    </div>',
            '                </div>',
            '            </div>',
            '            ',
            '            <div class="contact-actions">',
            '                <a href="https://wa.me/6289609745090?text=Halo%20Admin,%20saya%20ingin%20perpanjang%20lisensi%20Adzan%20App.%20ID%20Perangkat:%20' + encodeURIComponent(this.deviceId) + '" ',
            '                   target="_blank" class="btn-whatsapp">',
            '                    <i class="bi bi-whatsapp"></i> HUBUNGI ADMIN VIA WHATSAPP',
            '                </a>',
            '                ',
            '                <button onclick="copyToClipboard(\'' + this.deviceId + '\')" class="btn-copy-id">',
            '                    <i class="bi bi-copy"></i> SALIN ID PERANGKAT',
            '                </button>',
            '                ',
            '                <button id="tryDemoAgainBtn" class="btn-demo-again">',
            '                    <i class="bi bi-play-circle"></i> COBA DEMO LAGI (15 MENIT)',
            '                </button>',
            '            </div>',
            '        </div>',
            '    </div>',
            '    ',
            '    <div class="popup-footer">',
            '        <div class="cannot-close-warning">',
            '            <i class="bi bi-shield-exclamation"></i>',
            '            APLIKASI TERKUNCI SAMPAI LISENSI DIPERPANJANG',
            '        </div>',
            '    </div>',
            '</div>'
        ].join('');
        
        document.body.appendChild(overlay);
        
        var self = this;
        
        // Event listener untuk demo again
        document.getElementById('tryDemoAgainBtn').addEventListener('click', function() {
            self.activateDemoMode();
            self.removePopup(overlay);
        });
        
        this.disableAppInteractions();
        
        // Adjust height setelah render
        setTimeout(function() {
            self.adjustPopupHeight();
        }, 100);
    };

    // ==================== HELPER FUNCTIONS ====================
    OfflineLicenseSystem.prototype.createOverlay = function() {
        var overlay = document.createElement('div');
        overlay.id = 'offlineLicenseOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'flex-start';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '20px';
        overlay.style.animation = 'fadeIn 0.4s ease';
        overlay.style.overflowY = 'auto';
        overlay.style.overflowX = 'hidden';
        return overlay;
    };

    OfflineLicenseSystem.prototype.removeExistingPopup = function() {
        var existing = document.getElementById('offlineLicenseOverlay');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }
        this.restoreBackground();
    };

    OfflineLicenseSystem.prototype.removePopup = function(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        this.restoreBackground();
    };

    // ==================== ACTIVATION FUNCTIONS ====================
    OfflineLicenseSystem.prototype.showActivationPopup = function() {
        this.removeExistingPopup();
        
        var overlay = this.createOverlay();
        
        // Cek eligibility untuk demo terlebih dahulu
        var eligibility = this.checkDemoEligibility();
        var demoButtonHTML = '';
        
        if (eligibility.eligible) {
            demoButtonHTML = [
                '<button id="demoModeBtn" class="btn-demo-mode">',
                '    <i class="bi bi-play-circle"></i>',
                '    <span>COBA DEMO (15 MENIT)</span>',
                '</button>',
                '',
                '<div class="divider">',
                '    <span>ATAU</span>',
                '</div>'
            ].join('');
        } else {
            demoButtonHTML = [
                '<div class="demo-not-eligible alert alert-warning">',
                '    <i class="bi bi-exclamation-triangle"></i>',
                '    ' + eligibility.message,
                '</div>'
            ].join('');
        }
        
        overlay.innerHTML = [
            '<div class="offline-license-popup">',
            '    <div class="popup-header">',
            '        <div class="header-icon">',
            '            <i class="bi bi-shield-lock"></i>',
            '        </div>',
            '        <h2>AKTIVASI LISENSI OFFLINE</h2>',
            '        <p class="subtitle">Masukkan kode lisensi yang diberikan admin</p>',
            '    </div>',
            '    ',
            '    <div class="popup-body">',
            '        <div class="activation-card">',
            '            <div class="status-indicator inactive">',
            '                <div class="status-dot"></div>',
            '                <span>STATUS: BELUM AKTIF</span>',
            '            </div>',
            '            ',
            '            <div class="license-input-section">',
            '                <div class="input-group">',
            '                    <div class="input-label">',
            '                        <i class="bi bi-key-fill"></i>',
            '                        KODE LISENSI',
            '                    </div>',
            '                    <input ',
            '                        type="text" ',
            '                        id="offlineLicenseKey"',
            '                        placeholder="Contoh: RH-MTV-1Q2W3E"',
            '                        class="license-input"',
            '                        autocomplete="off"',
            '                        maxlength="14"',
            '                        autofocus',
            '                    />',
            '                    <div class="input-hint">',
            '                        Format: RH-MTV-XXXXXX (6 karakter/huruf)',
            '                    </div>',
            '                </div>',
            '                ',
            '                <div class="package-preview" id="packagePreview">',
            '                    <div class="preview-placeholder">',
            '                        <i class="bi bi-box"></i>',
            '                        <p>Paket akan terdeteksi otomatis</p>',
            '                    </div>',
            '                </div>',
            '            </div>',
            '            ',
            '            <div class="action-section">',
            '                <button id="activateOfflineBtn" class="btn-activate-large">',
            '                    <i class="bi bi-check-circle"></i>',
            '                    <span>AKTIVASI LISENSI</span>',
            '                </button>',
            '                ',
            '                <div class="divider">',
            '                    <span>ATAU</span>',
            '                </div>',
            '                ',
            demoButtonHTML,
            '                ',
            '                <button id="contactAdminBtn" class="btn-contact">',
            '                    <i class="bi bi-whatsapp"></i>',
            '                    <span>HUBUNGI ADMIN</span>',
            '                </button>',
            '                ',
            '                <button id="enterAdminPanelBtn" class="btn-admin-panel">',
            '                    <i class="bi bi-person-badge"></i>',
            '                    <span>PANEL ADMIN</span>',
            '                </button>',
            '            </div>',
            '            ',
            '            <div class="info-section">',
            '                <div class="info-box">',
            '                    <h4><i class="bi bi-info-circle"></i> CARA MENDAPATKAN KODE:</h4>',
            '                    <ol>',
            '                        <li>Hubungi admin via WhatsApp</li>',
            '                        <li>Pilih paket yang diinginkan</li>',
            '                        <li>Lakukan pembayaran</li>',
            '                        <li>Admin akan kirim kode lisensi</li>',
            '                        <li>Masukkan kode di atas</li>',
            '                    </ol>',
            '                </div>',
            '                ',
            '                <div class="device-info">',
            '                    <p><strong>ID Perangkat Anda:</strong></p>',
            '                    <code class="device-id">' + this.deviceId + '</code>',
            '                    <button onclick="copyToClipboard(\'' + this.deviceId + '\')" class="btn-copy">',
            '                        <i class="bi bi-copy"></i> Salin ID',
            '                    </button>',
            '                </div>',
            '                ',
            '                <div class="contact-details">',
            '                    <p><i class="bi bi-whatsapp"></i> <strong>Admin:</strong> 089609745090</p>',
            '                    <p><i class="bi bi-envelope"></i> <strong>Email:</strong> mahallahtv@gmail.com</p>',
            '                </div>',
            '            </div>',
            '        </div>',
            '    </div>',
            '</div>'
        ].join('');
        
        document.body.appendChild(overlay);
        
        this.setupActivationEvents(overlay);
        this.setupPackagePreview();
        this.darkenBackground();
        
        // Adjust height setelah render
        var self = this;
        setTimeout(function() {
            self.adjustPopupHeight();
        }, 100);
    };

    OfflineLicenseSystem.prototype.setupActivationEvents = function(overlay) {
        var self = this;
        var activateBtn = overlay.querySelector('#activateOfflineBtn');
        var licenseInput = overlay.querySelector('#offlineLicenseKey');
        
        if (!activateBtn || !licenseInput) {
            console.error('Element not found for activation events');
            return;
        }
        
        // Event untuk fokus pada input
        licenseInput.addEventListener('focus', function() {
            self.toggleFocusedInputMode(true, overlay);
        });
        
        // Event untuk klik di dalam input group
        var inputGroup = overlay.querySelector('.input-group');
        if (inputGroup) {
            inputGroup.addEventListener('click', function(e) {
                if (e.target !== licenseInput && !licenseInput.matches(':focus')) {
                    licenseInput.focus();
                }
            });
        }
        
        activateBtn.addEventListener('click', function() {
            self.processActivation(overlay, activateBtn, licenseInput);
        });
        
        licenseInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                self.processActivation(overlay, activateBtn, licenseInput);
            }
        });
        
        // Setup demo mode button
        var demoModeBtn = overlay.querySelector('#demoModeBtn');
        if (demoModeBtn) {
            demoModeBtn.addEventListener('click', function() {
                self.activateDemoMode();
                self.removePopup(overlay);
            });
        }
        
        // Setup contact admin button
        var contactAdminBtn = overlay.querySelector('#contactAdminBtn');
        if (contactAdminBtn) {
            contactAdminBtn.addEventListener('click', function() {
                window.open('https://wa.me/6289609745090?text=Halo%20Admin,%20saya%20ingin%20membeli%20lisensi%20Adzan%20App.%20ID%20Perangkat:%20' + encodeURIComponent(self.deviceId), '_blank');
            });
        }
        
        // Setup admin panel button
        var enterAdminPanelBtn = overlay.querySelector('#enterAdminPanelBtn');
        if (enterAdminPanelBtn) {
            enterAdminPanelBtn.addEventListener('click', function() {
                var password = prompt('Masukkan password admin:');
                if (password) {
                    self.showAdminPanel(password);
                }
            });
        }
    };

    OfflineLicenseSystem.prototype.processActivation = function(overlay, activateBtn, licenseInput) {
        var self = this;
        var licenseKey = licenseInput.value.trim();
        
        if (!licenseKey) {
            this.showToast('Masukkan kode lisensi', 'error');
            licenseInput.focus();
            return;
        }
        
        activateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> MEMPROSES...';
        activateBtn.disabled = true;
        
        // Coba aktivasi offline terlebih dahulu (lebih stabil)
        var offlineResult = this.activateLicense(licenseKey);
        
        if (offlineResult.success) {
            this.showToast('✓ Lisensi berhasil diaktifkan!', 'success');
            
            activateBtn.innerHTML = '<i class="bi bi-check-circle"></i> BERHASIL!';
            activateBtn.className = 'btn-success-large';
            
            setTimeout(function() {
                self.removePopup(overlay);
                setTimeout(function() {
                    location.reload();
                }, 500);
            }, 2000);
            
        } else {
            // Jika offline gagal, coba online
            this.showToast('Mencoba validasi online...', 'info');
            
            // Coba validasi online dengan timeout lebih singkat
            var validationPromise;
            
            if (window.onlineLicenseAPI && typeof window.onlineLicenseAPI.validateLicenseOnline === 'function') {
                validationPromise = window.onlineLicenseAPI.validateLicenseOnline(licenseKey)
                    .catch(function(error) {
                        console.warn('Online validation failed, using offline:', error.message);
                        // Fallback ke validasi offline
                        return Promise.resolve({
                            valid: false,
                            message: 'Validasi online gagal: ' + error.message
                        });
                    });
            } else {
                validationPromise = Promise.resolve({
                    valid: false,
                    message: 'Sistem online tidak tersedia'
                });
            }
            
            validationPromise
                .then(function(validationResult) {
                    if (validationResult.valid) {
                        // Coba aktivasi online
                        return self.activateLicenseOnline(licenseKey)
                            .catch(function(error) {
                                console.warn('Online activation failed:', error.message);
                                // Coba lagi dengan offline
                                return self.activateLicense(licenseKey);
                            });
                    } else {
                        // Tampilkan pesan error dari validasi
                        self.showToast(validationResult.message || 'Kode lisensi tidak valid', 'error');
                        
                        activateBtn.innerHTML = '<i class="bi bi-check-circle"></i> AKTIVASI LISENSI';
                        activateBtn.disabled = false;
                        licenseInput.focus();
                        licenseInput.select();
                        
                        throw new Error('Validation failed');
                    }
                })
                .then(function(result) {
                    if (result.success) {
                        self.showToast('✓ Lisensi berhasil diaktifkan!', 'success');
                        
                        activateBtn.innerHTML = '<i class="bi bi-check-circle"></i> BERHASIL!';
                        activateBtn.className = 'btn-success-large';
                        
                        setTimeout(function() {
                            self.removePopup(overlay);
                            setTimeout(function() {
                                location.reload();
                            }, 500);
                        }, 2000);
                    } else {
                        self.showToast(result.message || 'Aktivasi gagal', 'error');
                        
                        activateBtn.innerHTML = '<i class="bi bi-check-circle"></i> AKTIVASI LISENSI';
                        activateBtn.disabled = false;
                        licenseInput.focus();
                        licenseInput.select();
                    }
                })
                .catch(function(error) {
                    console.error('Activation process error:', error);
                    
                    // Tampilkan error yang lebih user-friendly
                    var errorMessage = error.message || 'Terjadi kesalahan sistem';
                    
                    if (errorMessage.includes('timeout')) {
                        self.showToast('Waktu validasi habis. Coba lagi atau gunakan koneksi yang lebih stabil.', 'error');
                    } else if (errorMessage.includes('Failed to load')) {
                        self.showToast('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 'error');
                    } else {
                        self.showToast('Error: ' + errorMessage, 'error');
                    }
                    
                    activateBtn.innerHTML = '<i class="bi bi-check-circle"></i> AKTIVASI LISENSI';
                    activateBtn.disabled = false;
                });
        }
    };

    OfflineLicenseSystem.prototype.activateLicense = function(licenseKey) {
        licenseKey = licenseKey.toUpperCase().trim();

        if (!this.isValidLicenseFormat(licenseKey)) {
            return {
                success: false,
                message: 'Format kode lisensi tidak valid'
            };
        }

        // CEK KE validLicenseKeys
        var licenseInfo = this.validLicenseKeys[licenseKey];
        
        if (!licenseInfo) {
            // Cek juga ke generated_licenses untuk backup
            var generated = this.findGeneratedLicense(licenseKey);
            if (!generated) {
                return {
                    success: false,
                    message: 'Kode lisensi tidak ditemukan'
                };
            }
            
            // Jika ditemukan di generated_licenses tapi belum di validLicenseKeys,
            // tambahkan ke validLicenseKeys
            if (generated.status === 'pending') {
                licenseInfo = {
                    package: generated.package,
                    expiryDays: generated.expiryDays || 365,
                    created: generated.created || new Date().toISOString().split('T')[0]
                };
                this.validLicenseKeys[licenseKey] = licenseInfo;
                this.saveValidLicenseKeys();
            } else if (generated.status === 'active') {
                return {
                    success: false,
                    message: 'Kode lisensi sudah digunakan'
                };
            }
        }

        // Hitung expiry
        var pkg = this.licensePackages[licenseInfo.package];
        var startDate = new Date();
        var expiryDate = new Date();

        if (licenseInfo.package === 'vip') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        } else if (licenseInfo.package === 'trial') {
            expiryDate.setDate(expiryDate.getDate() + 2);
        } else {
            expiryDate.setDate(expiryDate.getDate() + 365);
        }

        // Simpan lisensi aktif
        this.currentLicense = {
            key: licenseKey,
            package: licenseInfo.package,
            startDate: startDate.toISOString(),
            expiry: expiryDate.toISOString(),
            deviceId: this.deviceId,
            activatedAt: new Date().toISOString(),
            status: 'active'
        };

        this.saveLicense();

        // Update status di generated_licenses jika ada
        var generated = this.findGeneratedLicense(licenseKey);
        if (generated) {
            generated.status = 'active';
            generated.activatedAt = new Date().toISOString();
            generated.activatedDevice = this.deviceId;
            
            var all = JSON.parse(localStorage.getItem('generated_licenses') || '[]');
            for (var i = 0; i < all.length; i++) {
                if (all[i].code === licenseKey) {
                    all[i] = generated;
                    break;
                }
            }
            localStorage.setItem('generated_licenses', JSON.stringify(all));
        }

        return {
            success: true,
            data: {
                package: licenseInfo.package,
                expiry: expiryDate.toISOString()
            }
        };
    };

    // ==================== DEMO MODE FUNCTIONS ====================
    OfflineLicenseSystem.prototype.checkDemoEligibility = function() {
        var demoUsed = localStorage.getItem(this.demoUsedKey);
        
        if (demoUsed === 'true') {
            return {
                eligible: false,
                message: 'Mode demo sudah pernah digunakan pada perangkat ini'
            };
        }
        
        // Cek apakah sudah memiliki lisensi aktif
        if (this.currentLicense && this.currentLicense.status !== 'demo') {
            return {
                eligible: false,
                message: 'Lisensi sudah aktif'
            };
        }
        
        return {
            eligible: true,
            message: 'Dapat menggunakan demo'
        };
    };

    OfflineLicenseSystem.prototype.activateDemoMode = function() {
        var eligibility = this.checkDemoEligibility();
        if (!eligibility.eligible) {
            this.showToast(eligibility.message, 'error');
            return false;
        }
        
        // Tandai sudah pakai demo
        localStorage.setItem(this.demoUsedKey, 'true');
        
        var startDate = new Date();
        var expiryDate = new Date();
        expiryDate.setMinutes(startDate.getMinutes() + 15);
        
        this.currentLicense = {
            key: 'DEMO-MODE',
            package: 'demo',
            startDate: startDate.toISOString(),
            expiry: expiryDate.toISOString(),
            deviceId: this.deviceId,
            activatedAt: new Date().toISOString(),
            status: 'demo'
        };
        
        this.saveLicense();
        this.applyDemoFeatures();
        
        var self = this;
        setTimeout(function() {
            self.showExpiredPopup();
        }, 15 * 60 * 1000);
        
        this.showToast('Mode demo aktif selama 15 menit - Semua fitur terbuka', 'info');
        return true;
    };

    OfflineLicenseSystem.prototype.applyDemoFeatures = function() {
        console.log('Menerapkan semua fitur untuk mode demo');
        
        // Reset semua elemen ke visible
        var elementsToShow = [
            '#masjidLogo',
            '#screenOffBtn',
            '#timeImsak',
            '#timeSyuruq',
            '#thSyuruq',
            '#thImsak',
            'button[data-bs-target="#offcanvasDataMasjid"]',
            'button[data-bs-target="#offcanvasRunningText"]',
            'button[onclick="showSliderSettingsForm()"]'
        ];
        
        elementsToShow.forEach(function(selector) {
            var element = document.querySelector(selector);
            if (element) {
                element.style.display = '';
            }
        });
        
        // Setup left carousel dengan semua slide
        this.setupLeftCarouselForLicense([]);
        
        // Limit images untuk demo (7 gambar seperti VIP)
        this.limitImages(7);
        
        // Enable audio
        var audioIds = ['audioShalawat', 'audioAdzan'];
        for (var i = 0; i < audioIds.length; i++) {
            var audioElement = document.getElementById(audioIds[i]);
            if (audioElement) {
                if (audioIds[i] === 'audioShalawat') {
                    audioElement.src = 'audio/shalawat.mp3';
                } else if (audioIds[i] === 'audioAdzan') {
                    audioElement.src = 'audio/adzan.mp3';
                }
            }
        }
        
        // Matikan iklan selama demo
        if (this.adsTimer) {
            clearInterval(this.adsTimer);
            this.adsTimer = null;
        }
        
        // Update UI dengan info demo
        this.updateDemoUI();
    };

    // ==================== APPLY LICENSE FEATURES ====================
    OfflineLicenseSystem.prototype.applyLicenseFeatures = function() {
        if (!this.currentLicense) {
            console.log('Tidak ada lisensi aktif');
            return;
        }
        
        var packageData = this.licensePackages[this.currentLicense.package];
        if (!packageData) {
            console.log('Paket tidak ditemukan:', this.currentLicense.package);
            return;
        }
        
        var features = packageData.features;
        console.log('Menerapkan fitur untuk paket:', this.currentLicense.package);
        
        // 1. Hidden logo jika diperlukan
        if (features.hiddenLogo) {
            this.hideElement('#masjidLogo');
        }
        
        // 2. Hidden slide tertentu
        this.setupLeftCarouselForLicense(features.hiddenSlides);
        
        // 3. Hidden tombol ON/OFF
        if (features.hiddenPowerButton) {
            this.hideElement('#screenOffBtn');
        }
        
        // 4. Hidden nama desa dari alamat
        if (features.hiddenVillageName) {
            this.modifyAddress();
        }
        
        // 5. Batasi jumlah gambar
        this.limitImages(features.maxImages);
        
        // 6. Hidden card Imsak dan Syuruq
        if (features.hiddenImsakSyuruq) {
            this.hideElement('#timeImsak');
            this.hideElement('#timeSyuruq');
            this.hideElement('#thSyuruq');
            
            // Hide header Imsak juga
            var thImsak = document.getElementById('thImsak');
            if (thImsak) {
                thImsak.style.display = 'none';
            }
        }
        
        // 7. Teks Maghrib & Isya aktif hanya 15 menit pertama (untuk trial)
        if (features.maghribIsyaActiveMinutes > 0) {
            this.handleMaghribIsyaTimer(features.maghribIsyaActiveMinutes);
        }
        
        // 8. Hidden tombol pengaturan
        for (var j = 0; j < features.hiddenSettingsButtons.length; j++) {
            var buttonType = features.hiddenSettingsButtons[j];
            this.hideSettingsButton(buttonType);
        }
        
        // 9. Hidden tombol atur waktu adzan
        for (var k = 0; k < features.hiddenAdzanButtons.length; k++) {
            var adzanButtonType = features.hiddenAdzanButtons[k];
            this.hideAdzanButton(adzanButtonType);
        }
        
        // 10. Hidden audio
        for (var l = 0; l < features.hiddenAudio.length; l++) {
            var audioType = features.hiddenAudio[l];
            this.disableAudio(audioType);
        }
        
        // Update UI dengan info lisensi
        this.updateLicenseUI();
    };

    // ==================== HELPER FUNCTIONS FOR FEATURES ====================
    OfflineLicenseSystem.prototype.hideElement = function(selector) {
        var element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    };

    OfflineLicenseSystem.prototype.modifyAddress = function() {
        var addressElement = document.getElementById('masjidAddress');
        if (addressElement) {
            var address = addressElement.textContent;
            var modifiedAddress = address.replace(/Desa\s+\w+,?\s*/i, '');
            addressElement.textContent = modifiedAddress || 'Masjid Al-Muthmainnah';
        }
    };

    OfflineLicenseSystem.prototype.limitImages = function(maxImages) {
        if (typeof settings !== 'undefined' && settings.uploadedImages) {
            if (settings.uploadedImages.length > maxImages) {
                settings.uploadedImages = settings.uploadedImages.slice(0, maxImages);
                if (typeof saveSettings === 'function') {
                    saveSettings();
                }
            }
            
            if (typeof loadMainCarousel === 'function') {
                loadMainCarousel();
            }
        }
    };

    OfflineLicenseSystem.prototype.handleMaghribIsyaTimer = function(minutes) {
        var firstOpenKey = 'firstOpenTime';
        var firstOpenTime = localStorage.getItem(firstOpenKey);
        
        if (!firstOpenTime) {
            firstOpenTime = new Date().getTime();
            localStorage.setItem(firstOpenKey, firstOpenTime);
        }
        
        var now = new Date().getTime();
        var timeDiff = now - parseInt(firstOpenTime);
        var minutesDiff = timeDiff / (1000 * 60);
        
        if (minutesDiff > minutes) {
            // Ganti teks header menjadi "-----"
            var headerRow = document.getElementById('jadwalHeader');
            if (headerRow) {
                var headers = headerRow.getElementsByTagName('th');
                for (var i = 0; i < headers.length; i++) {
                    var headerText = headers[i].textContent.trim();
                    if (headerText === 'Maghrib' || headerText === 'Isya') {
                        headers[i].textContent = '-----';
                    }
                }
            }
        }
    };

    OfflineLicenseSystem.prototype.hideSettingsButton = function(buttonType) {
        var selector = '';
        
        switch(buttonType) {
            case 'data-masjid':
                selector = 'button[data-bs-target="#offcanvasDataMasjid"]';
                break;
            case 'running-text':
                selector = 'button[data-bs-target="#offcanvasRunningText"]';
                break;
            case 'slider-duration':
                selector = 'button[onclick="showSliderSettingsForm()"]';
                break;
        }
        
        if (selector) {
            this.hideElement(selector);
        }
    };

    OfflineLicenseSystem.prototype.hideAdzanButton = function(buttonType) {
        var self = this;
        setTimeout(function() {
            var modal = document.getElementById('prayerSettingsModal');
            if (modal) {
                var buttonSelector = '';
                
                if (buttonType === 'countdown-adzan') {
                    buttonSelector = 'button[onclick*="adzan"]';
                } else if (buttonType === 'countdown-iqamah') {
                    buttonSelector = 'button[onclick*="iqamah"]';
                } else if (buttonType === 'overlay-duration') {
                    buttonSelector = 'button[onclick*="overlay"]';
                }
                
                if (buttonSelector) {
                    var buttons = modal.querySelectorAll(buttonSelector);
                    for (var i = 0; i < buttons.length; i++) {
                        buttons[i].style.display = 'none';
                    }
                }
            }
        }, 1000);
    };

    OfflineLicenseSystem.prototype.disableAudio = function(audioType) {
        var audioId = '';
        
        switch(audioType) {
            case 'shalawat':
                audioId = 'audioShalawat';
                break;
            case 'adzan':
                audioId = 'audioAdzan';
                break;
        }
        
        if (audioId) {
            var audioElement = document.getElementById(audioId);
            if (audioElement) {
                audioElement.src = '';
                audioElement.removeAttribute('src');
            }
        }
    };

    OfflineLicenseSystem.prototype.setupLeftCarouselForLicense = function(hiddenSlides) {
        // Simpan hidden slides ke localStorage
        localStorage.setItem('license_hidden_slides', JSON.stringify(hiddenSlides || []));
        
        // Panggil fungsi loadLeftCarousel jika ada
        if (typeof window.loadLeftCarousel === 'function') {
            setTimeout(function() {
                window.loadLeftCarousel();
            }, 100);
        }
    };

    // ==================== PACKAGE PREVIEW FUNCTIONS ====================
    OfflineLicenseSystem.prototype.setupPackagePreview = function() {
        var self = this;
        var licenseInput = document.getElementById('offlineLicenseKey');
        
        if (!licenseInput) return;
        
        var lastValue = '';
        var lastUpdateTime = 0;
        
        licenseInput.addEventListener('input', function(e) {
            var key = e.target.value.toUpperCase().trim();
            
            // Skip jika value sama dengan sebelumnya
            if (key === lastValue) return;
            
            // Debounce: minimal 200ms antara update
            var now = Date.now();
            if (now - lastUpdateTime < 200) return;
            
            lastValue = key;
            lastUpdateTime = now;
            
            // Update package preview dengan debounce
            if (typeof self.updatePackagePreview === 'function') {
                self.updatePackagePreview(key);
            }
        });
        
        // Juga handle paste event
        licenseInput.addEventListener('paste', function(e) {
            // Tunggu sebentar agar value sudah terupdate
            setTimeout(function() {
                var key = licenseInput.value.toUpperCase().trim();
                if (typeof self.updatePackagePreview === 'function') {
                    self.updatePackagePreview(key);
                }
            }, 100);
        });
    };

    OfflineLicenseSystem.prototype.updatePackagePreview = function(key) {
        var packagePreview = document.getElementById('packagePreview');
        if (!packagePreview) return;
        
        // Clear previous timeout
        if (this.previewUpdateTimeout) {
            clearTimeout(this.previewUpdateTimeout);
        }
        
        // Debounce: tunggu 300ms setelah user berhenti mengetik
        var self = this;
        this.previewUpdateTimeout = setTimeout(function() {
            self._updatePackagePreviewDebounced(key, packagePreview);
        }, 300);
    };

    OfflineLicenseSystem.prototype._updatePackagePreviewDebounced = function(key, packagePreview) {
        if (!key) {
            packagePreview.innerHTML = [
                '<div class="preview-placeholder">',
                '    <i class="bi bi-box"></i>',
                '    <p>Paket akan terdeteksi otomatis</p>',
                '</div>'
            ].join('');
            return;
        }
        
        var self = this;

        // Cek cache terlebih dahulu
        var cached = this.getCachedValidation(key);
        if (cached) {
            console.log('[PREVIEW] Using cached validation for:', key);
            this.renderPreviewFromCache(cached, packagePreview);
            return;
        }
        
        // Cek format terlebih dahulu
        if (!this.isValidLicenseFormat(key)) {
            packagePreview.innerHTML = [
                '<div class="package-invalid">',
                '    <div class="package-icon">',
                '        <i class="bi bi-exclamation-circle"></i>',
                '    </div>',
                '    <div class="package-info">',
                '        <h4>Format Tidak Valid</h4>',
                '        <p>Format: RH-MTV-XXXXXX (6 karakter/huruf)</p>',
                '    </div>',
                '</div>'
            ].join('');
            return;
        }
        
        // Tampilkan loading state
        packagePreview.innerHTML = [
            '<div class="package-loading">',
            '    <div class="package-icon">',
            '        <i class="bi bi-hourglass-split"></i>',
            '    </div>',
            '    <div class="package-info">',
            '        <h4>Memeriksa kode...</h4>',
            '        <p>Sedang memvalidasi lisensi</p>',
            '    </div>',
            '</div>'
        ].join('');
        
        // Cek di validLicenseKeys lokal terlebih dahulu (cepat)
        var licenseInfo = this.validLicenseKeys[key];
        
        // Jika ada di lokal dan status bukan active/expired, langsung tampilkan
        if (licenseInfo) {
            var generated = this.findGeneratedLicense(key);
            var status = generated?.status || 'pending';
            
            if (status === 'active' || status === 'used' || status === 'expired') {
                // Tampilkan dari data lokal saja
                this.showLocalPreview(key, licenseInfo, status, generated, packagePreview);
                return;
            }
        }
        
        // Jika ada API online, validasi dari spreadsheet
        if (window.onlineLicenseAPI && typeof window.onlineLicenseAPI.validateLicenseOnline === 'function') {
            console.log('[PREVIEW] Validating online for:', key);
            
            window.onlineLicenseAPI.validateLicenseOnline(key)
                .then(function(validationResult) {
                    // Simpan ke cache
                    self.setCachedValidation(key, validationResult);
                    
                    // Render hasil validasi
                    self.renderValidationResult(validationResult, key, packagePreview);
                })
                .catch(function(error) {
                    console.warn('[PREVIEW] Online validation failed for', key + ':', error.message);
                    // Fallback ke validasi lokal
                    self.showLocalPreview(key, licenseInfo, 'pending', null, packagePreview);
                });
            
        } else {
            // Jika tidak ada API online, gunakan validasi lokal
            this.showLocalPreview(key, licenseInfo, 'pending', null, packagePreview);
        }
    };

    // ==================== FOCUSED INPUT MODE ====================
    OfflineLicenseSystem.prototype.toggleFocusedInputMode = function(enable, overlay) {
        var popup = overlay.querySelector('.offline-license-popup');
        var licenseInput = overlay.querySelector('#offlineLicenseKey');
        var inputGroup = overlay.querySelector('.input-group');
        var packagePreview = overlay.querySelector('#packagePreview');
        
        if (!popup || !inputGroup) return;
        
        if (enable) {
            // Masuk ke mode fokus
            popup.classList.add('focused-input-mode');
            
            // Tampilkan preview jika ada konten
            if (packagePreview && packagePreview.innerHTML.trim()) {
                packagePreview.style.display = 'block';
                packagePreview.style.visibility = 'visible';
                packagePreview.style.opacity = '1';
            }
            
            // Buat tombol close
            var closeBtn = document.createElement('button');
            closeBtn.className = 'close-focused-btn';
            closeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
            closeBtn.addEventListener('click', function() {
                this.toggleFocusedInputMode(false, overlay);
            }.bind(this));
            
            popup.appendChild(closeBtn);
            
            // Buat tombol validasi di dalam input
            var validationIcons = document.createElement('div');
            validationIcons.className = 'input-validation-icons';
            
            var validIcon = document.createElement('button');
            validIcon.className = 'validation-icon valid disabled';
            validIcon.innerHTML = '<i class="bi bi-check-lg"></i>';
            validIcon.title = 'Kode valid - Klik untuk aktivasi';
            validIcon.addEventListener('click', function() {
                if (!validIcon.classList.contains('disabled')) {
                    this.processActivation(overlay, overlay.querySelector('#activateOfflineBtn'), licenseInput);
                }
            }.bind(this));
            
            var invalidIcon = document.createElement('button');
            invalidIcon.className = 'validation-icon invalid disabled';
            invalidIcon.innerHTML = '<i class="bi bi-x-lg"></i>';
            invalidIcon.title = 'Kode tidak valid';
            invalidIcon.addEventListener('click', function() {
                this.showToast('Kode lisensi tidak valid', 'error');
                licenseInput.focus();
            }.bind(this));
            
            validationIcons.appendChild(validIcon);
            validationIcons.appendChild(invalidIcon);
            inputGroup.appendChild(validationIcons);
            
            // Setup real-time validation
            this.setupRealTimeValidation(licenseInput, validIcon, invalidIcon);
            
            // Update preview berdasarkan nilai saat ini
            if (licenseInput.value) {
                licenseInput.dispatchEvent(new Event('input'));
            }
            
            // Fokuskan input
            setTimeout(function() {
                licenseInput.focus();
                licenseInput.select();
            }, 300);
            
        } else {
            // Keluar dari mode fokus
            popup.classList.remove('focused-input-mode');
            
            // Hapus tombol close
            var closeBtn = popup.querySelector('.close-focused-btn');
            if (closeBtn) {
                closeBtn.remove();
            }
            
            // Hapus tombol validasi
            var validationIcons = inputGroup.querySelector('.input-validation-icons');
            if (validationIcons) {
                validationIcons.remove();
            }
            
            // Reset fokus
            licenseInput.blur();
        }
    };

    // ==================== VALIDATION FUNCTIONS ====================
    OfflineLicenseSystem.prototype.isValidLicenseFormat = function(key) {
        var pattern = /^RH-MTV-[A-Z0-9]{6}$/;
        return pattern.test(key);
    };

    OfflineLicenseSystem.prototype.setupRealTimeValidation = function(licenseInput, validIcon, invalidIcon) {
        var self = this;
        
        licenseInput.addEventListener('input', function() {
            var key = this.value.toUpperCase().trim();
            
            // Reset icons
            validIcon.classList.add('disabled');
            invalidIcon.classList.add('disabled');
            
            // Update package preview (akan menampilkan status)
            if (typeof self.updatePackagePreview === 'function') {
                self.updatePackagePreview(key);
            }
            
            if (!key) {
                return;
            }
            
            // Cek format
            if (!self.isValidLicenseFormat(key)) {
                invalidIcon.classList.remove('disabled');
                invalidIcon.classList.add('active');
                validIcon.classList.remove('active');
                return;
            }
            
            // Cek status lisensi online (dengan timeout singkat)
            if (window.onlineLicenseAPI && typeof window.onlineLicenseAPI.validateLicenseOnline === 'function') {
                var validationPromise = window.onlineLicenseAPI.validateLicenseOnline(key)
                    .catch(function() {
                        // Jika online gagal, gunakan validasi lokal
                        return Promise.resolve({
                            valid: false,
                            status: 'offline',
                            message: 'Tidak dapat terhubung ke server'
                        });
                    });
                
                validationPromise.then(function(validationResult) {
                    if (validationResult.valid) {
                        validIcon.classList.remove('disabled');
                        validIcon.classList.add('active');
                        invalidIcon.classList.remove('active');
                    } else {
                        invalidIcon.classList.remove('disabled');
                        invalidIcon.classList.add('active');
                        validIcon.classList.remove('active');
                    }
                });
                
            } else {
                // Validasi lokal saja
                var licenseInfo = self.validLicenseKeys[key];
                if (licenseInfo) {
                    validIcon.classList.remove('disabled');
                    validIcon.classList.add('active');
                    invalidIcon.classList.remove('active');
                } else {
                    invalidIcon.classList.remove('disabled');
                    invalidIcon.classList.add('active');
                    validIcon.classList.remove('active');
                }
            }
        });
        
        // Juga cek saat ini
        if (licenseInput.value) {
            licenseInput.dispatchEvent(new Event('input'));
        }
    };

    // ==================== CACHE FUNCTIONS ====================
    OfflineLicenseSystem.prototype.getCachedValidation = function(key) {
        var cache = this.licenseValidationCache[key];
        if (cache && (Date.now() - cache.timestamp < this.cacheTimeout)) {
            return cache.data;
        }
        return null;
    };

    OfflineLicenseSystem.prototype.setCachedValidation = function(key, data) {
        this.licenseValidationCache[key] = {
            data: data,
            timestamp: Date.now()
        };
        
        // Batasi ukuran cache
        var keys = Object.keys(this.licenseValidationCache);
        if (keys.length > 50) {
            // Hapus yang paling lama
            var oldestKey = keys.reduce(function(oldest, current) {
                return this.licenseValidationCache[current].timestamp < 
                       this.licenseValidationCache[oldest].timestamp ? current : oldest;
            }.bind(this));
            
            delete this.licenseValidationCache[oldestKey];
        }
    };

    // ==================== RENDER FUNCTIONS ====================
    OfflineLicenseSystem.prototype.renderPreviewFromCache = function(cachedResult, packagePreview) {
        this.renderValidationResult(cachedResult, null, packagePreview);
    };

    OfflineLicenseSystem.prototype.renderValidationResult = function(validationResult, key, packagePreview) {
        var self = this;
        var html = '';
        
        if (validationResult.valid) {
            // Valid dan siap diaktifkan
            var packageData = this.licensePackages[validationResult.details?.package || 'basic'];
            
            html = [
                '<div class="package-detected ' + (validationResult.details?.package || 'basic') + '">',
                '    <div class="package-icon">',
                '        <i class="bi bi-shield-check"></i>',
                '    </div>',
                '    <div class="package-info">',
                '        <h4>' + (packageData?.name || 'Dasar') + '</h4>',
                '        <p>Siap diaktifkan</p>',
                '        <div class="package-features">',
                '            <span><i class="bi bi-images"></i> ' + (packageData?.features?.maxImages || 2) + ' gambar</span>',
                '            <span><i class="bi ' + (packageData?.features?.hiddenAudio?.length === 0 ? 'bi-check-lg' : 'bi-x-lg') + '"></i> Audio</span>',
                '            <span><i class="bi ' + (packageData?.features?.ads?.enabled ? 'bi-x-lg' : 'bi-check-lg') + '"></i> Iklan</span>',
                '        </div>',
                '    </div>',
                '</div>'
            ].join('');
            
        } else {
            // Tidak valid, tampilkan pesan error
            var status = validationResult.status;
            var message = validationResult.message;
            var icon = 'bi-exclamation-circle';
            var title = 'Kode Tidak Valid';
            
            switch(status) {
                case 'active':
                    title = 'Kode Aktif';
                    message = 'Kode lisensi yang Anda input sudah digunakan';
                    icon = 'bi-check-circle';
                    break;
                    
                case 'expired':
                case 'used':
                    title = 'Kode Kadaluarsa';
                    var expiryDate = validationResult.details?.expiry || '';
                    var formattedDate = this.formatDateIndonesian(expiryDate);
                    message = 'Kode lisensi telah berakhir tanggal ' + formattedDate;
                    icon = 'bi-calendar-x';
                    break;
                    
                case 'not_found':
                    title = 'Kode Tidak Dikenali';
                    message = 'Kode lisensi tidak ditemukan dalam database';
                    icon = 'bi-question-circle';
                    break;
                    
                default:
                    title = 'Kode Tidak Valid';
                    message = validationResult.message || 'Kode lisensi tidak valid';
            }
            
            html = [
                '<div class="package-invalid ' + status + '">',
                '    <div class="package-icon">',
                '        <i class="bi ' + icon + '"></i>',
                '    </div>',
                '    <div class="package-info">',
                '        <h4>' + title + '</h4>',
                '        <p>' + message + '</p>',
                '    </div>',
                '</div>'
            ].join('');
        }
        
        packagePreview.innerHTML = html;
    };

    OfflineLicenseSystem.prototype.showLocalPreview = function(key, licenseInfo, status, generated, packagePreview) {
        if (licenseInfo) {
            var packageData = this.licensePackages[licenseInfo.package];
            
            if (status === 'active') {
                // Kode sudah aktif
                packagePreview.innerHTML = [
                    '<div class="package-invalid active">',
                    '    <div class="package-icon">',
                    '        <i class="bi bi-check-circle"></i>',
                    '    </div>',
                    '    <div class="package-info">',
                    '        <h4>Kode Aktif</h4>',
                    '        <p>Kode lisensi yang Anda input sudah digunakan</p>',
                    '    </div>',
                    '</div>'
                ].join('');
                
            } else if (status === 'used' || status === 'expired') {
                // Kode kadaluarsa
                var expiryDate = generated?.expiry || '';
                var formattedDate = this.formatDateIndonesian(expiryDate);
                
                packagePreview.innerHTML = [
                    '<div class="package-invalid expired">',
                    '    <div class="package-icon">',
                    '        <i class="bi bi-calendar-x"></i>',
                    '    </div>',
                    '    <div class="package-info">',
                    '        <h4>Kode Kadaluarsa</h4>',
                    '        <p>Kode lisensi telah berakhir tanggal ' + formattedDate + '</p>',
                    '    </div>',
                    '</div>'
                ].join('');
                
            } else {
                // Valid dan siap diaktifkan
                packagePreview.innerHTML = [
                    '<div class="package-detected ' + licenseInfo.package + '">',
                    '    <div class="package-icon">',
                    '        <i class="bi bi-shield-check"></i>',
                    '    </div>',
                    '    <div class="package-info">',
                    '        <h4>' + packageData.name + '</h4>',
                    '        <p>' + licenseInfo.expiryDays + ' hari aktif</p>',
                    '        <div class="package-features">',
                    '            <span><i class="bi bi-images"></i> ' + packageData.features.maxImages + ' gambar</span>',
                    '            <span><i class="bi ' + (packageData.features.hiddenAudio.length === 0 ? 'bi-check-lg' : 'bi-x-lg') + '"></i> Audio</span>',
                    '            <span><i class="bi ' + (packageData.features.ads.enabled ? 'bi-x-lg' : 'bi-check-lg') + '"></i> Iklan</span>',
                    '        </div>',
                    '    </div>',
                '</div>'
                ].join('');
            }
            
        } else {
            // Kode tidak ditemukan di database lokal
            packagePreview.innerHTML = [
                '<div class="package-invalid not-found">',
                '    <div class="package-icon">',
                '        <i class="bi bi-question-circle"></i>',
                '    </div>',
                '    <div class="package-info">',
                '        <h4>Kode Tidak Dikenali</h4>',
                '        <p>Kode lisensi tidak ditemukan dalam database</p>',
                '    </div>',
            '</div>'
            ].join('');
        }
    };

    // ==================== UTILITY FUNCTIONS ====================
    OfflineLicenseSystem.prototype.getDeviceId = function() {
        var deviceId = localStorage.getItem('adzan_device_id');
        if (!deviceId) {
            var timestamp = Date.now().toString(36);
            var random = Math.random().toString(36).substr(2, 6);
            deviceId = 'DEV-' + timestamp + '-' + random;
            deviceId = deviceId.toUpperCase();
            localStorage.setItem('adzan_device_id', deviceId);
        }
        return deviceId;
    };

    OfflineLicenseSystem.prototype.findGeneratedLicense = function(code) {
        var list = JSON.parse(localStorage.getItem('generated_licenses') || '[]');
        for (var i = 0; i < list.length; i++) {
            if (list[i].code === code) {
                return list[i];
            }
        }
        return null;
    };

    OfflineLicenseSystem.prototype.loadValidLicenseKeys = function() {
        try {
            var saved = localStorage.getItem('valid_license_keys');
            if (saved) {
                var loadedKeys = JSON.parse(saved);
                // Gabungkan dengan default keys
                for (var key in loadedKeys) {
                    if (loadedKeys.hasOwnProperty(key)) {
                        this.validLicenseKeys[key] = loadedKeys[key];
                    }
                }
                console.log('Loaded valid license keys from storage:', Object.keys(loadedKeys).length, 'keys');
            }
        } catch (error) {
            console.error('Error loading valid license keys:', error);
        }
    };

    OfflineLicenseSystem.prototype.saveValidLicenseKeys = function() {
        try {
            localStorage.setItem('valid_license_keys', JSON.stringify(this.validLicenseKeys));
            return true;
        } catch (error) {
            console.error('Error saving valid license keys:', error);
            return false;
        }
    };

    OfflineLicenseSystem.prototype.formatDateIndonesian = function(dateStr) {
        if (!dateStr) return 'Tidak tersedia';
        
        try {
            var date;
            
            if (typeof dateStr === 'string') {
                date = new Date(dateStr);
                
                if (isNaN(date.getTime())) {
                    var parts = dateStr.split('-');
                    if (parts.length >= 3) {
                        date = new Date(parts[0], parts[1] - 1, parts[2]);
                    }
                }
            } else if (dateStr instanceof Date) {
                date = dateStr;
            }
            
            if (date && !isNaN(date.getTime())) {
                var day = date.getDate();
                var month = date.getMonth();
                var year = date.getFullYear();
                
                var monthNames = [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                
                return day + ' ' + monthNames[month] + ' ' + year;
            }
            
            return dateStr.toString();
        } catch (e) {
            return dateStr.toString();
        }
    };

    // ==================== BACKGROUND FUNCTIONS ====================
    OfflineLicenseSystem.prototype.darkenBackground = function() {
        var elements = document.querySelectorAll('body > *:not(#offlineLicenseOverlay)');
        for (var i = 0; i < elements.length; i++) {
            elements[i].style.filter = 'brightness(0.3) blur(2px)';
            elements[i].style.pointerEvents = 'none';
        }
    };

    OfflineLicenseSystem.prototype.restoreBackground = function() {
        var elements = document.querySelectorAll('body > *:not(#offlineLicenseOverlay)');
        for (var i = 0; i < elements.length; i++) {
            elements[i].style.filter = '';
            elements[i].style.pointerEvents = '';
        }
    };

    OfflineLicenseSystem.prototype.disableAppInteractions = function() {
        var elements = document.querySelectorAll('body > *:not(#offlineLicenseOverlay)');
        for (var i = 0; i < elements.length; i++) {
            elements[i].style.pointerEvents = 'none';
            elements[i].style.opacity = '0.2';
            elements[i].style.filter = 'blur(3px)';
        }
    };

    // ==================== TOAST NOTIFICATION ====================
    OfflineLicenseSystem.prototype.showToast = function(message, type) {
        var oldToast = document.querySelector('.license-toast');
        if (oldToast && oldToast.parentNode) {
            oldToast.parentNode.removeChild(oldToast);
        }
        
        var toast = document.createElement('div');
        toast.className = 'license-toast toast-' + type;
        
        var icon = '';
        if (type === 'success') {
            icon = 'check-circle';
        } else if (type === 'error') {
            icon = 'exclamation-circle';
        } else {
            icon = 'info-circle';
        }
        
        toast.innerHTML = [
            '<i class="bi bi-' + icon + '"></i>',
            '<span>' + message + '</span>'
        ].join('');
        
        document.body.appendChild(toast);
        
        var selfToast = toast;
        setTimeout(function() {
            if (selfToast.parentNode) {
                selfToast.parentNode.removeChild(selfToast);
            }
        }, 4000);
    };

    // ==================== POPUP ADJUSTMENT ====================
    OfflineLicenseSystem.prototype.adjustPopupHeight = function() {
        var popup = document.querySelector('.offline-license-popup');
        if (!popup) return;
        
        var viewportHeight = window.innerHeight;
        var popupHeight = popup.offsetHeight;
        var maxHeight = viewportHeight * 0.9;
        
        if (popupHeight > maxHeight) {
            popup.style.maxHeight = maxHeight + 'px';
            
            var body = popup.querySelector('.popup-body');
            if (body) {
                var header = popup.querySelector('.popup-header');
                var footer = popup.querySelector('.popup-footer');
                var headerHeight = header ? header.offsetHeight : 0;
                var footerHeight = footer ? footer.offsetHeight : 0;
                
                body.style.maxHeight = (maxHeight - headerHeight - footerHeight - 40) + 'px';
                body.style.overflowY = 'auto';
            }
        } else {
            popup.style.maxHeight = 'none';
            
            var body = popup.querySelector('.popup-body');
            if (body) {
                body.style.maxHeight = 'none';
                body.style.overflowY = 'visible';
            }
        }
        
        // Center the popup vertically if it's smaller than viewport
        if (popupHeight < viewportHeight * 0.8) {
            popup.style.marginTop = ((viewportHeight - popupHeight) / 2 - 20) + 'px';
        } else {
            popup.style.marginTop = '20px';
        }
    };

    // ==================== ADMIN FUNCTIONS ====================
    OfflineLicenseSystem.prototype.showAdminPanel = function(password) {
        // Password sederhana untuk akses admin
        if (password !== 'admin123') {
            this.showToast('Password admin salah!', 'error');
            return;
        }
        
        this.removeExistingPopup();
        
        var overlay = this.createOverlay();
        
        // Ambil data lisensi yang sudah digenerate
        var generatedLicenses = JSON.parse(localStorage.getItem('generated_licenses') || '[]');
        
        overlay.innerHTML = [
            '<div class="offline-license-popup admin">',
            '    <div class="popup-header">',
            '        <h2>PANEL ADMIN LISENSI</h2>',
            '        <p class="subtitle">Generate dan Kelola Kode Lisensi</p>',
            '    </div>',
            '    ',
            '    <div class="popup-body">',
            '        <div class="admin-panel">',
            '            <div class="admin-section">',
            '                <h4><i class="bi bi-plus-circle"></i> Generate Kode Baru</h4>',
            '                <div class="admin-form">',
            '                    <div class="form-group">',
            '                        <label><i class="bi bi-box"></i> Pilih Paket</label>',
            '                        <select id="adminPackageSelect" class="admin-select">',
            '                            <option value="trial">Uji Coba (2 hari)</option>',
            '                            <option value="basic">Dasar (1 tahun)</option>',
            '                            <option value="premium">Premium (1 tahun)</option>',
            '                            <option value="vip">VIP (Seumur Hidup)</option>',
            '                        </select>',
            '                    </div>',
            '                    ',
            '                    <div class="form-group">',
            '                        <label><i class="bi bi-laptop"></i> ID Perangkat (Opsional)</label>',
            '                        <input type="text" id="adminDeviceId" class="admin-input" placeholder="Contoh: DEV-MJAH2YDI-GWZ450">',
            '                    </div>',
            '                    ',
            '                    <div class="form-group">',
            '                        <label><i class="bi bi-person"></i> Nama Customer</label>',
            '                        <input type="text" id="adminCustomerName" class="admin-input" placeholder="Nama customer">',
            '                    </div>',
            '                    ',
            '                    <button id="generateLicenseBtn" class="btn-admin-generate">',
            '                        <i class="bi bi-magic"></i> GENERATE KODE LISENSI',
            '                    </button>',
            '                </div>',
            '            </div>',
            '            ',
            '            <div class="admin-section">',
            '                <h4><i class="bi bi-list-check"></i> Kode yang Telah Digenerate</h4>',
            '                <div class="license-list">',
            (generatedLicenses.length > 0 ? 
                '<table class="admin-table">' +
                '    <thead>' +
                '        <tr>' +
                '            <th>Kode</th>' +
                '            <th>Paket</th>' +
                '            <th>Customer</th>' +
                '            <th>Tanggal</th>' +
                '            <th>Status</th>' +
                '        </tr>' +
                '    </thead>' +
                '    <tbody>' +
                generatedLicenses.map(function(license) {
                    return '<tr>' +
                           '    <td><code>' + license.code + '</code></td>' +
                           '    <td>' + (license.package || 'N/A') + '</td>' +
                           '    <td>' + (license.customerName || 'N/A') + '</td>' +
                           '    <td>' + new Date(license.generatedAt).toLocaleDateString('id-ID') + '</td>' +
                           '    <td><span class="status-badge ' + license.status + '">' + license.status.toUpperCase() + '</span></td>' +
                           '</tr>';
                }).join('') +
                '    </tbody>' +
                '</table>' : 
                '<div class="empty-state">' +
                '    <i class="bi bi-inbox"></i>' +
                '    <p>Belum ada kode lisensi yang digenerate</p>' +
                '</div>'),
            '                </div>',
            '                <div class="admin-actions">',
            '                    <button id="exportLicensesBtn" class="btn-admin-secondary">',
            '                        <i class="bi bi-download"></i> Export ke CSV',
            '                    </button>',
            '                    <button id="clearLicensesBtn" class="btn-admin-danger">',
            '                        <i class="bi bi-trash"></i> Hapus Semua',
            '                    </button>',
            '                </div>',
            '            </div>',
            '            ',
            '            <div class="admin-section">',
            '                <h4><i class="bi bi-gear"></i> Pengaturan Sistem</h4>',
            '                <div class="system-settings">',
            '                    <div class="setting-item">',
            '                        <label><i class="bi bi-shield-check"></i> Valid License Keys</label>',
            '                        <div class="setting-value">' + Object.keys(this.validLicenseKeys).length + ' kode aktif</div>',
            '                    </div>',
            '                    ',
            '                    <div class="setting-item">',
            '                        <label><i class="bi bi-device-ssd"></i> Device ID Aktif</label>',
            '                        <div class="setting-value">' + this.deviceId + '</div>',
            '                    </div>',
            '                    ',
            '                    <div class="setting-item">',
            '                        <label><i class="bi bi-clock-history"></i> Lisensi Saat Ini</label>',
            '                        <div class="setting-value">' + (this.currentLicense ? this.currentLicense.package : 'Tidak ada') + '</div>',
            '                    </div>',
            '                </div>',
            '            </div>',
            '        </div>',
            '            <button id="closeAdminPanelBtn" class="btn-admin-close">',
            '                <i class="bi bi-x-lg"></i> TUTUP PANEL',
            '            </button>',
            '            <div class="admin-info">',
            '                <p><i class="bi bi-info-circle"></i> Panel Admin - Hanya untuk penggunaan internal</p>',
            '            </div>',
            '    </div>',
            '    ',
            '</div>'
        ].join('');
        
        document.body.appendChild(overlay);
        this.darkenBackground();
        
        var self = this;
        
        // Event listener untuk generate license
        document.getElementById('generateLicenseBtn').addEventListener('click', function() {
            var packageType = document.getElementById('adminPackageSelect').value;
            var deviceId = document.getElementById('adminDeviceId').value || 'N/A';
            var customerName = document.getElementById('adminCustomerName').value || 'Anonymous';
            
            if (!customerName.trim()) {
                self.showToast('Masukkan nama customer!', 'error');
                return;
            }
            
            var licenseCode = self.generateLicenseCode(packageType, deviceId, customerName);
            
            // Tampilkan hasil
            var resultHTML = [
                '<div class="license-result">',
                '    <h5><i class="bi bi-check-circle"></i> Kode Lisensi Berhasil Digenerate!</h5>',
                '    <div class="result-details">',
                '        <p><strong>Kode:</strong> <code>' + licenseCode + '</code></p>',
                '        <p><strong>Paket:</strong> ' + self.licensePackages[packageType].name + '</p>',
                '        <p><strong>Customer:</strong> ' + customerName + '</p>',
                '        <p><strong>Device ID:</strong> ' + deviceId + '</p>',
                '    </div>',
                '    <div class="result-actions">',
                '        <button onclick="copyToClipboard(\'' + licenseCode + '\')" class="btn-copy-admin">',
                '            <i class="bi bi-copy"></i> Salin Kode',
                '        </button>',
                '        <button onclick="window.open(\'https://wa.me/?text=Kode%20Lisensi:%20' + encodeURIComponent(licenseCode) + '%0APaket:%20' + encodeURIComponent(self.licensePackages[packageType].name) + '%0ACara%20Aktivasi:%20Buka%20aplikasi%20dan%20masukkan%20kode%20ini\', \'_blank\')" class="btn-whatsapp-admin">',
                '            <i class="bi bi-whatsapp"></i> Kirim via WhatsApp',
                '        </button>',
                '        <button id="testActivationBtn" class="btn-admin-secondary">',
                '            <i class="bi bi-check-lg"></i> Test Aktivasi',
                '        </button>',
                '    </div>',
                '</div>'
            ].join('');
            
            // Ganti form dengan hasil
            document.querySelector('.admin-form').innerHTML = resultHTML;

            // Tambahkan event listener untuk tombol test
            document.getElementById('testActivationBtn').addEventListener('click', function() {
                // Simulasikan aktivasi
                var testResult = self.activateLicense(licenseCode);
                if (testResult.success) {
                    self.showToast('Test BERHASIL! Kode ' + licenseCode + ' valid untuk paket ' + self.licensePackages[packageType].name, 'success');
                } else {
                    self.showToast('Test GAGAL: ' + testResult.message, 'error');
                }
            });
            
            // Refresh license list setelah 2 detik
            setTimeout(function() {
                self.showAdminPanel('admin123'); // Refresh panel
            }, 5000);
        });
        
        // Event listener untuk export
        document.getElementById('exportLicensesBtn').addEventListener('click', function() {
            self.exportLicensesToCSV();
        });
        
        // Event listener untuk clear
        document.getElementById('clearLicensesBtn').addEventListener('click', function() {
            if (confirm('Hapus semua data lisensi yang telah digenerate?')) {
                localStorage.removeItem('generated_licenses');
                self.showToast('Data lisensi berhasil dihapus', 'success');
                setTimeout(function() {
                    self.showAdminPanel('admin123'); // Refresh panel
                }, 1000);
            }
        });
        
        // Event listener untuk close
        document.getElementById('closeAdminPanelBtn').addEventListener('click', function() {
            self.switchPopup(self.showActivationPopup);
        });
        
        // Adjust height setelah render
        setTimeout(function() {
            self.adjustPopupHeight();
        }, 100);
    };

    OfflineLicenseSystem.prototype.switchPopup = function(nextPopupFn) {
        this.removeExistingPopup();
        var self = this;
        setTimeout(function() {
            nextPopupFn.call(self);
        }, 50);
    };

    OfflineLicenseSystem.prototype.generateLicenseCode = function(packageType, deviceId, customerName) {
        // Generate random code
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var result = '';
        for (var i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        var licenseCode = 'RH-MTV-' + result;
        
        // Tentukan expiry days
        var expiryDays = 365;
        if (packageType === 'vip') {
            expiryDays = 9999;
        } else if (packageType === 'trial') {
            expiryDays = 2;
        }
        
        // Tambahkan ke validLicenseKeys
        this.validLicenseKeys[licenseCode] = {
            package: packageType,
            expiryDays: expiryDays,
            created: new Date().toISOString().split('T')[0]
        };
        
        // Simpan ke localStorage
        this.saveValidLicenseKeys();
        
        // Data untuk generated_licenses
        var licenseData = {
            code: licenseCode,
            package: packageType,
            expiryDays: expiryDays,
            created: new Date().toISOString().split('T')[0],
            deviceId: deviceId || 'N/A',
            customerName: customerName || 'Anonymous',
            generatedAt: new Date().toISOString(),
            status: 'pending'
        };
        
        // Simpan ke localStorage (offline)
        var generatedLicenses = JSON.parse(localStorage.getItem('generated_licenses') || '[]');
        generatedLicenses.push(licenseData);
        localStorage.setItem('generated_licenses', JSON.stringify(generatedLicenses));
        
        // Juga tambahkan ke pending sync jika online API tersedia
        if (window.onlineLicenseAPI) {
            window.onlineLicenseAPI.addPendingLicense(licenseData);
        }
        
        return licenseCode;
    };

    OfflineLicenseSystem.prototype.exportLicensesToCSV = function() {
        var generatedLicenses = JSON.parse(localStorage.getItem('generated_licenses') || '[]');
        
        if (generatedLicenses.length === 0) {
            this.showToast('Tidak ada data untuk diexport', 'warning');
            return;
        }
        
        // Buat header CSV
        var csv = 'Kode,Paket,Device ID,Customer Name,Generated At,Status\n';
        
        // Tambahkan data
        generatedLicenses.forEach(function(license) {
            csv += [
                license.code,
                license.package,
                license.deviceId || 'N/A',
                license.customerName || 'Anonymous',
                new Date(license.generatedAt).toLocaleDateString('id-ID'),
                license.status
            ].join(',') + '\n';
        });
        
        // Buat blob dan download
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'license_data_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showToast('Data berhasil diexport ke CSV', 'success');
    };

    // ==================== UPGRADE FUNCTIONS ====================
    OfflineLicenseSystem.prototype.showLicenseDetailsPopup = function() {
        this.removeExistingPopup();
        
        var overlay = this.createOverlay();
        var packageData = this.licensePackages[this.currentLicense.package];
        var expiryDate = new Date(this.currentLicense.expiry);
        var daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 3600 * 24));
        
        // Cek apakah bisa upgrade
        var upgradeInfo = this.checkUpgradeEligibility();
        
        overlay.innerHTML = [
            '<div class="offline-license-popup">',
            '    <div class="popup-header active">',
            '        <div class="header-icon">',
            '            <i class="bi bi-shield-check"></i>',
            '        </div>',
            '        <h2>LISENSI AKTIF</h2>',
            '        <p class="subtitle">' + packageData.name + ' - ' + daysLeft + ' hari tersisa</p>',
            '    </div>',
            '    ',
            '    <div class="popup-body">',
            '        <div class="license-details-card">',
            '            <div class="status-indicator active">',
            '                <div class="status-dot"></div>',
            '                <span>STATUS: AKTIF</span>',
            '            </div>',
            '            ',
            '            <div class="details-grid">',
            '                <div class="detail-item">',
            '                    <label><i class="bi bi-box-seam"></i> Paket</label>',
            '                    <div class="detail-value">' + packageData.name + '</div>',
            '                </div>',
            '                ',
            '                <div class="detail-item">',
            '                    <label><i class="bi bi-calendar-check"></i> Aktif Sejak</label>',
            '                    <div class="detail-value">' + new Date(this.currentLicense.startDate).toLocaleDateString('id-ID') + '</div>',
            '                </div>',
            '                ',
            '                <div class="detail-item">',
            '                    <label><i class="bi bi-calendar-x"></i> Berakhir</label>',
            '                    <div class="detail-value">' + expiryDate.toLocaleDateString('id-ID') + '</div>',
            '                </div>',
            '                ',
            '                <div class="detail-item">',
            '                    <label><i class="bi bi-key"></i> Kode Lisensi</label>',
            '                    <div class="detail-value license-key">' + this.currentLicense.key + '</div>',
            '                </div>',
            '            </div>',
            '            ',
            '            <div class="features-list">',
            '                <h4><i class="bi bi-stars"></i> Fitur yang Aktif:</h4>',
            '                <ul>',
            '                    <li class="' + (packageData.features.maxImages >= 5 ? 'feature-active' : 'feature-inactive') + '">',
            '                        <i class="bi bi-images"></i> Slide Gambar: ' + packageData.features.maxImages + ' gambar</li>',
            '                    <li class="' + (packageData.features.hiddenAudio.length === 0 ? 'feature-active' : 'feature-inactive') + '">',
            '                        <i class="bi bi-music-note-beamed"></i> Audio: ' + (packageData.features.hiddenAudio.length === 0 ? 'Lengkap' : 'Terbatas') + '</li>',
            '                    <li class="' + (packageData.features.ads.enabled ? 'feature-inactive' : 'feature-active') + '">',
            '                        <i class="bi bi-megaphone"></i> Iklan: ' + (packageData.features.ads.enabled ? 'Aktif' : 'Tidak ada') + '</li>',
            '                    <li class="' + (packageData.features.hiddenSettingsButtons.length === 0 ? 'feature-active' : 'feature-inactive') + '">',
            '                        <i class="bi bi-sliders"></i> Pengaturan: ' + (packageData.features.hiddenSettingsButtons.length === 0 ? 'Lengkap' : 'Terbatas') + '</li>',
            '                </ul>',
            '            </div>',
            '            ',
            (upgradeInfo.eligible ? 
                '<div class="upgrade-notification">' +
                '    <h4><i class="bi bi-graph-up-arrow"></i> Rekomendasi Upgrade</h4>' +
                '    <p>' + upgradeInfo.recommendation + '</p>' +
                '    <p>Paket saat ini: <strong>' + packageData.name + '</strong></p>' +
                '    <p>Paket berikutnya: <strong>' + this.licensePackages[upgradeInfo.nextPackage].name + '</strong></p>' +
                '    <button id="showUpgradeOptionsBtn" class="btn-upgrade-notification">' +
                '        <i class="bi bi-arrow-up-right-circle"></i> LIHAT PAKET UPGRADE' +
                '    </button>' +
                '</div>' : ''),
            '            ',
            '            <div class="action-buttons">',
            '                <button id="closePopupBtn" class="btn-close">',
            '                    <i class="bi bi-check-lg"></i> TUTUP',
            '                </button>',
            '                <button id="deactivateLicenseBtn" class="btn-deactivate">',
            '                    <i class="bi bi-key-fill"></i> KELUAR DARI LISENSI',
            '                </button>',
            '            </div>',
            '        </div>',
            '    </div>',
            '    ',
            '    <div class="popup-footer">',
            '        <p class="click-hint">',
            '            <i class="bi bi-mouse"></i> Klik di luar popup untuk menutup',
            '        </p>',
            '    </div>',
            '</div>'
        ].join('');
        
        document.body.appendChild(overlay);
        
        var self = this;
        
        document.getElementById('closePopupBtn').addEventListener('click', function() {
            self.removePopup(overlay);
        });
        
        document.getElementById('deactivateLicenseBtn').addEventListener('click', function() {
            if (self.deactivateLicense()) {
                self.removePopup(overlay);
            }
        });
        
        // Jika ada tombol show upgrade options
        var upgradeBtn = document.getElementById('showUpgradeOptionsBtn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', function() {
                self.removePopup(overlay);
                self.showUpgradeOptions();
            });
        }
        
        // Adjust height setelah render
        setTimeout(function() {
            self.adjustPopupHeight();
        }, 100);
    };

    OfflineLicenseSystem.prototype.checkUpgradeEligibility = function() {
        if (!this.currentLicense) return false;
        
        var currentPackage = this.currentLicense.package;
        var packagesOrder = ['trial', 'basic', 'premium', 'vip'];
        var currentIndex = packagesOrder.indexOf(currentPackage);
        
        // Jika sudah VIP, tidak bisa upgrade
        if (currentIndex >= 3) {
            return {
                eligible: false,
                message: 'Anda sudah memiliki paket tertinggi (VIP)'
            };
        }
        
        // Hitung berapa hari tersisa
        var expiryDate = new Date(this.currentLicense.expiry);
        var now = new Date();
        var daysLeft = Math.ceil((expiryDate - now) / (1000 * 3600 * 24));
        
        // Jika masa aktif kurang dari 30 hari, beri rekomendasi upgrade
        var recommendation = '';
        if (daysLeft < 30) {
            recommendation = 'Masa aktif tersisa ' + daysLeft + ' hari. Disarankan untuk upgrade.';
        }
        
        return {
            eligible: true,
            currentPackage: currentPackage,
            nextPackage: packagesOrder[currentIndex + 1],
            daysLeft: daysLeft,
            recommendation: recommendation
        };
    };

    OfflineLicenseSystem.prototype.deactivateLicense = function() {
        if (confirm('Apakah Anda yakin ingin keluar dari lisensi saat ini? Semua data lisensi akan dihapus.')) {
            // Hapus lisensi dari localStorage
            localStorage.removeItem('adzan_offline_license');
            localStorage.removeItem('adzanAppLicense');
            
            // Reset current license
            this.currentLicense = null;
            
            // Hentikan iklan jika berjalan
            if (this.adsTimer) {
                clearInterval(this.adsTimer);
                this.adsTimer = null;
            }
            
            // Tampilkan toast
            this.showToast('Lisensi berhasil dihapus. Silahkan aktivasi lisensi baru.', 'info');
            
            // Tampilkan popup aktivasi setelah 1 detik
            var self = this;
            setTimeout(function() {
                self.showActivationPopup();
            }, 1000);
            
            return true;
        }
        return false;
    };

    // ==================== UI UPDATE FUNCTIONS ====================
    OfflineLicenseSystem.prototype.updateLicenseUI = function() {
        if (!this.currentLicense) return;
        
        var packageData = this.licensePackages[this.currentLicense.package];
        var endDate = new Date(this.currentLicense.expiry);
        var daysLeft = Math.ceil((endDate - new Date()) / (1000 * 3600 * 24));
        
        var packageElement = document.getElementById('licensePackage');
        var statusElement = document.getElementById('licenseStatusText');
        var expiryElement = document.getElementById('licenseExpiryDate');
        var daysLeftElement = document.getElementById('licenseDaysLeft');
        
        if (packageElement) {
            packageElement.textContent = packageData.name;
        }
        
        if (statusElement) {
            if (daysLeft > 7) {
                statusElement.className = 'badge bg-success';
                statusElement.textContent = 'Aktif';
            } else if (daysLeft > 0) {
                statusElement.className = 'badge bg-warning';
                statusElement.textContent = 'Hampir Habis';
            } else {
                statusElement.className = 'badge bg-danger';
                statusElement.textContent = 'Kadaluarsa';
            }
        }
        
        if (expiryElement) {
            expiryElement.textContent = endDate.toLocaleDateString('id-ID');
        }
        
        if (daysLeftElement) {
            daysLeftElement.textContent = daysLeft > 0 ? daysLeft : 0;
        }
    };

    OfflineLicenseSystem.prototype.showBriefLicenseInfo = function() {
        if (!this.currentLicense) return;
        
        var packageData = this.licensePackages[this.currentLicense.package];
        var expiryDate = new Date(this.currentLicense.expiry);
        var daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 3600 * 24));
        
        // Hapus badge lama jika ada
        var oldBadge = document.getElementById('licenseInfoBadge');
        if (oldBadge && oldBadge.parentNode) {
            oldBadge.parentNode.removeChild(oldBadge);
        }
        
        // Buat notification kecil di pojok kanan bawah
        var infoBadge = document.createElement('div');
        infoBadge.id = 'licenseInfoBadge';
        infoBadge.style.cssText = [
            'position: fixed;',
            'bottom: 0px;',
            'right: 0px;',
            'background: #005a31;',
            'color: white;',
            'padding: 8px 15px;',
            'z-index: 9998;',
            'font-size: 12px;',
            'cursor: pointer;',
            'display: flex;',
            'align-items: center;',
        ].join('');
        
        // Tampilkan icon berbeda berdasarkan paket
        var iconClass = 'bi-shield-check';
        if (this.currentLicense.package === 'vip') iconClass = 'bi-gem';
        else if (this.currentLicense.package === 'premium') iconClass = 'bi-star-fill';
        else if (this.currentLicense.package === 'basic') iconClass = 'bi-shield';
        else if (this.currentLicense.package === 'trial') iconClass = 'bi-clock';
        else if (this.currentLicense.package === 'demo') iconClass = 'bi-play-circle';
        
        infoBadge.innerHTML = [
            '<i class="bi ' + iconClass + '" style="font-size: 14px;"></i>',
            '<span>' + packageData.name + ' - ' + daysLeft + ' hari</span>'
        ].join('');
        
        document.body.appendChild(infoBadge);
        
        // Klik untuk lihat detail
        var self = this;
        infoBadge.addEventListener('click', function() {
            self.showLicenseDetailsPopup();
        });
        
        // Hover effect
        infoBadge.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 5px 15px rgba(0,0,0,0.4)';
        });
        
        infoBadge.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 3px 10px rgba(0,0,0,0.3)';
        });
    };

    OfflineLicenseSystem.prototype.updateDemoUI = function() {
        // Update badge demo
        var oldBadge = document.getElementById('licenseInfoBadge');
        if (oldBadge && oldBadge.parentNode) {
            oldBadge.parentNode.removeChild(oldBadge);
        }
        
        // Buat badge demo khusus
        var demoBadge = document.createElement('div');
        demoBadge.id = 'licenseInfoBadge';
        demoBadge.style.cssText = [
            'position: fixed;',
            'bottom: 0px;',
            'right: 0px;',
            'background: #333;',
            'color: white;',
            'padding: 8px 15px;',
            'border-radius: 20px 0px 0px 20px;',
            'z-index: 9998;',
            'font-size: 12px;',
            'cursor: pointer;',
            'display: flex;',
            'align-items: center;',
            'gap: 8px;',
        ].join('');
        
        demoBadge.innerHTML = [
            '<i class="bi bi-play-circle" style="font-size: 14px;"></i>',
            '<span><b>DEMO</b></span>'
        ].join('');
        
        document.body.appendChild(demoBadge);
        
        var self = this;
        demoBadge.addEventListener('click', function() {
            self.showDemoInfoPopup();
        });
    };

    // ==================== ADS MANAGEMENT ====================
    OfflineLicenseSystem.prototype.setupAds = function() {
        if (!this.currentLicense) return;
        
        var packageData = this.licensePackages[this.currentLicense.package];
        if (!packageData.features.ads.enabled) return;
        
        var adsConfig = packageData.features.ads;
        var self = this;
        
        this.adsTimer = setInterval(function() {
            self.showAd(adsConfig);
        }, adsConfig.interval * 60 * 1000);
        
        setTimeout(function() {
            self.showAd(adsConfig);
        }, 10000);
    };

    OfflineLicenseSystem.prototype.showAd = function(adsConfig) {
        var blackOverlay = document.getElementById('blackOverlay');
        var screenBlack = document.getElementById('screenblack');
        
        if ((blackOverlay && blackOverlay.style.display === 'block') || 
            (screenBlack && screenBlack.style.display === 'block')) {
            
            if (adsConfig.overlayBehavior === 'behind') {
                console.log('Iklan berjalan di belakang overlay');
                return;
            }
        }
        
        if (this.isShowingAds) return;
        
        this.isShowingAds = true;
        
        var randomAd = this.adImages[Math.floor(Math.random() * this.adImages.length)];
        
        var adOverlay = document.createElement('div');
        adOverlay.id = 'adOverlay';
        adOverlay.style.position = 'fixed';
        adOverlay.style.top = '0';
        adOverlay.style.left = '0';
        adOverlay.style.width = '100%';
        adOverlay.style.height = '100%';
        adOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        adOverlay.style.zIndex = '99990';
        adOverlay.style.display = 'flex';
        adOverlay.style.alignItems = 'center';
        adOverlay.style.justifyContent = 'center';
        adOverlay.style.flexDirection = 'column';
        
        adOverlay.innerHTML = [
            '<div style="max-width: 90%; max-height: 90%;">',
            '    <img src="' + randomAd + '" alt="Iklan" style="width: 100%; height: auto; border-radius: 10px;">',
            '</div>',
            '<div id="adCountdown" style="color: white; font-size: 24px; margin-top: 20px; font-weight: bold;">',
            '    ' + adsConfig.duration,
            '</div>'
        ].join('');
        
        document.body.appendChild(adOverlay);
        
        var countdown = adsConfig.duration;
        var countdownElement = document.getElementById('adCountdown');
        var self = this;
        
        var countdownInterval = setInterval(function() {
            countdown--;
            if (countdownElement) {
                countdownElement.textContent = countdown;
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                self.removeAd(adOverlay);
            }
        }, 1000);
        
        adOverlay.addEventListener('click', function() {
            clearInterval(countdownInterval);
            self.removeAd(adOverlay);
        });
    };

    OfflineLicenseSystem.prototype.removeAd = function(adOverlay) {
        if (adOverlay && adOverlay.parentNode) {
            adOverlay.parentNode.removeChild(adOverlay);
        }
        this.isShowingAds = false;
    };

    // ==================== STYLING ====================
    OfflineLicenseSystem.prototype.addStyles = function() {
        if (document.getElementById('offline-license-styles')) return;
        
        var style = document.createElement('style');
        style.id = 'offline-license-styles';
        
        var css = `
            /* ==================== BASE ANIMATIONS ==================== */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { 
                    transform: translateY(50px) scale(0.95); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0) scale(1); 
                    opacity: 1; 
                }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            /* ==================== OVERLAY ==================== */
            #offlineLicenseOverlay {
                z-index: 99999 !important;
                overflow-y: auto !important;
                align-items: flex-start !important;
                padding: 20px !important;
                background: rgba(0, 0, 0, 0.92) !important;
            }
            
            /* ==================== MAIN POPUP ==================== */
            .offline-license-popup {
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
                color: #333333 !important;
                border-radius: 20px;
                width: 100%;
                max-width: 800px;
                overflow: hidden;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
                border: 2px solid #005a31;
                animation: slideUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                margin: 20px auto !important;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            
            /* Admin dan Upgrade popup lebih lebar */
            .offline-license-popup.admin,
            .offline-license-popup.upgrade {
                max-width: 900px !important;
            }
            
            /* Expired popup */
            .offline-license-popup.expired {
                border-color: #dc3545;
            }
            
            /* ==================== POPUP HEADER ==================== */
            .popup-header {
                padding: 30px;
                text-align: center;
                background: linear-gradient(135deg, #005a31 0%, #00816d 100%) !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                color: white !important;
                flex-shrink: 0;
            }
            
            .popup-header.active {
                background: linear-gradient(135deg, #00816d 0%, #005a31 100%) !important;
            }
            
            .popup-header.expired {
                background: linear-gradient(135deg, #8b0000 0%, #dc3545 100%) !important;
            }
            
            .header-icon {
                font-size: 60px;
                color: white;
                margin-bottom: 15px;
                display: block;
            }
            
            .popup-header h2 {
                margin: 0 0 10px 0;
                font-size: 28px;
                font-weight: 800;
                color: white !important;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }
            
            .subtitle {
                margin: 0;
                color: rgba(255, 255, 255, 0.9) !important;
                font-size: 16px;
            }
            
            /* ==================== POPUP BODY (SCROLLABLE) ==================== */
            .popup-body {
                padding: 30px;
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1;
                background: #ffffff !important;
                color: #333333 !important;
                max-height: 60vh;
            }
            
            /* Untuk admin panel yang lebih panjang */
            .offline-license-popup.admin .popup-body {
                max-height: 65vh !important;
            }
            
            /* Custom scrollbar */
            .popup-body::-webkit-scrollbar {
                width: 8px;
            }
            
            .popup-body::-webkit-scrollbar-track {
                background: rgba(0, 90, 49, 0.1);
                border-radius: 4px;
            }
            
            .popup-body::-webkit-scrollbar-thumb {
                background: #005a31;
                border-radius: 4px;
            }
            
            .popup-body::-webkit-scrollbar-thumb:hover {
                background: #00816d;
            }
            
            /* ==================== CARDS ==================== */
            .activation-card,
            .license-details-card,
            .expired-warning-card,
            .admin-panel,
            .upgrade-container {
                background: rgba(255, 255, 255, 0.98) !important;
                border-radius: 15px;
                padding: 25px;
                border: 1px solid rgba(0, 90, 49, 0.2);
                color: #333333 !important;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
            }
            
            /* ==================== STATUS INDICATOR ==================== */
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 10px 20px;
                border-radius: 50px;
                background: rgba(0, 0, 0, 0.05);
                margin-bottom: 25px;
                font-weight: bold;
                font-size: 14px;
                color: #333333 !important;
            }
            
            .status-indicator.inactive {
                background: rgba(220, 53, 69, 0.1);
                border: 1px solid rgba(220, 53, 69, 0.3);
                color: #dc3545 !important;
            }
            
            .status-indicator.active {
                background: rgba(40, 167, 69, 0.1);
                border: 1px solid rgba(40, 167, 69, 0.3);
                color: #28a745 !important;
            }
            
            .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: currentColor;
                animation: pulse 2s infinite;
            }
            
            /* ==================== LICENSE INPUT ==================== */
            .license-input-section {
                margin-bottom: 30px;
            }
            
            .input-group {
                margin-bottom: 25px;
            }
            
            .input-label {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
                color: #005a31 !important;
                font-weight: 600;
                font-size: 16px;
            }
            
            .license-input {
                width: 100%;
                padding: 18px 20px;
                font-size: 20px;
                font-weight: bold;
                letter-spacing: 1px;
                background: #ffffff !important;
                border: 2px solid #005a31;
                border-radius: 10px;
                color: #333333 !important;
                text-align: center;
                text-transform: uppercase;
                font-family: 'Courier New', monospace;
                transition: all 0.3s;
                box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            
            .license-input:focus {
                outline: none;
                border-color: #005a31;
                box-shadow: 0 0 0 4px rgba(0, 90, 49, 0.3), inset 0 2px 5px rgba(0, 0, 0, 0.1);
                background: #ffffff !important;
            }
            
            .input-hint {
                margin-top: 8px;
                color: #666666 !important;
                font-size: 13px;
                text-align: center;
            }
            
            /* ==================== PACKAGE PREVIEW ==================== */
            .package-preview {
                background: rgba(0, 90, 49, 0.05) !important;
                border-radius: 10px;
                padding: 20px;
                min-height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333333 !important;
                border: 1px dashed rgba(0, 90, 49, 0.3);
            }
            
            .preview-placeholder {
                text-align: center;
                color: #666666 !important;
            }
            
            .preview-placeholder i {
                font-size: 40px;
                margin-bottom: 10px;
                display: block;
                color: #999999;
            }
            
            .package-detected {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 15px;
                background: rgba(0, 90, 49, 0.1) !important;
                border-radius: 10px;
                border: 1px solid rgba(0, 90, 49, 0.3);
                animation: slideUp 0.3s ease;
                color: #333333 !important;
                width: 100%;
            }
            
            .package-detected.trial {
                background: rgba(255, 193, 7, 0.1) !important;
                border-color: rgba(255, 193, 7, 0.3);
            }
            
            .package-detected.basic {
                background: rgba(13, 110, 253, 0.1) !important;
                border-color: rgba(13, 110, 253, 0.3);
            }
            
            .package-detected.premium {
                background: rgba(111, 66, 193, 0.1) !important;
                border-color: rgba(111, 66, 193, 0.3);
            }
            
            .package-detected.vip {
                background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(220, 53, 69, 0.1)) !important;
                border-color: rgba(255, 193, 7, 0.3);
            }
            
            .package-icon {
                font-size: 40px;
                color: #005a31;
            }
            
            .package-detected.trial .package-icon { color: #fd7e14; }
            .package-detected.basic .package-icon { color: #0d6efd; }
            .package-detected.premium .package-icon { color: #6f42c1; }
            .package-detected.vip .package-icon { color: #ffc107; }
            
            .package-info h4 {
                margin: 0 0 5px 0;
                font-size: 22px;
                color: #333333 !important;
            }
            
            .package-info p {
                margin: 0 0 10px 0;
                color: #666666 !important;
            }
            
            .package-features {
                display: flex;
                gap: 15px;
                font-size: 14px;
                flex-wrap: wrap;
            }
            
            .package-features span {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 4px 10px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 5px;
                color: #333333;
            }
            
            .package-invalid {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 15px;
                background: rgba(220, 53, 69, 0.1) !important;
                border-radius: 10px;
                border: 1px solid rgba(220, 53, 69, 0.3);
                animation: slideUp 0.3s ease;
                color: #333333 !important;
                width: 100%;
            }
            
            .package-invalid .package-icon {
                color: #dc3545;
            }

            .package-invalid.active {
                background: rgba(40, 167, 69, 0.1) !important;
                border-color: rgba(40, 167, 69, 0.3);
            }

            .package-invalid.active .package-icon {
                color: #28a745 !important;
            }

            .package-invalid.expired {
                background: rgba(220, 53, 69, 0.1) !important;
                border-color: rgba(220, 53, 69, 0.3);
            }

            .package-invalid.expired .package-icon {
                color: #dc3545 !important;
            }

            .package-invalid.not-found {
                background: rgba(255, 193, 7, 0.1) !important;
                border-color: rgba(255, 193, 7, 0.3);
            }

            .package-invalid.not-found .package-icon {
                color: #ffc107 !important;
            }

            .package-invalid .package-info h4 {
                margin: 0 0 8px 0;
                font-size: 18px;
                color: #333 !important;
            }

            .package-invalid .package-info p {
                margin: 0;
                color: #666 !important;
                font-size: 14px;
                line-height: 1.4;
            }

            .package-loading {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 15px;
                background: rgba(0, 90, 49, 0.05) !important;
                border-radius: 10px;
                border: 1px solid rgba(0, 90, 49, 0.2);
                animation: pulse 1.5s infinite;
                color: #333333 !important;
                width: 100%;
            }

            .package-loading .package-icon {
                font-size: 40px;
                color: #005a31;
            }

            .package-loading .package-icon i {
                animation: spin 2s linear infinite;
            }

            .package-loading .package-info h4 {
                margin: 0 0 5px 0;
                font-size: 18px;
                color: #005a31 !important;
            }

            .package-loading .package-info p {
                margin: 0;
                color: #666666 !important;
                font-size: 14px;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* ==================== BUTTONS ==================== */
            .action-section {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin: 25px 0;
            }
            
            /* Primary buttons - Green */
            .btn-activate-large,
            .btn-contact,
            .btn-whatsapp,
            .btn-upgrade-now,
            .btn-admin-generate,
            .btn-confirm-upgrade,
            .btn-whatsapp-admin {
                background: linear-gradient(135deg, #005a31 0%, #00816d 100%) !important;
                color: white !important;
                border: none;
                padding: 18px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                text-decoration: none;
            }
            
            .btn-activate-large:hover,
            .btn-contact:hover,
            .btn-whatsapp:hover,
            .btn-upgrade-now:hover,
            .btn-admin-generate:hover,
            .btn-confirm-upgrade:hover,
            .btn-whatsapp-admin:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 20px rgba(0, 90, 49, 0.4);
            }
            
            .btn-activate-large:active,
            .btn-contact:active,
            .btn-whatsapp:active,
            .btn-upgrade-now:active,
            .btn-admin-generate:active,
            .btn-confirm-upgrade:active,
            .btn-whatsapp-admin:active {
                transform: translateY(-1px);
            }
            
            .btn-success-large {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
            }
            
            /* Secondary buttons - Light */
            .btn-demo-mode,
            .btn-copy,
            .btn-admin-secondary,
            .btn-cancel-upgrade,
            .btn-close,
            .btn-admin-close,
            .btn-copy-admin {
                background: rgba(255, 255, 255, 0.9) !important;
                color: #333333 !important;
                border: 2px solid #005a31;
                padding: 16px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
            }
            
            .btn-demo-mode:hover,
            .btn-copy:hover,
            .btn-admin-secondary:hover,
            .btn-cancel-upgrade:hover,
            .btn-close:hover,
            .btn-admin-close:hover,
            .btn-copy-admin:hover {
                background: rgba(0, 90, 49, 0.1) !important;
                transform: translateY(-2px);
            }
            
            /* Danger buttons - Red */
            .btn-deactivate,
            .btn-admin-danger {
                background: linear-gradient(135deg, #dc3545 0%, #b02a37 100%) !important;
                color: white !important;
                border: none;
                padding: 18px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
            }
            
            .btn-deactivate:hover,
            .btn-admin-danger:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 20px rgba(220, 53, 69, 0.4);
            }
            
            /* Special buttons */
            .btn-admin-panel {
                background: linear-gradient(135deg, #6f42c1 0%, #6610f2 100%) !important;
                color: white !important;
                border: none;
                padding: 18px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
            }
            
            .btn-admin-panel:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 20px rgba(111, 66, 193, 0.4);
            }
            
            .btn-upgrade-notification {
                background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%) !important;
                color: #000 !important;
                border: none;
                padding: 15px;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                margin-top: 15px;
            }
            
            .btn-upgrade-notification:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(255, 193, 7, 0.4);
            }
            
            .btn-demo-again {
                background: rgba(13, 110, 253, 0.1) !important;
                color: #0d6efd !important;
                border: 2px solid rgba(13, 110, 253, 0.3);
                padding: 18px;
                border-radius: 12px;
                font-weight: bold;
                font-size: 14px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                transition: all 0.3s;
            }
            
            .btn-demo-again:hover {
                background: rgba(13, 110, 253, 0.2) !important;
                transform: translateY(-2px);
            }
            
            .btn-copy-id {
                background: rgba(255, 255, 255, 0.9) !important;
                color: #333333 !important;
                border: 2px solid #005a31;
                padding: 18px;
                border-radius: 12px;
                font-weight: bold;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                transition: all 0.3s;
            }
            
            .btn-copy-id:hover {
                background: rgba(0, 90, 49, 0.1) !important;
                transform: translateY(-2px);
            }
            
            .btn-copy-small {
                background: rgba(255, 255, 255, 0.9) !important;
                color: #333333 !important;
                border: 1px solid #005a31;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                margin-left: 10px;
                transition: all 0.3s;
            }
            
            .btn-copy-small:hover {
                background: rgba(0, 90, 49, 0.1) !important;
            }
            
            /* ==================== DIVIDER ==================== */
            .divider {
                display: flex;
                align-items: center;
                text-align: center;
                margin: 10px 0;
                color: #666666 !important;
            }
            
            .divider::before,
            .divider::after {
                content: '';
                flex: 1;
                border-bottom: 1px solid rgba(0, 90, 49, 0.2);
            }
            
            .divider span {
                padding: 0 15px;
            }
            
            /* ==================== FOCUSED INPUT MODE ==================== */
            .focused-input-mode {
                max-width: 500px !important;
                min-height: auto !important;
            }

            .focused-input-mode .popup-header,
            .focused-input-mode .popup-body .action-section,
            .focused-input-mode .popup-body .info-section,
            .focused-input-mode .popup-footer .contact-details {
                display: none !important;
            }

            /* Jangan sembunyikan package preview */
            .focused-input-mode .package-preview {
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                margin-top: 20px !important;
                animation: slideUp 0.3s ease !important;
            }

            .focused-input-mode .popup-body {
                padding: 30px !important;
                max-height: none !important;
                overflow: visible !important;
            }

            .focused-input-mode .activation-card {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }

            .focused-input-mode .license-input-section {
                margin-bottom: 0 !important;
            }

            .focused-input-mode .input-group {
                position: relative;
                margin-bottom: 15px !important;
            }

            .focused-input-mode .license-input {
                font-size: 24px !important;
                padding: 20px 60px 20px 20px !important;
                border-radius: 12px !important;
                border-width: 3px !important;
                letter-spacing: 2px !important;
            }

            .focused-input-mode .input-hint {
                font-size: 14px !important;
                margin-top: 10px !important;
                text-align: center !important;
            }

            .focused-input-mode .package-preview {
                min-height: 80px !important;
                margin-top: 20px !important;
                background: rgba(255, 255, 255, 0.95) !important;
                border: 2px solid rgba(0, 90, 49, 0.2) !important;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1) !important;
            }

            /* Tombol close di pojok kanan atas */
            .close-focused-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.1) !important;
                border: none;
                color: #333 !important;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
                z-index: 1000;
            }

            .close-focused-btn:hover {
                background: rgba(0, 90, 49, 0.2) !important;
                transform: rotate(90deg);
            }

            /* Tombol status validasi di dalam input */
            .input-validation-icons {
                position: absolute;
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                gap: 10px;
            }

            .validation-icon {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.3s;
                opacity: 0.7;
            }

            .validation-icon:hover {
                opacity: 1;
                transform: scale(1.1);
            }

            .validation-icon.valid {
                background: rgba(40, 167, 69, 0.2) !important;
                color: #28a745 !important;
                border: 2px solid rgba(40, 167, 69, 0.3);
            }

            .validation-icon.invalid {
                background: rgba(220, 53, 69, 0.2) !important;
                color: #dc3545 !important;
                border: 2px solid rgba(220, 53, 69, 0.3);
            }

            .validation-icon.disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }

            .validation-icon.active {
                opacity: 1;
                box-shadow: 0 0 0 4px rgba(0, 90, 49, 0.1);
            }
            
            /* ==================== TOAST NOTIFICATION ==================== */
            .license-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 10px;
                color: white !important;
                font-weight: bold;
                z-index: 100000;
                animation: slideUp 0.3s ease;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 400px;
            }
            
            .toast-success {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
                border-left: 4px solid #155724;
            }
            
            .toast-error {
                background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%) !important;
                border-left: 4px solid #721c24;
            }
            
            .toast-info {
                background: linear-gradient(135deg, #17a2b8 0%, #138496 100%) !important;
                border-left: 4px solid #0c5460;
            }
            
            /* ==================== RESPONSIVE DESIGN ==================== */
            @media (max-width: 992px) {
                .offline-license-popup {
                    max-width: 95% !important;
                }
                
                .popup-header {
                    padding: 25px;
                }
                
                .popup-body {
                    padding: 25px;
                }
            }
            
            @media (max-width: 768px) {
                .offline-license-popup {
                    max-width: 98% !important;
                    margin: 10px auto !important;
                }
                
                .popup-header {
                    padding: 20px;
                }
                
                .popup-header h2 {
                    font-size: 24px;
                }
                
                .header-icon {
                    font-size: 50px;
                }
                
                .popup-body {
                    padding: 20px;
                    max-height: 70vh !important;
                }
                
                .activation-card,
                .license-details-card,
                .expired-warning-card,
                .admin-section,
                .upgrade-container {
                    padding: 20px;
                }
                
                .license-input {
                    font-size: 18px;
                    padding: 15px;
                }
                
                .btn-activate-large,
                .btn-demo-mode,
                .btn-contact,
                .btn-admin-panel,
                .btn-deactivate,
                .btn-whatsapp,
                .btn-copy-id,
                .btn-demo-again {
                    padding: 16px;
                    font-size: 15px;
                }
                
                .admin-table {
                    font-size: 12px;
                }
                
                .admin-table th,
                .admin-table td {
                    padding: 8px 10px;
                }
                
                .action-buttons {
                    flex-direction: column;
                }
            }
            
            @media (max-width: 480px) {
                .offline-license-popup {
                    border-radius: 15px;
                }
                
                .popup-header {
                    padding: 15px;
                }
                
                .popup-header h2 {
                    font-size: 20px;
                }
                
                .subtitle {
                    font-size: 14px;
                }
                
                .header-icon {
                    font-size: 40px;
                }
                
                .popup-body {
                    padding: 15px;
                    max-height: 75vh !important;
                }
                
                .popup-footer {
                    padding: 15px;
                }
                
                .activation-card,
                .license-details-card,
                .expired-warning-card,
                .admin-section,
                .upgrade-container {
                    padding: 15px;
                }
                
                .license-input {
                    font-size: 16px;
                    padding: 12px;
                }
            }
        `;
        
        style.textContent = css;
        document.head.appendChild(style);
    };

    // ==================== GLOBAL FUNCTIONS ====================
    window.copyToClipboard = function(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            var successful = document.execCommand('copy');
            if (successful) {
                if (window.offlineLicense && window.offlineLicense.showToast) {
                    window.offlineLicense.showToast('✓ Berhasil disalin ke clipboard', 'success');
                } else {
                    alert('Berhasil disalin ke clipboard');
                }
            } else {
                if (window.offlineLicense && window.offlineLicense.showToast) {
                    window.offlineLicense.showToast('Gagal menyalin', 'error');
                } else {
                    alert('Gagal menyalin');
                }
            }
        } catch (err) {
            console.error('Copy failed:', err);
            if (window.offlineLicense && window.offlineLicense.showToast) {
                window.offlineLicense.showToast('Gagal menyalin', 'error');
            } else {
                alert('Gagal menyalin');
            }
        }
        
        document.body.removeChild(textArea);
    };

    // ==================== INITIALIZE ====================
    window.offlineLicense = new OfflineLicenseSystem();

    // Tambahkan resize listener untuk adjust height
    window.addEventListener('resize', function() {
        if (window.offlineLicense && typeof window.offlineLicense.adjustPopupHeight === 'function') {
            window.offlineLicense.adjustPopupHeight();
        }
    });

    // Tunggu sampai DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Tunggu sebentar sebelum inisialisasi
            setTimeout(function() {
                if (window.offlineLicense && window.offlineLicense.initialize) {
                    window.offlineLicense.initialize();
                }
            }, 1500);
        });
    } else {
        setTimeout(function() {
            if (window.offlineLicense && window.offlineLicense.initialize) {
                window.offlineLicense.initialize();
            }
        }, 1500);
    }

    // Export untuk penggunaan global
    if (typeof window !== 'undefined') {
        window.OfflineLicenseSystem = OfflineLicenseSystem;
    }

})();
