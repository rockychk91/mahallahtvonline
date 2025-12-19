// File: online-license-api.js - PERBAIKI DENGAN SOLUSI CORS
// API untuk koneksi ke Google Spreadsheet
// ES5 compatible untuk STB - FIXED VERSION

var OnlineLicenseAPI = function() {
    // GANTI DENGAN URL WEB APPS SCRIPT ANDA
    this.SPREADSHEET_URL = 'https://script.google.com/macros/s/AKfycbyBP0_xDqD0oUPnmmQCBbUnlQMWpIGSUTAu79-89R_H8caZcXUhVkDqK669D6FTANIu/exec';
    this.isOnline = false;
    this.syncStatus = 'idle';
    this.pendingLicenses = [];
    this.lastSync = null;
    
    // Apps Script yang sudah di-deploy
    // Pastikan deployment: Execute as "Me", Who has access "Anyone"
};

// ==================== INTERNET DETECTION (FIXED CORS) ====================
OnlineLicenseAPI.prototype.checkInternetConnection = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        // Method 1: Gunakan navigator.onLine (lebih reliable untuk STB)
        if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
            setTimeout(function() {
                self.isOnline = navigator.onLine;
                resolve(navigator.onLine);
            }, 500);
            return;
        }
        
        // Method 2: Coba ping ke server sendiri (Apps Script) - NO CORS ISSUE
        var timeout = setTimeout(function() {
            resolve(false);
        }, 3000);
        
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                clearTimeout(timeout);
                resolve(xhr.status === 200 || xhr.status === 0);
            }
        };
        
        xhr.onerror = function() {
            clearTimeout(timeout);
            resolve(false);
        };
        
        // Gunakan Apps Script URL untuk test connection (no CORS issue)
        xhr.open('GET', self.SPREADSHEET_URL + '?action=ping&t=' + Date.now(), true);
        xhr.send();
    });
};

// ==================== SYNC TO SPREADSHEET (FIXED) ====================
OnlineLicenseAPI.prototype.syncToSpreadsheet = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        // Load pending licenses from localStorage
        var pending = JSON.parse(localStorage.getItem('pending_licenses') || '[]');
        
        if (pending.length === 0) {
            resolve({ success: true, message: 'Tidak ada data pending', count: 0 });
            return;
        }
        
        self.syncStatus = 'syncing';
        
        // Gunakan form submission untuk menghindari CORS
        var formData = new FormData();
        formData.append('action', 'upload');
        formData.append('data', JSON.stringify({
            licenses: pending,
            deviceId: window.offlineLicense ? window.offlineLicense.deviceId : 'unknown',
            timestamp: new Date().toISOString()
        }));
        
        fetch(self.SPREADSHEET_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors' // Mode no-cors untuk menghindari CORS error
        })
        .then(function(response) {
            // Dengan no-cors, kita tidak bisa baca response
            // Tapi kita anggap berhasil jika tidak error
            self.syncStatus = 'idle';
            self.lastSync = new Date();
            
            // Clear pending licenses (asumsi berhasil)
            localStorage.removeItem('pending_licenses');
            
            resolve({
                success: true,
                message: 'Berhasil sync ' + pending.length + ' data ke spreadsheet',
                count: pending.length
            });
        })
        .catch(function(error) {
            self.syncStatus = 'error';
            reject({ 
                success: false, 
                message: 'Gagal sync: ' + (error.message || 'Unknown error'),
                error: error 
            });
        });
    });
};

// ==================== LOAD FROM SPREADSHEET (FIXED) ====================
OnlineLicenseAPI.prototype.loadFromSpreadsheet = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        self.syncStatus = 'loading';
        
        // Gunakan JSONP style untuk menghindari CORS
        var callbackName = 'callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        
        // Script element untuk JSONP
        var script = document.createElement('script');
        script.src = self.SPREADSHEET_URL + '?action=getAll&callback=' + callbackName + '&t=' + Date.now();
        
        // Setup timeout
        var timeout = setTimeout(function() {
            document.head.removeChild(script);
            delete window[callbackName];
            self.syncStatus = 'timeout';
            reject({ success: false, message: 'Timeout loading data' });
        }, 10000);
        
        // Define callback function
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            document.head.removeChild(script);
            delete window[callbackName];
            
            self.syncStatus = 'idle';
            
            if (response && response.success) {
                resolve({
                    success: true,
                    data: response.data || [],
                    count: response.data ? response.data.length : 0
                });
            } else {
                reject({ 
                    success: false, 
                    message: response ? response.message : 'Invalid response' 
                });
            }
        };
        
        // Error handling
        script.onerror = function() {
            clearTimeout(timeout);
            document.head.removeChild(script);
            delete window[callbackName];
            self.syncStatus = 'error';
            reject({ success: false, message: 'Failed to load script' });
        };
        
        // Add to document
        document.head.appendChild(script);
    });
};

