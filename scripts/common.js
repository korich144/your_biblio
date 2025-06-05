// Добавим глобальные функции
window.loadHeader = async function() {
    const header = await fetch('partials/header.html').then(r => r.text());
    document.getElementById('header-container').innerHTML = header;
    setActiveLink();
}

window.loadFooter = async function() {
    const footer = await fetch('partials/footer.html').then(r => r.text());
    document.getElementById('footer-container').innerHTML = footer;
}

window.setActiveLink = function() {
    console.log("aaaaaaaaaaa");
    const path = window.location.hash.slice(1) || '/';
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${path}`);
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