const routes = {
    '/': 'home',
    '/my-library': 'my-library',
    '/catalog': 'catalog',
    '/profile': 'profile'
};

async function loadPage(page) {
    const mainContainer = document.getElementById('main-container');
    if (!mainContainer) return;
    
    mainContainer.innerHTML = '';
    
    switch(page) {
        case 'home':
            mainContainer.innerHTML = await fetch('partials/home.html').then(r => r.text());
            break;
        case 'my-library':
            mainContainer.innerHTML = await fetch('partials/my_biblio.html').then(r => r.text());
            await import('./catalog.js').then(module => module.initCatalog());
            break;
        case 'catalog':
            mainContainer.innerHTML = await fetch('partials/catalog.html').then(r => r.text());
            await import('./catalog.js').then(module => module.initCatalog());
            break;
        case 'profile':
            mainContainer.innerHTML = await fetch('partials/profile.html').then(r => r.text());
            await import('./common.js').then(module => module.initProfile());
            break;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

function onRouteChange() {
    const path = window.location.hash.slice(1) || '/';
    const page = routes[path] || 'home';
    loadPage(page);
    setActiveLink(); // Обновляем активные ссылки
}

window.addEventListener('hashchange', onRouteChange);
window.addEventListener('load', () => {
    // Загрузка общих компонентов
    loadHeader();
    loadFooter();
    
    // Обработка начального роута
    onRouteChange();
});