// ==================== GENERATE ONLINE LICENSE (FIXED) ====================
OnlineLicenseAPI.prototype.generateOnlineLicense = function(packageType, deviceId, customerName) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        self.syncStatus = 'generating';
        
        // Gunakan JSONP untuk generate
        var callbackName = 'generate_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        
        var script = document.createElement('script');
        var url = self.SPREADSHEET_URL + 
                  '?action=generate' +
                  '&package=' + encodeURIComponent(packageType) +
                  '&deviceId=' + encodeURIComponent(deviceId || 'N/A') +
                  '&customer=' + encodeURIComponent(customerName || 'Anonymous') +
                  '&callback=' + callbackName +
                  '&t=' + Date.now();
        
        script.src = url;
        
        var timeout = setTimeout(function() {
            document.head.removeChild(script);
            delete window[callbackName];
            self.syncStatus = 'timeout';
            reject({ success: false, message: 'Timeout generating license' });
        }, 10000);
        
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            document.head.removeChild(script);
            delete window[callbackName];
            
            self.syncStatus = 'idle';
            
            if (response && response.success) {
                resolve({
                    success: true,
                    licenseCode: response.licenseCode || response.data.code,
                    data: response.data || {}
                });
            } else {
                reject({ 
                    success: false, 
                    message: response ? response.message : 'Generate failed' 
                });
            }
        };
        
        script.onerror = function() {
            clearTimeout(timeout);
            document.head.removeChild(script);
            delete window[callbackName];
            self.syncStatus = 'error';
            reject({ success: false, message: 'Failed to generate license' });
        };
        
        document.head.appendChild(script);
    });
};

// ==================== CHECK LICENSE ONLINE (FIXED) ====================
OnlineLicenseAPI.prototype.checkLicenseOnline = function(licenseKey) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        // Pertama, validasi status lisensi
        self.validateLicenseOnline(licenseKey)
            .then(function(validationResult) {
                console.log('[CHECK LICENSE] Validation result:', validationResult);
                
                if (!validationResult.valid) {
                    // Jika tidak valid, kembalikan error sesuai status
                    resolve({
                        success: false,
                        valid: false,
                        status: validationResult.status,
                        message: validationResult.message,
                        details: validationResult.details || {}
                    });
                } else {
                    // Jika valid, cek detail lisensi
                    var callbackName = 'check_callback_' + Date.now();
                    
                    var script = document.createElement('script');
                    script.src = self.SPREADSHEET_URL + 
                                '?action=getByCode' +
                                '&code=' + encodeURIComponent(licenseKey) +
                                '&callback=' + callbackName +
                                '&t=' + Date.now();
                    
                    window[callbackName] = function(response) {
                        if (script.parentNode) script.parentNode.removeChild(script);
                        delete window[callbackName];
                        
                        if (response && response.success) {
                            resolve({
                                success: true,
                                valid: true,
                                license: response.license,
                                message: 'License valid and ready for activation'
                            });
                        } else {
                            resolve({
                                success: false,
                                valid: false,
                                message: response ? response.message : 'License not found'
                            });
                        }
                    };
                    
                    script.onerror = function() {
                        if (script.parentNode) script.parentNode.removeChild(script);
                        delete window[callbackName];
                        
                        resolve({
                            success: false,
                            valid: false,
                            message: 'Connection error'
                        });
                    };
                    
                    document.head.appendChild(script);
                }
            })
            .catch(function(error) {
                console.error('[CHECK LICENSE] Error:', error);
                resolve({
                    success: false,
                    valid: false,
                    message: 'Validation error: ' + (error.message || 'Unknown error')
                });
            });
    });
};

