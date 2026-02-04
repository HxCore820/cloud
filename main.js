// Main JavaScript Functions

// Points configuration
const POINTS_CONFIG = {
    watchAd: 5,
    shortLink: 2,
    dailyBonus: 10,
    vpsConfigs: {
        '2-4-2012': { cpu: 2, ram: 4, os: ['2012'], pointsPerHour: 50 },
        '4-4-all': { cpu: 4, ram: 4, os: ['all'], pointsPerHour: 75 },
        '4-8-all': { cpu: 4, ram: 8, os: ['all'], pointsPerHour: 100 },
        '2-6-server': { cpu: 2, ram: 6, os: ['2012', '2019', '2022'], pointsPerHour: 60 },
        '2-8-server': { cpu: 2, ram: 8, os: ['2012', '2019', '2022', '2025'], pointsPerHour: 80 },
        '4-6-all': { cpu: 4, ram: 6, os: ['all'], pointsPerHour: 90 }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateProgressBar();
});

function initializeEventListeners() {
    // Login modal
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const vpsModal = document.getElementById('vpsModal');
    const closeBtns = document.querySelectorAll('.close');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (!currentUser) {
                loginModal.style.display = 'block';
            }
        });
    }
    
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Watch ads button
    const watchAdsBtn = document.getElementById('watchAdsBtn');
    if (watchAdsBtn) {
        watchAdsBtn.addEventListener('click', handleWatchAds);
    }
    
    // Get free VPS button
    const getFreeVPSBtn = document.getElementById('getFreeVPSBtn');
    if (getFreeVPSBtn) {
        getFreeVPSBtn.addEventListener('click', () => {
            if (!currentUser) {
                loginModal.style.display = 'block';
            } else {
                vpsModal.style.display = 'block';
            }
        });
    }
    
    // Create VPS button
    const createVPSBtn = document.getElementById('createVPSBtn');
    if (createVPSBtn) {
        createVPSBtn.addEventListener('click', handleCreateVPS);
    }
    
    // VPS time slider
    const vpsTimeSlider = document.getElementById('vpsTime');
    const timeDisplay = document.getElementById('timeDisplay');
    const vpsConfig = document.getElementById('vpsConfig');
    
    if (vpsTimeSlider && timeDisplay) {
        vpsTimeSlider.addEventListener('input', function() {
            updateTimeDisplay();
        });
    }
    
    if (vpsConfig) {
        vpsConfig.addEventListener('change', updateTimeDisplay);
    }
    
    // Task buttons
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!currentUser) {
                loginModal.style.display = 'block';
            } else {
                handleTaskClick(this);
            }
        });
    });
    
    // Action buttons in dashboard
    const createBtn = document.querySelector('.btn-action.create');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            vpsModal.style.display = 'block';
        });
    }
}

function updateProgressBar() {
    const sessionPoints = parseInt(document.getElementById('sessionPoints')?.textContent || 0);
    const totalPoints = parseInt(document.getElementById('totalPoints')?.textContent || 300);
    const progressFill = document.getElementById('progressFill');
    
    if (progressFill) {
        const percentage = (sessionPoints / totalPoints) * 100;
        progressFill.style.width = percentage + '%';
    }
}

function updateTimeDisplay() {
    const hours = parseInt(document.getElementById('vpsTime')?.value || 6);
    const configKey = document.getElementById('vpsConfig')?.value || '4-8-all';
    const config = POINTS_CONFIG.vpsConfigs[configKey];
    
    if (config) {
        const totalPoints = hours * config.pointsPerHour;
        const timeDisplay = document.getElementById('timeDisplay');
        if (timeDisplay) {
            timeDisplay.textContent = `${hours} giờ (${totalPoints} điểm)`;
        }
    }
}

async function handleWatchAds() {
    if (!currentUser) {
        document.getElementById('loginModal').style.display = 'block';
        return;
    }
    
    // Simulate watching ad
    alert('Mở video quảng cáo... (Demo mode)');
    
    // Add points
    await addPoints(POINTS_CONFIG.watchAd, 'watch_ad');
    
    // Update display
    const currentPoints = parseInt(document.getElementById('sessionPoints').textContent);
    document.getElementById('sessionPoints').textContent = currentPoints + POINTS_CONFIG.watchAd;
    updateProgressBar();
}

