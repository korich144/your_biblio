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

export function checkAuth() {
    if (!JSON.parse(localStorage.getItem('user'))) {
        throw new Error('Требуется авторизация');
    }
}

export async function apiRequest(action, data = {}, method = 'POST') {
    try {
        const response = await fetch(`api/ajax.php?action=${action}`, {
            method,
            headers: method !== 'GET' ? {'Content-Type': 'application/json'} : {},
            body: method !== 'GET' ? JSON.stringify(data) : null,
            credentials: 'include'
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Request failed');
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export const api = {
    async login(username, password) {
        return apiRequest('login', { username, password });
    },
    
    async register(userData) {
        return apiRequest('register', userData);
    },
    
    async getBooks(filters = {}, page = 1, isLibrary = false) {
        const queryParams = new URLSearchParams({ ...filters, page }).toString();
        return fetch(`api/ajax.php?action=get_books&${queryParams}`, {
            credentials: 'include'
        }).then(response => response.json());
    },
    
    async addBook(bookData) {
        checkAuth();
        return apiRequest('add_book', bookData);
    },
    
    async updateBook(bookId, bookData) {
        checkAuth();
        return apiRequest('update_book', { id: bookId, ...bookData });
    },
    
    async deleteBook(bookId) {
        checkAuth();
        return apiRequest('delete_book', { id: bookId });
    },
    
    async addToLibrary(bookId) {
        checkAuth();
        return apiRequest('add_to_library', { book_id: bookId });
    },
    
    async getProfile() {
        checkAuth();
        return apiRequest('get_profile');
    },
    
    async updateProfile(profileData) {
        checkAuth();
        return apiRequest('update_profile', profileData);
    },
    
    async changePassword(oldPassword, newPassword) {
        checkAuth();
        return apiRequest('change_password', { 
            old_password: oldPassword, 
            new_password: newPassword 
        });
    },
    
    async deleteAccount() {
        checkAuth();
        return apiRequest('delete_account');
    },
    
    async getFilters() {
        return apiRequest('get_filters', {}, 'GET');
    },
    
    async uploadFile(file, type) {
        const formData = new FormData();
        formData.append(type, file);
        
        const response = await fetch(`api/ajax.php?action=upload_${type}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Upload failed');
        return result;
    }
};

window.initAuth = function(signal) {
    const user = JSON.parse(localStorage.getItem('user'));
    updateUI(user);
    
    // Обработчики кнопок
    document.getElementById('login-btn')?.addEventListener('click', () => openModal('login-modal'), { signal });
    document.getElementById('register-btn')?.addEventListener('click', () => openModal('register-modal'), { signal });
    document.getElementById('home-register-btn')?.addEventListener('click', () => openModal('register-modal'), { signal });

    // Обработчики форм регистрации и входа
    document.getElementById('login-submit')?.addEventListener('click', loginUser, { signal });
    document.getElementById('register-submit')?.addEventListener('click', registerUser, { signal });

    // Меню профиля
    document.getElementById('user-profile')?.addEventListener('click', function(e) {
        e.stopPropagation();
        const menu = document.getElementById('user-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }, { signal });

    // Выход и переход в профиль
    document.getElementById('logout-btn')?.addEventListener('click', logoutUser, { signal });
    document.getElementById('profile-btn')?.addEventListener('click', function() {
        window.location.hash = '#/profile';
        document.getElementById('user-menu').style.display = 'none';
    }, { signal });

    // Закрытие меню при щелчке вне области
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('user-menu');
        if (menu && !e.target.closest('#user-menu') && !e.target.closest('#user-profile')) {
            menu.style.display = 'none';
        }
    }, { signal });

    // Регистрация при нажатии кнопки на главной странице
    document.addEventListener('click', function(e) {
        if (e.target.closest('.home-register-btn')) {
            openModal('register-modal');
        }
    }, { signal });

    // Переход в профиль
    document.getElementById('user-profile')?.addEventListener('click', function(e) {
        if (e.target.closest('#profile-btn')) {
            window.location.hash = '#/profile';
        }
    }, { signal });

    document.addEventListener('click', e => {
        if (e.target.matches('nav a')) {
            e.preventDefault();
            window.location.hash = e.target.getAttribute('href');
        }
    }, { signal });
}

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

async function loginUser() {
    try {
        const user = await api.login(
            document.getElementById('login-username').value,
            document.getElementById('login-password').value
        );
        
        localStorage.setItem('user', JSON.stringify(user));
        updateUI(user);
        closeModal('login-modal');
    } catch (error) {
        alert(error.message);
    }
}

async function registerUser() {
    const userData = {
        username: document.getElementById('register-username').value,
        name: document.getElementById('register-name').value,
        password: document.getElementById('register-password').value,
        email: document.getElementById('register-email').value
    };
    
    try {
        const user = await api.register(userData);
        localStorage.setItem('user', JSON.stringify(user));
        updateUI(user);
        closeModal('register-modal');
    } catch (error) {
        alert(error.message);
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
        const avatar = user.avatar || 'src/default_avatar.png';
        document.getElementById('user-avatar').src = avatar;
        document.getElementById('username-display').textContent = user.name || ''; 
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadHeader();
    loadFooter();
    initAuth(); // Инициализируем систему авторизации
});

document.getElementById('user-profile')?.addEventListener('click', function() {
    const menu = document.getElementById('user-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}, { signal });

function logoutUser() {
    localStorage.removeItem('user');
    localStorage.removeItem('remember');
    updateUI(null);
    window.location.hash = '#/';
}

export async function initProfile(signal) {
    try {
        const user = await api.getProfile();
        localStorage.setItem('user', JSON.stringify(user));
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
            user.gender === 'male' ? 'Мужской' : 
            user.gender === 'female' ? 'Женский' : 'Не указан';

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
            }, { signal });
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
            }, { signal });
        });

        document.querySelectorAll('.save-icon').forEach(icon => {
            icon.addEventListener('click', async function() {
                const field = this.closest('.editable-field');
                const display = field.querySelector('span');
                const input = field.nextElementSibling;
                const editIcon = field.querySelector('.edit-icon');
                const controls = field.querySelector('.edit-controls');
                const fieldId = input.id;
                
                let apiFieldName;
                let value = input.value;
                
                // Сопоставление ID полей с именами в API
                switch(fieldId) {
                    case 'profile-username-input':
                        apiFieldName = 'name';
                        break;
                    case 'profile-nickname-input':
                        apiFieldName = 'username';
                        break;
                    case 'profile-email-input':
                        apiFieldName = 'email';
                        break;
                    case 'profile-age-input':
                        apiFieldName = 'birthdate';
                        // Преобразуем возраст в дату рождения
                        const birthYear = new Date().getFullYear() - parseInt(value);
                        value = `${birthYear}-01-01`; // Примерная дата
                        break;
                    case 'profile-gender-input':
                        apiFieldName = 'gender';
                        value = value == 'male' ? 'male' : value == 'female' ? 'female' : '';
                        break;
                    default:
                        apiFieldName = fieldId.replace('profile-', '').replace('-input', '');
                }
                
                try {
                    // Отправляем обновление на сервер
                    await api.updateProfile({ [apiFieldName]: value });
                    
                    // Обновляем локальные данные
                    const user = JSON.parse(localStorage.getItem('user'));
                    user[apiFieldName] = value;
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    // Обновляем отображение
                    if (apiFieldName === 'name') {
                        display.textContent = value;
                        document.getElementById('username-display').textContent = value;
                    } else if (apiFieldName === 'username') {
                        display.textContent = value;
                    } else if (apiFieldName === 'gender') {
                        if (input.tagName === 'SELECT') {
                            const selectedOption = input.options[input.selectedIndex];
                            value = selectedOption.value;
                        }
                        const genderDisplayMap = {
                            'male': 'Мужской',
                            'female': 'Женский',
                            '': 'Не указан'
                        };
                        display.textContent = genderDisplayMap[value] || 'Не указан';
                    } else {
                        display.textContent = value;
                    }
                    
                    // Скрываем элементы ввода
                    input.style.display = 'none';
                    display.style.display = 'inline';
                    editIcon.style.display = 'block';
                    controls.style.display = 'none';
                } catch (error) {
                    alert('Ошибка сохранения: ' + error.message);
                }
            }, { signal });
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
            }, { signal });
        }
        
        if (user.avatar) {
            document.getElementById('profile-avatar-preview').src = user.avatar;
        }

        // Обработчики
        document.getElementById('change-avatar-btn')?.addEventListener('click', () => {
            document.getElementById('profile-avatar-input').click();
        }, { signal });

        document.getElementById('profile-avatar-input').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                try {
                    const result = await api.uploadFile(e.target.files[0], 'avatar');
                    const avatarUrl = result.avatar;
                    
                    // Сохраняем URL в профиле
                    await api.updateProfile({ avatar: avatarUrl });
                    
                    // Обновляем локальные данные
                    const user = JSON.parse(localStorage.getItem('user'));
                    user.avatar = avatarUrl;
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    // Обновляем изображения
                    document.getElementById('profile-avatar-preview').src = avatarUrl;
                    document.getElementById('user-avatar').src = avatarUrl;
                } catch (error) {
                    alert('Ошибка загрузки аватара: ' + error.message);
                }
            }
        }, { signal });

        document.getElementById('change-password-btn').addEventListener('click', async () => {
            const oldPassword = prompt('Введите старый пароль:');
            const newPassword = prompt('Введите новый пароль:');
            
            if (oldPassword && newPassword) {
                try {
                    await api.changePassword(oldPassword, newPassword);
                    alert('Пароль успешно изменен!');
                } catch (error) {
                    alert(error.message);
                }
            }
        }, { signal });

        document.getElementById('delete-account-btn').addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.')) {
                try {
                    await api.deleteAccount();
                    logoutUser();
                    alert('Ваш аккаунт был успешно удален');
                } catch (error) {
                    alert(error.message);
                }
            }
        }, { signal });

        document.getElementById('logout-profile-btn')?.addEventListener('click', logoutUser, { signal });
        document.getElementById('logout-btn')?.addEventListener('click', logoutUser, { signal });
        document.getElementById('profile-btn')?.addEventListener('click', function() {
            window.location.hash = '#/profile';
            document.getElementById('user-menu').style.display = 'none';
        }, { signal });

        // Обработчики для сохранения данных
        const saveField = (id, key) => {
            document.getElementById(id)?.addEventListener('change', function() {
                user[key] = this.value;
                localStorage.setItem('user', JSON.stringify(user));
                if (key === 'name') {
                    document.getElementById('username-display').textContent = user.name;
                }
            }, { signal });
        };

        saveField('profile-username', 'name');
        saveField('profile-nickname', 'username');
        saveField('profile-email', 'email');
        saveField('profile-age', 'age');
        saveField('profile-gender', 'gender');
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        alert('Не удалось загрузить профиль');
    }
}