// ==================== MARK LICENSE AS USED (FIXED) ====================
OnlineLicenseAPI.prototype.markLicenseAsUsed = function(licenseKey, deviceId) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        var callbackName = 'mark_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        
        var script = document.createElement('script');
        script.src = self.SPREADSHEET_URL + 
                    '?action=activate' +
                    '&code=' + encodeURIComponent(licenseKey) +
                    '&deviceId=' + encodeURIComponent(deviceId || '') +
                    '&callback=' + callbackName +
                    '&t=' + Date.now();
        
        var timeout = setTimeout(function() {
            document.head.removeChild(script);
            delete window[callbackName];
            // Tidak reject karena ini hanya logging
            resolve({ success: false, message: 'Timeout marking license' });
        }, 5000);
        
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            document.head.removeChild(script);
            delete window[callbackName];
            
            if (response && response.success) {
                resolve({ success: true, message: 'License marked as used' });
            } else {
                resolve({ success: false, message: response ? response.message : 'Failed to mark license' });
            }
        };
        
        script.onerror = function() {
            clearTimeout(timeout);
            document.head.removeChild(script);
            delete window[callbackName];
            resolve({ success: false, message: 'Connection error' });
        };
        
        document.head.appendChild(script);
    });
};

// ==================== UPDATE VALID LICENSE KEYS (FIXED) ====================
OnlineLicenseAPI.prototype.updateValidLicenseKeys = function() {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        self.loadFromSpreadsheet()
            .then(function(result) {
                if (result.data && result.data.length > 0) {
                    // Update validLicenseKeys
                    var updatedKeys = {};
                    var updatedCount = 0;
                    
                    result.data.forEach(function(license) {
                        if (license.code && (license.status === 'active' || license.status === 'pending')) {
                            updatedKeys[license.code] = {
                                package: license.package || 'basic',
                                expiryDays: license.expiryDays || 365,
                                created: license.created || new Date().toISOString().split('T')[0]
                            };
                            updatedCount++;
                        }
                    });
                    
                    // Update offline license system jika ada
                    if (window.offlineLicense && window.offlineLicense.validLicenseKeys) {
                        // Gabungkan dengan existing keys (jangan overwrite semua)
                        for (var key in updatedKeys) {
                            window.offlineLicense.validLicenseKeys[key] = updatedKeys[key];
                        }
                        
                        // Simpan ke localStorage
                        if (typeof window.offlineLicense.saveValidLicenseKeys === 'function') {
                            window.offlineLicense.saveValidLicenseKeys();
                        }
                    }
                    
                    // Simpan juga ke localStorage langsung
                    try {
                        var currentKeys = JSON.parse(localStorage.getItem('valid_license_keys') || '{}');
                        var mergedKeys = Object.assign({}, currentKeys, updatedKeys);
                        localStorage.setItem('valid_license_keys', JSON.stringify(mergedKeys));
                    } catch (e) {
                        console.log('Error saving valid keys:', e);
                    }
                    
                    resolve({
                        success: true,
                        count: updatedCount,
                        message: 'Updated ' + updatedCount + ' license keys'
                    });
                } else {
                    resolve({ 
                        success: true, 
                        count: 0, 
                        message: 'No new license keys to update' 
                    });
                }
            })
            .catch(function(error) {
                reject(error);
            });
    });
};

