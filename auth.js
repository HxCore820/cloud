// Authentication Handler

let currentUser = null;

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        onUserLoggedIn(user);
    } else {
        currentUser = null;
        onUserLoggedOut();
    }
});

// Google Sign In
document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', signInWithGoogle);
    }
    
    const emailLoginForm = document.getElementById('emailLoginForm');
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', signInWithEmail);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
});

async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        // Create user document if doesn't exist
        await createUserDocument(user);
        
        console.log('Google sign in successful:', user.email);
    } catch (error) {
        console.error('Google sign in error:', error);
        alert('Đăng nhập thất bại: ' + error.message);
    }
}

async function signInWithEmail(e) {
    e.preventDefault();
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        const user = result.user;
        
        console.log('Email sign in successful:', user.email);
    } catch (error) {
        console.error('Email sign in error:', error);
        
        // If user doesn't exist, create account
        if (error.code === 'auth/user-not-found') {
            try {
                const result = await auth.createUserWithEmailAndPassword(email, password);
                await createUserDocument(result.user);
                console.log('Account created:', result.user.email);
            } catch (createError) {
                console.error('Account creation error:', createError);
                alert('Tạo tài khoản thất bại: ' + createError.message);
            }
        } else {
            alert('Đăng nhập thất bại: ' + error.message);
        }
    }
}

async function signOut() {
    try {
        await auth.signOut();
        console.log('User signed out');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

async function createUserDocument(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    
    if (!doc.exists) {
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'User',
            photoURL: user.photoURL || '',
            points: 0,
            totalPoints: 0,
            freeTrialUsed: false,
            freeTrialStartDate: null,
            accountCreated: firebase.firestore.FieldValue.serverTimestamp(),
            isBanned: false,
            banReason: '',
            vpsHistory: [],
            dailyStreak: 0,
            lastLoginDate: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await userRef.set(userData);
        console.log('User document created');
    } else {
        // Update last login
        await userRef.update({
            lastLoginDate: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

function onUserLoggedIn(user) {
    // Hide landing page, show dashboard
    document.querySelector('.hero')?.classList.add('hidden');
    document.querySelector('.tasks-section')?.classList.add('hidden');
    document.querySelector('.how-it-works')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.remove('hidden');
    
    // Update UI with user info
    document.getElementById('userName').textContent = user.displayName || user.email;
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.photoURL) {
        userAvatar.src = user.photoURL;
    }
    
    // Update login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = 'Dashboard';
        loginBtn.onclick = () => {
            window.location.href = '#dashboard';
        };
    }
    
    // Close modal
    document.getElementById('loginModal').style.display = 'none';
    
    // Load user data
    loadUserData(user.uid);
}

function onUserLoggedOut() {
    // Show landing page, hide dashboard
    document.querySelector('.hero')?.classList.remove('hidden');
    document.querySelector('.tasks-section')?.classList.remove('hidden');
    document.querySelector('.how-it-works')?.classList.remove('hidden');
    document.getElementById('dashboard')?.classList.add('hidden');
    
    // Reset login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = 'Đăng Nhập';
        loginBtn.onclick = () => {
            document.getElementById('loginModal').style.display = 'block';
        };
    }
}

async function loadUserData(uid) {
    try {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        
        if (doc.exists) {
            const userData = doc.data();
            
            // Update points display
            document.getElementById('sessionPoints').textContent = userData.points || 0;
            
            // Check for ban
            if (userData.isBanned) {
                alert('Tài khoản của bạn đã bị khóa: ' + userData.banReason);
                await signOut();
                return;
            }
            
            // Check free trial
            checkFreeTrial(userData);
            
            // Load active VPS
            loadActiveVPS(uid);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function checkFreeTrial(userData) {
    if (!userData.freeTrialUsed) {
        // Show free trial banner
        const banner = document.createElement('div');
        banner.className = 'free-trial-banner';
        banner.innerHTML = `
            <i class="fas fa-gift"></i>
            <span>Bạn có 7 ngày dùng thử miễn phí!</span>
        `;
        document.querySelector('.dashboard-main').prepend(banner);
    } else if (userData.freeTrialStartDate) {
        const trialStart = userData.freeTrialStartDate.toDate();
        const daysPassed = Math.floor((new Date() - trialStart) / (1000 * 60 * 60 * 24));
        
        if (daysPassed > 7) {
            console.log('Free trial expired, points will be deducted');
        }
    }
}

async function loadActiveVPS(uid) {
    try {
        const vpsRef = db.collection('vps').where('userId', '==', uid).where('status', '==', 'active');
        const snapshot = await vpsRef.get();
        
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const vpsData = doc.data();
                displayVPSInfo(vpsData);
            });
        }
    } catch (error) {
        console.error('Error loading VPS:', error);
    }
}

function displayVPSInfo(vpsData) {
    // Update dashboard with VPS information
    console.log('Active VPS:', vpsData);
    // TODO: Update UI with VPS details
}
