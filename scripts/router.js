const routes = {
    '/': 'home',
    '/my-library': 'my-library',
    '/catalog': 'catalog',
    '/profile': 'profile'
};

let pageController = new AbortController();

async function loadPage(page) {
    const mainContainer = document.getElementById('main-container');
    mainContainer.innerHTML = '';

    pageController.abort();
    pageController = new AbortController();
    const signal = pageController.signal;

    signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
    });

    try {
        switch(page) {
            case 'home':
                mainContainer.innerHTML = await fetch('partials/home.html').then(r => r.text());
                break;
            case 'my-library':
            case 'catalog':
                mainContainer.innerHTML = await fetch(page === 'catalog' ? 
                    'partials/catalog.html' : 'partials/my_biblio.html').then(r => r.text());
                
                // Инициализация только после загрузки HTML
                setTimeout(async () => {
                    const { initCatalog } = await import('./catalog.js');
                    initCatalog(signal, page === 'my-library');
                }, 100);
                break;
            case 'profile':
                mainContainer.innerHTML = await fetch('partials/profile.html').then(r => r.text());
                
                // Инициализация профиля
                setTimeout(async () => {
                    const { initProfile } = await import('./common.js');
                    initProfile(signal);
                }, 100);
                break;
        }
    } catch (error) {
        console.error('Ошибка загрузки страницы:', error);
        mainContainer.innerHTML = '<div class="error">Ошибка загрузки страницы</div>';
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
    const fullHash = window.location.hash.slice(1) || '/';
    
    const [path, query] = fullHash.split('?');
    const page = routes[path] || 'home';
    loadPage(page);
    
    window.currentQuery = new URLSearchParams(query);
    setActiveLink();
}

window.addEventListener('hashchange', onRouteChange);
window.addEventListener('load', () => {
    // Загрузка общих компонентов
    loadHeader();
    loadFooter();
    
    // Обработка начального роута
    onRouteChange();
});