// ==================== SIMPLE SYNC (Untuk Tombol Sync) ====================
OnlineLicenseAPI.prototype.simpleSync = function() {
    var self = this;
    
    return new Promise(function(resolve) {
        // 1. Cek koneksi
        self.checkInternetConnection()
            .then(function(isOnline) {
                self.isOnline = isOnline;
                
                if (!isOnline) {
                    resolve({ success: false, message: 'Tidak terhubung ke internet' });
                    return;
                }
                
                // 2. Sync pending licenses
                var pendingCount = self.getPendingCount();
                if (pendingCount > 0) {
                    self.syncToSpreadsheet()
                        .then(function(syncResult) {
                            // 3. Update keys dari spreadsheet
                            self.updateValidLicenseKeys()
                                .then(function(updateResult) {
                                    resolve({
                                        success: true,
                                        message: 'Sync berhasil! ' + 
                                                syncResult.message + ' ' + 
                                                updateResult.message,
                                        syncCount: syncResult.count,
                                        updateCount: updateResult.count
                                    });
                                })
                                .catch(function() {
                                    // Tetap sukses jika sync berhasil meski update gagal
                                    resolve({
                                        success: true,
                                        message: syncResult.message + ' (update keys gagal)',
                                        syncCount: syncResult.count,
                                        updateCount: 0
                                    });
                                });
                        })
                        .catch(function(syncError) {
                            resolve({
                                success: false,
                                message: 'Gagal sync: ' + syncError.message
                            });
                        });
                } else {
                    // Tidak ada pending, hanya update keys
                    self.updateValidLicenseKeys()
                        .then(function(updateResult) {
                            resolve({
                                success: true,
                                message: updateResult.message,
                                syncCount: 0,
                                updateCount: updateResult.count
                            });
                        })
                        .catch(function(updateError) {
                            resolve({
                                success: false,
                                message: 'Gagal update keys: ' + updateError.message
                            });
                        });
                }
            })
            .catch(function() {
                resolve({ success: false, message: 'Gagal cek koneksi' });
            });
    });
};

// ==================== AUTO SYNC (FIXED) ====================
OnlineLicenseAPI.prototype.autoSync = function() {
    var self = this;
    
    self.checkInternetConnection()
        .then(function(isOnline) {
            self.isOnline = isOnline;
            
            if (isOnline) {
                console.log('Online - Running auto-sync...');
                
                // Update valid license keys dari spreadsheet
                self.updateValidLicenseKeys()
                    .then(function(result) {
                        console.log('Auto-sync successful:', result.message);
                    })
                    .catch(function(error) {
                        console.log('Auto-sync update keys error:', error.message || 'Unknown error');
                    });
                
                // Sync pending licenses jika ada
                var pending = JSON.parse(localStorage.getItem('pending_licenses') || '[]');
                if (pending.length > 0) {
                    self.syncToSpreadsheet()
                        .then(function(result) {
                            console.log('Auto-sync pending successful:', result.message);
                        })
                        .catch(function(error) {
                            console.log('Auto-sync pending error:', error.message || 'Unknown error');
                        });
                }
            } else {
                console.log('Offline - Skipping auto-sync');
            }
        })
        .catch(function() {
            self.isOnline = false;
            console.log('Connection check failed - Assuming offline');
        });
};

// ==================== UTILITY FUNCTIONS ====================
OnlineLicenseAPI.prototype.addPendingLicense = function(licenseData) {
    try {
        var pending = JSON.parse(localStorage.getItem('pending_licenses') || '[]');
        
        // Pastikan tidak ada duplikat
        var exists = pending.some(function(item) {
            return item.code === licenseData.code;
        });
        
        if (!exists) {
            pending.push({
                code: licenseData.code,
                package: licenseData.package,
                customerName: licenseData.customerName || 'Anonymous',
                deviceId: licenseData.deviceId || 'N/A',
                created: licenseData.created || new Date().toISOString().split('T')[0],
                expiryDays: licenseData.expiryDays || 365,
                status: 'pending',
                localTimestamp: new Date().toISOString(),
                syncStatus: 'pending'
            });
            
            localStorage.setItem('pending_licenses', JSON.stringify(pending));
        }
        
        return pending.length;
    } catch (e) {
        console.log('Error adding pending license:', e);
        return 0;
    }
};

OnlineLicenseAPI.prototype.getPendingCount = function() {
    try {
        var pending = JSON.parse(localStorage.getItem('pending_licenses') || '[]');
        return pending.length;
    } catch (e) {
        return 0;
    }
};

OnlineLicenseAPI.prototype.getSyncStatus = function() {
    return {
        isOnline: this.isOnline,
        syncStatus: this.syncStatus,
        pendingCount: this.getPendingCount(),
        lastSync: this.lastSync
    };
};