async function addPoints(points, source) {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update({
            points: firebase.firestore.FieldValue.increment(points),
            totalPoints: firebase.firestore.FieldValue.increment(points)
        });
        
        // Log points activity
        await db.collection('pointsActivity').add({
            userId: currentUser.uid,
            points: points,
            source: source,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Added ${points} points from ${source}`);
    } catch (error) {
        console.error('Error adding points:', error);
    }
}

async function handleCreateVPS() {
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        return;
    }
    
    const configKey = document.getElementById('vpsConfig').value;
    const osVersion = document.getElementById('vpsOS').value;
    const hours = parseInt(document.getElementById('vpsTime').value);
    const config = POINTS_CONFIG.vpsConfigs[configKey];
    
    if (!config) {
        alert('Cấu hình không hợp lệ!');
        return;
    }
    
    const requiredPoints = hours * config.pointsPerHour;
    
    // Get user data
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    // Check if in free trial period
    const isInFreeTrial = !userData.freeTrialUsed || 
        (userData.freeTrialStartDate && 
         (new Date() - userData.freeTrialStartDate.toDate()) / (1000 * 60 * 60 * 24) <= 7);
    
    if (!isInFreeTrial && userData.points < requiredPoints) {
        alert(`Không đủ điểm! Cần ${requiredPoints} điểm, bạn có ${userData.points} điểm.`);
        return;
    }
    
    // Create VPS request
    try {
        const vpsData = {
            userId: currentUser.uid,
            config: configKey,
            cpu: config.cpu,
            ram: config.ram,
            osVersion: osVersion,
            hours: hours,
            pointsPerHour: config.pointsPerHour,
            totalPoints: requiredPoints,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
            isFreeTrial: isInFreeTrial
        };
        
        const vpsRef = await db.collection('vps').add(vpsData);
        
        // Update user data
        if (!userData.freeTrialUsed) {
            await userRef.update({
                freeTrialUsed: true,
                freeTrialStartDate: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        if (!isInFreeTrial) {
            await userRef.update({
                points: firebase.firestore.FieldValue.increment(-requiredPoints)
            });
        }
        
        // Trigger GitHub Actions workflow
        alert('VPS đang được tạo! Vui lòng đợi 2-3 phút...');
        await triggerGitHubWorkflow(vpsRef.id, vpsData);
        
        document.getElementById('vpsModal').style.display = 'none';
        
    } catch (error) {
        console.error('Error creating VPS:', error);
        alert('Lỗi khi tạo VPS: ' + error.message);
    }
}

async function triggerGitHubWorkflow(vpsId, vpsData) {
    // This would need to be implemented with GitHub API
    // For now, just log the request
    console.log('Triggering GitHub workflow for VPS:', vpsId, vpsData);
    
    // Store trigger request
    await db.collection('vpsRequests').doc(vpsId).set({
        ...vpsData,
        triggered: false,
        workflowUrl: '',
        rdpInfo: null
    });
}

function handleTaskClick(button) {
    const taskCard = button.closest('.task-card');
    const taskTitle = taskCard.querySelector('h3').textContent;
    
    if (taskTitle.includes('Video')) {
        handleWatchAds();
    } else if (taskTitle.includes('Liên Kết')) {
        handleShortLink();
    } else if (taskTitle.includes('Nhiệm Vụ')) {
        showDailyMissions();
    }
}

async function handleShortLink() {
    alert('Mở liên kết ngắn... (Demo mode)');
    await addPoints(POINTS_CONFIG.shortLink, 'short_link');
    
    const currentPoints = parseInt(document.getElementById('sessionPoints').textContent);
    document.getElementById('sessionPoints').textContent = currentPoints + POINTS_CONFIG.shortLink;
    updateProgressBar();
}

function showDailyMissions() {
    alert('Nhiệm vụ hàng ngày:\n\n1. Xem 10 video quảng cáo\n2. Hoàn thành 5 liên kết ngắn\n3. Đăng nhập liên tục 7 ngày\n\nBonus: +10 điểm mỗi ngày!');
}

// Auto-refresh points every 30 seconds
setInterval(async () => {
    if (currentUser) {
        try {
            const userRef = db.collection('users').doc(currentUser.uid);
            const doc = await userRef.get();
            if (doc.exists) {
                const userData = doc.data();
                document.getElementById('sessionPoints').textContent = userData.points || 0;
                updateProgressBar();
            }
        } catch (error) {
            console.error('Error refreshing points:', error);
        }
    }
}, 30000);

// Check for spam/suspicious activity
let activityLog = [];
const SPAM_THRESHOLD = 10; // Max 10 actions per minute

function checkSpamActivity(action) {
    const now = Date.now();
    activityLog.push({ action, timestamp: now });
    
    // Remove old entries (older than 1 minute)
    activityLog = activityLog.filter(log => now - log.timestamp < 60000);
    
    if (activityLog.length > SPAM_THRESHOLD) {
        return true; // Suspicious activity detected
    }
    
    return false;
}

// Monitor suspicious patterns
async function reportSuspiciousActivity(userId, reason) {
    try {
        await db.collection('suspiciousActivity').add({
            userId: userId,
            reason: reason,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            reviewed: false
        });
        
        console.log('Suspicious activity reported:', userId, reason);
    } catch (error) {
        console.error('Error reporting suspicious activity:', error);
    }
}
