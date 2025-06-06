// Добавим глобальные функции
window.loadHeader = async function() {
    const header = await fetch('partials/header.html').then(r => r.text());
    document.getElementById('header-container').innerHTML = header;
    setActiveLink();
    initAuth();
}

window.loadFooter = async function() {
    const footer = await fetch('partials/footer.html').then(r => r.text());
    document.getElementById('footer-container').innerHTML = footer;
}

window.setActiveLink = function() {
    const path = window.location.hash.slice(1) || '/';
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${path}`);
    });
}

// Управление состоянием авторизации
window.initAuth = function() {
    const user = JSON.parse(localStorage.getItem('user'));
    updateUI(user);
    
    // Обработчики кнопок
    document.getElementById('login-btn')?.addEventListener('click', () => openModal('login-modal'));
    document.getElementById('register-btn')?.addEventListener('click', () => openModal('register-modal'));
    document.getElementById('home-register-btn')?.addEventListener('click', () => openModal('register-modal'));
    
    // Заглушки для авторизации
    document.getElementById('login-submit')?.addEventListener('click', loginUser);
    document.getElementById('register-submit')?.addEventListener('click', registerUser);
    document.getElementById('user-profile')?.addEventListener('click', function(e) {
        e.stopPropagation();
        const menu = document.getElementById('user-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    document.getElementById('logout-btn')?.addEventListener('click', logoutUser);
    document.getElementById('profile-btn')?.addEventListener('click', function() {
        window.location.hash = '#/profile';
        document.getElementById('user-menu').style.display = 'none';
    });

    document.addEventListener('click', function(e) {
        const menu = document.getElementById('user-menu');
        if (menu && !e.target.closest('#user-menu') && !e.target.closest('#user-profile')) {
            menu.style.display = 'none';
        }
    });
}

// Обновим обработчики навигации
document.addEventListener('click', e => {
    if (e.target.matches('nav a')) {
        e.preventDefault();
        window.location.hash = e.target.getAttribute('href');
    }
});

// Добавляем функции для работы с модальными окнами
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Обработчики для закрытия модальных окон
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-close') || 
        e.target.classList.contains('modal-overlay')) {
        const modal = e.target.closest('.modal-overlay');
        if (modal) closeModal(modal.id);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (modal.style.display === 'flex') {
                closeModal(modal.id);
            }
        });
    }
});

function loginUser() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('remember-me').checked;
    
    // Заглушка - в реальности проверка на сервере
    if (username && password) {
        const user = {
            username,
            name: username, // Для демо
            avatar: 'src/default_avatar.png'
        };
        
        localStorage.setItem('user', JSON.stringify(user));
        if (remember) {
            localStorage.setItem('remember', 'true');
        }
        
        updateUI(user);
        closeModal('login-modal');
    } else {
        alert('Заполните все поля');
    }
}

function registerUser() {
    const username = document.getElementById('register-username').value;
    const name = document.getElementById('register-name').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const email = document.getElementById('register-email').value;
    
    // Заглушка - валидация
    if (password !== confirm) {
        alert('Пароли не совпадают');
        return;
    }
    
    if (username && name && password && email) {
        const user = {
            username,
            name,
            email,
            avatar: 'src/default_avatar.png'
        };
        
        localStorage.setItem('user', JSON.stringify(user));
        updateUI(user);
        closeModal('register-modal');
    } else {
        alert('Заполните все поля');
    }
}

export function updateUI(user) {
    const isLoggedIn = !!user;
    const myLibraryLink = document.getElementById('my-library-link');
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const usernameDisplay = document.getElementById('username-display');
    
    if (myLibraryLink) myLibraryLink.style.display = isLoggedIn ? 'block' : 'none';
    if (registerBtn) registerBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    if (userProfile) userProfile.style.display = isLoggedIn ? 'flex' : 'none';
    
    if (isLoggedIn && usernameDisplay) {
        usernameDisplay.textContent = user.name;
        document.getElementById('user-avatar').src = user.avatar;
    }
}

// Обновим инициализацию в конце файла
window.addEventListener('DOMContentLoaded', () => {
    loadHeader();
    loadFooter();
    initAuth(); // Инициализируем систему авторизации
});

document.getElementById('user-profile')?.addEventListener('click', function() {
    const menu = document.getElementById('user-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
});

// Функция выхода
function logoutUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('remember');
    updateUI(null);
    window.location.hash = '#/';
}

export function initProfile() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.hash = '#/';
        return;
    }

    // Заполняем данные профиля
    document.getElementById('profile-username-display').textContent = user.name || '';
    document.getElementById('profile-nickname-display').textContent = user.username || '';
    document.getElementById('profile-email-display').textContent = user.email || '';
    document.getElementById('profile-age-display').textContent = user.age || '';
    document.getElementById('profile-gender-display').textContent = 
        user.gender === 'Мужской' ? 'Мужской' : 
        user.gender === 'Женский' ? 'Женский' : 'Не указан';

    document.querySelectorAll('.edit-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const field = this.closest('.editable-field');
            const display = field.querySelector('span');
            const input = field.nextElementSibling;
            const controls = field.querySelector('.edit-controls');
            
            display.style.display = 'none';
            this.style.display = 'none';
            input.style.display = 'block';
            input.value = display.textContent;
            controls.style.display = 'flex';
            
            if (input.tagName === 'SELECT') {
                input.value = user.gender || '';
            }
        });
    });

    document.querySelectorAll('.cancel-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const field = this.closest('.editable-field');
            const display = field.querySelector('span');
            const input = field.nextElementSibling;
            const editIcon = field.querySelector('.edit-icon');
            const controls = field.querySelector('.edit-controls');
            
            input.style.display = 'none';
            display.style.display = 'inline';
            editIcon.style.display = 'block';
            controls.style.display = 'none';
        });
    });

    document.querySelectorAll('.save-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const field = this.closest('.editable-field');
            const display = field.querySelector('span');
            const input = field.nextElementSibling;
            const editIcon = field.querySelector('.edit-icon');
            const controls = field.querySelector('.edit-controls');
            const fieldName = input.id.replace('profile-', '').replace('-input', '');
            
            const newValue = input.value;
            display.textContent = newValue;
            
            // Обновляем данные пользователя
            user[fieldName] = newValue;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Возвращаем отображение
            input.style.display = 'none';
            display.style.display = 'inline';
            editIcon.style.display = 'block';
            controls.style.display = 'none';
            
            // Обновляем имя в хедере
            if (fieldName === 'username') {
                document.getElementById('username-display').textContent = newValue;
            }
        });
    });

    const visibilityBtn = document.querySelector('.visibility');
    if (visibilityBtn) {
        visibilityBtn.addEventListener('click', function() {
        const display = document.getElementById('profile-email-display');
        const icon = this.querySelector('.visibility-icon');
        
        if (display.textContent === user.email) {
            display.textContent = '••••@••••.•••';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            display.textContent = user.email;
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
        });
    }
    
    if (user.avatar) {
        document.getElementById('profile-avatar-preview').src = user.avatar;
    }

    // Обработчики
    document.getElementById('change-avatar-btn')?.addEventListener('click', () => {
        document.getElementById('profile-avatar-input').click();
    });

    document.getElementById('profile-avatar-input')?.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function(event) {
                user.avatar = event.target.result;
                localStorage.setItem('user', JSON.stringify(user));
                document.getElementById('profile-avatar-preview').src = user.avatar;
                document.getElementById('user-avatar').src = user.avatar;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    document.getElementById('logout-profile-btn')?.addEventListener('click', logoutUser);
    document.getElementById('logout-btn')?.addEventListener('click', logoutUser);
    document.getElementById('profile-btn')?.addEventListener('click', function() {
        window.location.hash = '#/profile';
        document.getElementById('user-menu').style.display = 'none';
    });

    // Обработчики для сохранения данных
    const saveField = (id, key) => {
        document.getElementById(id)?.addEventListener('change', function() {
            user[key] = this.value;
            localStorage.setItem('user', JSON.stringify(user));
            if (key === 'name') {
                document.getElementById('username-display').textContent = user.name;
            }
        });
    };

    saveField('profile-username', 'name');
    saveField('profile-nickname', 'username');
    saveField('profile-email', 'email');
    saveField('profile-age', 'age');
    saveField('profile-gender', 'gender');
}