OnlineLicenseAPI.prototype.showStatus = function(message, type) {
    // Simple toast notification
    var toast = document.createElement('div');
    toast.style.cssText = [
        'position: fixed;',
        'top: 20px;',
        'right: 20px;',
        'padding: 15px 25px;',
        'background: ' + (type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8') + ';',
        'color: white;',
        'border-radius: 8px;',
        'z-index: 100000;',
        'box-shadow: 0 5px 15px rgba(0,0,0,0.3);',
        'font-weight: bold;'
    ].join('');
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(function() {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
};

// ==================== ACTIVATE LICENSE (UNTUK UPDATE STATUS PENDING → ACTIVE) ====================
OnlineLicenseAPI.prototype.activateLicense = function(licenseKey, deviceId, packageType, customerName) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        self.syncStatus = 'activating';
        
        var callbackName = 'activate_callback_' + Date.now();
        
        var script = document.createElement('script');
        var url = self.SPREADSHEET_URL + 
                  '?action=activate' +
                  '&code=' + encodeURIComponent(licenseKey) +
                  '&deviceId=' + encodeURIComponent(deviceId || '') +
                  '&package=' + encodeURIComponent(packageType || '') +
                  '&customer=' + encodeURIComponent(customerName || '') +
                  '&callback=' + callbackName +
                  '&t=' + Date.now();
        
        script.src = url;
        
        // Timeout handling
        var timeout = setTimeout(function() {
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
            self.syncStatus = 'timeout';
            resolve({ 
                success: false, 
                message: 'Timeout activating license' 
            });
        }, 10000);
        
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            
            // Cleanup
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
            
            self.syncStatus = 'idle';
            
            console.log('[ONLINE ACTIVATE] Response:', response);
            
            if (response && response.success) {
                resolve({
                    success: true,
                    message: response.message || 'License activated successfully',
                    code: response.code,
                    deviceId: response.deviceId,
                    status: response.status,
                    action: response.action
                });
            } else {
                resolve({ 
                    success: false, 
                    message: response ? response.message : 'Activation failed' 
                });
            }
        };
        
        script.onerror = function() {
            clearTimeout(timeout);
            
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
            
            self.syncStatus = 'error';
            resolve({ 
                success: false, 
                message: 'Connection error during activation' 
            });
        };
        
        document.head.appendChild(script);
    });
};

// ==================== FUNGSI BARU: DEVICE HEARTBEAT ====================
OnlineLicenseAPI.prototype.sendHeartbeat = function(licenseKey, deviceId) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        var callbackName = 'heartbeat_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // Buat fungsi callback terlebih dahulu SEBELUM membuat script
        window[callbackName] = function(response) {
            // Cleanup: hapus fungsi dari window object
            delete window[callbackName];
            
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            clearTimeout(timeout);
            
            console.log('[HEARTBEAT] Response received:', response ? 'Success' : 'No response');
            
            if (response && response.success) {
                resolve(response);
            } else {
                resolve({ 
                    success: false, 
                    message: response ? response.message : 'No response from server' 
                });
            }
        };
        
        var script = document.createElement('script');
        var localTime = self.getLocalTime ? self.getLocalTime() : new Date().toISOString();
        
        // Encode URL dengan benar
        var url = self.SPREADSHEET_URL + 
                  '?action=deviceHeartbeat' +
                  '&code=' + encodeURIComponent(licenseKey) +
                  '&deviceId=' + encodeURIComponent(deviceId) +
                  '&clientTime=' + encodeURIComponent(localTime) +
                  '&callback=' + encodeURIComponent(callbackName) +
                  '&t=' + Date.now();
        
        script.src = url;
        
        // Handler untuk error loading script
        script.onerror = function() {
            console.error('[HEARTBEAT] Script load error');
            
            // Cleanup
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            clearTimeout(timeout);
            
            resolve({ 
                success: false, 
                message: 'Failed to load heartbeat script' 
            });
        };
        
        // Timeout setelah 8 detik (lebih lama dari 5 detik)
        var timeout = setTimeout(function() {
            console.warn('[HEARTBEAT] Timeout after 8 seconds');
            
            // Cleanup
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            resolve({ 
                success: false, 
                message: 'Heartbeat timeout (8s)' 
            });
        }, 8000);
        
        // Tambahkan script ke document
        document.head.appendChild(script);
        
        console.log('[HEARTBEAT] Request sent to:', url);
    });
};

// ==================== FUNGSI BARU: START HEARTBEAT INTERVAL ====================
OnlineLicenseAPI.prototype.startHeartbeat = function(licenseKey, deviceId) {
    var self = this;
    
    console.log('[HEARTBEAT INTERVAL] Starting for device:', deviceId, 'license:', licenseKey);
    
    // Stop interval sebelumnya jika ada
    if (self.heartbeatInterval) {
        clearInterval(self.heartbeatInterval);
    }
    
    // Kirim heartbeat pertama (tanpa timeout yang lama)
    setTimeout(function() {
        if (self.isOnline && licenseKey && deviceId) {
            self.sendHeartbeat(licenseKey, deviceId)
                .then(function(result) {
                    console.log('[HEARTBEAT] Initial:', result.success ? 'Success' : 'Failed - ' + (result.message || 'Unknown'));
                })
                .catch(function(error) {
                    console.error('[HEARTBEAT] Initial error:', error);
                });
        }
    }, 1000);
    
    // Set interval setiap 2 menit (120 detik) untuk mengurangi beban
    self.heartbeatInterval = setInterval(function() {
        if (self.isOnline && licenseKey && deviceId) {
            console.log('[HEARTBEAT] Sending periodic heartbeat...');
            
            self.sendHeartbeat(licenseKey, deviceId)
                .then(function(result) {
                    if (!result.success) {
                        console.log('[HEARTBEAT] Periodic failed:', result.message);
                    }
                })
                .catch(function(error) {
                    console.error('[HEARTBEAT] Periodic error:', error);
                });
        } else {
            console.log('[HEARTBEAT] Skipping - offline or missing data');
        }
    }, 120000); // 2 menit = 120000 ms
    
    // Simpan data
    self.currentLicenseKey = licenseKey;
    self.currentDeviceId = deviceId;
    
    return self.heartbeatInterval;
};

// ==================== FUNGSI BARU: STOP HEARTBEAT ====================
OnlineLicenseAPI.prototype.stopHeartbeat = function() {
    if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        console.log('[HEARTBEAT] Stopped');
    }
};

// ==================== FUNGSI BARU: GET DEVICE STATUS ====================
OnlineLicenseAPI.prototype.getDeviceStatus = function(deviceId) {
    var self = this;
    
    return new Promise(function(resolve, reject) {
        var callbackName = 'devicestatus_callback_' + Date.now();
        
        var script = document.createElement('script');
        var url = self.SPREADSHEET_URL + 
                  '?action=getDeviceStatus' +
                  '&deviceId=' + encodeURIComponent(deviceId) +
                  '&callback=' + callbackName +
                  '&t=' + Date.now();
        
        script.src = url;
        
        var timeout = setTimeout(function() {
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
            resolve({ success: false, message: 'Timeout' });
        }, 5000);
        
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
            
            resolve(response || { success: false, message: 'No response' });
        };
        
        script.onerror = function() {
            clearTimeout(timeout);
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
            resolve({ success: false, message: 'Connection error' });
        };
        
        document.head.appendChild(script);
    });
};

// ==================== FUNGSI BARU: VALIDATE LICENSE ONLINE ====================
OnlineLicenseAPI.prototype.validateLicenseOnline = function(licenseKey) {
    var self = this;
    
    return new Promise(function(resolve) {
        // Buat unique callback name dengan random suffix
        var callbackName = 'validate_callback_' + Date.now() + '_' + 
                          Math.random().toString(36).substr(2, 8);
        
        console.log('[VALIDATE] Creating callback:', callbackName, 'for:', licenseKey);
        
        // 1. BUAT FUNGSI CALLBACK DULU (SEBELUM SCRIPT)
        window[callbackName] = function(response) {
            console.log('[VALIDATE CALLBACK] Executing for:', licenseKey, 'response:', response?.status);
            
            // Cleanup: hapus callback dari window
            setTimeout(function() {
                if (window[callbackName]) {
                    delete window[callbackName];
                    console.log('[VALIDATE] Cleaned up callback:', callbackName);
                }
            }, 100);
            
            // Hapus script element jika masih ada
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            clearTimeout(timeout);
            
            // Resolve promise
            if (response) {
                resolve(response);
            } else {
                resolve({ 
                    valid: false, 
                    status: 'error', 
                    message: 'Invalid response format' 
                });
            }
        };
        
        // 2. BUAT SCRIPT ELEMENT
        var script = document.createElement('script');
        script.id = 'validate_script_' + callbackName;
        
        // 3. SETUP URL DENGAN CALLBACK
        var url = self.SPREADSHEET_URL + 
                  '?action=validateLicense' +
                  '&code=' + encodeURIComponent(licenseKey) +
                  '&callback=' + encodeURIComponent(callbackName) +
                  '&t=' + Date.now();
        
        script.src = url;
        
        // 4. SETUP ERROR HANDLER
        script.onerror = function() {
            console.error('[VALIDATE] Script load error for:', licenseKey);
            
            // Cleanup
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            clearTimeout(timeout);
            
            // Hapus callback
            if (window[callbackName]) {
                delete window[callbackName];
            }
            
            resolve({ 
                valid: false, 
                status: 'error', 
                message: 'Failed to load validation script' 
            });
        };
        
        // 5. SETUP LOAD HANDLER (opsional, untuk debugging)
        script.onload = function() {
            console.log('[VALIDATE] Script loaded for:', licenseKey);
        };
        
        // 6. TIMEOUT HANDLER
        var timeout = setTimeout(function() {
            console.warn('[VALIDATE] Timeout for:', licenseKey);
            
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            if (window[callbackName]) {
                delete window[callbackName];
            }
            
            resolve({ 
                valid: false, 
                status: 'timeout', 
                message: 'Validation timeout (5s)' 
            });
        }, 5000);
        
        // 7. TUNGGU SEBENTAR SEBELUM MENAMBAHKAN SCRIPT
        // Ini memberi waktu untuk callback function benar-benar siap
        setTimeout(function() {
            console.log('[VALIDATE] Adding script to DOM for:', licenseKey);
            document.head.appendChild(script);
        }, 50); // Tunggu 50ms
        
    });
};


// ==================== UPDATE FUNGSI initialize ====================
OnlineLicenseAPI.prototype.initialize = function() {
    var self = this;
    
    console.log('Online License API Initializing...');
    
    // Initial connection check
    setTimeout(function() {
        self.autoSync();
    }, 5000);
    
    // Auto sync every 5 minutes
    setInterval(function() {
        self.autoSync();
    }, 5 * 60 * 1000);
    
    // Cek offline devices setiap 5 menit (di server side)
    setInterval(function() {
        if (self.isOnline) {
            // Trigger server untuk cek device offline
            var script = document.createElement('script');
            script.src = self.SPREADSHEET_URL + '?action=checkOfflineDevices&t=' + Date.now();
            document.head.appendChild(script);
            setTimeout(function() {
                if (script.parentNode) script.parentNode.removeChild(script);
            }, 1000);
        }
    }, 5 * 60 * 1000);
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
        window.addEventListener('online', function() {
            console.log('Browser online event detected');
            self.isOnline = true;
            
            // Restart heartbeat jika ada
            if (self.currentLicenseKey && self.currentDeviceId) {
                self.startHeartbeat(self.currentLicenseKey, self.currentDeviceId);
            }
            
            setTimeout(function() {
                self.autoSync();
            }, 2000);
        });
        
        window.addEventListener('offline', function() {
            console.log('Browser offline event detected');
            self.isOnline = false;
            
            // Stop heartbeat sementara
            if (self.heartbeatInterval) {
                clearInterval(self.heartbeatInterval);
                self.heartbeatInterval = null;
            }
        });
    }
};

// ==================== UTILITY FUNCTIONS - WAKTU LOKAL CLIENT SIDE ====================

// Fungsi untuk mendapatkan waktu lokal Indonesia dari browser
OnlineLicenseAPI.prototype.getLocalTime = function() {
    var now = new Date();
    
    // Format: YYYY-MM-DD HH:mm:ss
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
};

// ==================== GLOBAL INIT ====================
window.onlineLicenseAPI = new OnlineLicenseAPI();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            if (window.onlineLicenseAPI) {
                window.onlineLicenseAPI.initialize();
            }
        }, 3000);
    });
} else {
    setTimeout(function() {
        if (window.onlineLicenseAPI) {
            window.onlineLicenseAPI.initialize();
        }
    }, 3000);
}