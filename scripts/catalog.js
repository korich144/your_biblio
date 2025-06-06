import { openModal, closeModal } from './common.js';

// Инициализация при загрузке страницы
export function initCatalog() {
    if (document.querySelector('.books')) {
        loadBooks();
        initFilters();
        initSearch();
    }

    const isCatalogPage = window.location.hash.includes('/catalog');

    // Используем делегирование событий для динамических элементов
    document.addEventListener('click', function(e) {
        // Обработка кнопки создания книги
        if (e.target.closest('#create-book-btn') && !isCatalogPage) {
            openModal('create-book-modal');
        }
        
        // Обработка кнопки редактирования
        if (e.target.closest('#edit-book') && !isCatalogPage) {
            openEditBookModal();
        }
        
        // Обработка кнопки удаления
        if (e.target.closest('#delete-book') && !isCatalogPage) {
            if (confirm('Вы уверены, что хотите удалить эту книгу?')) {
                closeModal('book-details-modal');
            }
        }
        
        // Обработка отмены редактирования
        if (e.target.closest('#cancel-edit') && !isCatalogPage) {
            closeModal('edit-book-modal');
            openModal('book-details-modal');
        }

        if (e.target.closest('#save-changes') && !isCatalogPage) {
            saveBookChanges();
        }

        if (e.target.closest('#add-to-library') && isCatalogPage) {
            addToLibrary(currentBookId);
            closeModal('book-details-modal');
        }
    });

    // Инициализация Drag and Drop
    initDragAndDrop('drop-area', 'preview-image');
    initDragAndDrop('edit-drop-area', 'edit-preview-image');
    setTimeout(() => {
        initDragAndDrop('edit-drop-area', 'edit-preview-image');
    }, 0);
};

let booksData = []; // Глобальная переменная для хранения книг
let currentBookId = null; // ID текущей книги

// Динамическая загрузка книг
async function loadBooks() {
    try {
        const isCatalogPage = window.location.hash.includes('/catalog');
        const isMyLibraryPage = window.location.hash.includes('/my-library');
        
        if (isCatalogPage) {
            // Загрузка книг для каталога
            const response = await fetch('data/catalog.json');
            booksData = await response.json();
        } 
        else if (isMyLibraryPage) {
            // Загрузка книг для библиотеки
            booksData = JSON.parse(localStorage.getItem('myLibrary')) || [];
        }
        
        renderBooks(booksData);
        setupBookEvents();
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

// Заполнение модального окна просмотра
function fillBookDetailsModal(book) {
    const modal = document.getElementById('book-details-modal');
    if (!modal) return;
    
    // Заполняем общие данные
    modal.querySelector('.book-title').textContent = book.title;
    modal.querySelector('.book-author').textContent = book.author;
    
    // Заполняем детали
    const publisherEl = modal.querySelector('.publisher');
    const yearEl = modal.querySelector('.year');
    const pagesEl = modal.querySelector('.pages');
    const genreEl = modal.querySelector('.genre');
    const descriptionEl = modal.querySelector('.book-description p');
    
    if (publisherEl) publisherEl.textContent = book.publisher || 'Не указано';
    if (yearEl) yearEl.textContent = book.year || 'Не указан';
    if (pagesEl) pagesEl.textContent = book.pages || 'Не указано';
    if (genreEl) genreEl.textContent = book.genre || 'Не указан';
    if (descriptionEl) descriptionEl.textContent = book.description || 'Описание отсутствует.';
    
    // Установка обложки
    const img = modal.querySelector('.preview-container img');
    if (img) {
        img.src = book.image;
        img.alt = book.title;
    }
    
    // Скрываем кнопки управления, если мы в каталоге
    const isCatalogPage = window.location.hash.includes('/catalog');
    const editBtn = modal.querySelector('#edit-book');
    const deleteBtn = modal.querySelector('#delete-book');
    const sendToCatalogBtn = modal.querySelector('#send-to-catalog');
    const addToLibraryBtn = modal.querySelector('#add-to-library');
    
    if (editBtn) editBtn.style.display = isCatalogPage ? 'none' : 'inline-block';
    if (deleteBtn) deleteBtn.style.display = isCatalogPage ? 'none' : 'inline-block';
    if (sendToCatalogBtn) sendToCatalogBtn.style.display = isCatalogPage ? 'none' : 'inline-block';
    if (addToLibraryBtn) addToLibraryBtn.style.display = isCatalogPage ? 'inline-block' : 'none';
}

// Заполнение модального окна редактирования
function fillEditBookModal(book) {
    const modal = document.getElementById('edit-book-modal');
    modal.querySelector('.book-title-input').value = book.title;
    modal.querySelector('.book-author-input').value = book.author;
    modal.querySelector('.publisher-input').value = book.publisher || '';
    modal.querySelector('.year-input').value = book.year || '';
    modal.querySelector('.pages-input').value = book.pages || '';
    modal.querySelector('.genre-select').value = book.genre || '';
    modal.querySelector('.description-textarea').value = book.description || '';
    
    // Установка обложки
    const img = modal.querySelector('#edit-preview-image');
    img.src = book.image;
    img.alt = book.title;
    if (book.image) {
        modal.querySelector('.preview-container').style.display = 'flex';
        modal.querySelector('.content').style.display = 'none';
        modal.querySelector('.image-placeholder').style.display = 'none';
    }
}

// Отображение книг
function renderBooks(books) {
    const booksContainer = document.querySelector('.books');
    if (!booksContainer) return;
    
    booksContainer.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.dataset.id = book.id;
        bookCard.innerHTML = `
            <div class="image-container">
                <img src="${book.image}" alt="${book.title}">
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p><span>Автор:</span> ${book.author}</p>
                <p><span>Издание:</span> ${book.year}</p>
                <p class="description">${book.description}</p>
            </div>
        `;
        booksContainer.appendChild(bookCard);
    });
}

// Настройка обработчиков событий для книг
function setupBookEvents() {
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', function() {
            const bookId = this.dataset.id;
            openBookDetails(bookId);
        });
    });
}

// Открытие деталей книги
function openBookDetails(bookId) {
    const book = booksData.find(b => b.id == bookId);
    if (!book) return;
    
    currentBookId = bookId;
    fillBookDetailsModal(book);
    openModal('book-details-modal');
}

function openEditBookModal() {
    const book = booksData.find(b => b.id == currentBookId);
    if (!book) return;
    
    fillEditBookModal(book);
    closeModal('book-details-modal');
    openModal('edit-book-modal');
}

// Сохранение изменений
function saveBookChanges() {
    const book = booksData.find(b => b.id == currentBookId);
    if (!book) return;
    
    const modal = document.getElementById('edit-book-modal');
    book.title = modal.querySelector('.book-title-input').value;
    book.author = modal.querySelector('.book-author-input').value;
    book.publisher = modal.querySelector('.publisher-input').value;
    book.year = modal.querySelector('.year-input').value;
    book.pages = modal.querySelector('.pages-input').value;
    book.genre = modal.querySelector('.genre-select').value;
    book.description = modal.querySelector('.description-textarea').value;
    
    // Обновляем изображение если было изменено
    const fileInput = modal.querySelector('#edit-file-input');
    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            book.image = e.target.result;
            renderBooks(booksData);
            setupBookEvents();
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
    
    // Обновляем представление
    renderBooks(booksData);
    setupBookEvents();
    
    closeModal('edit-book-modal');
    openBookDetails(currentBookId);
}

function addToLibrary(bookId) {
    const book = booksData.find(b => b.id == bookId);
    if (!book) return;
    
    let myLibrary = JSON.parse(localStorage.getItem('myLibrary')) || [];
    if (!myLibrary.some(b => b.id === book.id)) {
        myLibrary.push(book);
        localStorage.setItem('myLibrary', JSON.stringify(myLibrary));
        alert('Книга добавлена в вашу библиотеку!');
    } else {
        alert('Эта книга уже есть в вашей библиотеке!');
    }
}

// Инициализация фильтров
function initFilters() {
    document.querySelectorAll('.filter').forEach(filter => {
        const dropdown = filter.querySelector('.dropdown');
        
        filter.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.filter .dropdown.open').forEach(el => {
                if (el !== dropdown) el.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });

        dropdown.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                filter.querySelector('span').textContent = e.target.textContent;
                filter.dataset.selected = e.target.dataset.value;
                dropdown.classList.remove('open');
                // Здесь будет применение фильтра
            }
        });
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.open').forEach(el => {
            el.classList.remove('open');
        });
    });
}

// Инициализация поиска
function initSearch() {
    const searchInput = document.querySelector('.search input');
    const clearButton = document.querySelector('.search .clear');
    const searchElement = document.querySelector('.search');
    
    if (!searchInput || !clearButton) return;
    
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim()) {
            clearButton.style.display = 'flex';
            searchElement.classList.add('has-text');
        } else {
            clearButton.style.display = 'none';
            searchElement.classList.remove('has-text');
        }
    });

    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        clearButton.style.display = 'none';
        searchElement.classList.remove('has-text');
        searchInput.focus();
    });

    searchInput.addEventListener('focus', () => {
        searchElement.classList.add('focused');
    });

    searchInput.addEventListener('blur', () => {
        if (!searchInput.value.trim()) {
            searchElement.classList.remove('focused');
        }
    });
}

// Drag and Drop для загрузки изображений
function initDragAndDrop(dropAreaId, previewId) {
    const dropArea = document.getElementById(dropAreaId);
    if (!dropArea || dropArea.dataset.initialized) return;
    
    const fileInput = dropArea.querySelector('.file-input');
    const previewImage = document.getElementById(previewId);
    const previewContainer = dropArea.querySelector('.preview-container');
    const uploadContent = dropArea.querySelector('.content');
    const imagePlaceholder = dropArea.querySelector('.image-placeholder');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => highlight(dropArea), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => unhighlight(dropArea), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(element) {
        element.classList.add('dragging');
    }

    function unhighlight(element) {
        element.classList.remove('dragging');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            fileInput.files = files;
            handleFiles(files);
        }
    }

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            
            if (file.type.match('image.*')) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    if (previewImage) previewImage.src = e.target.result;
                    if (previewContainer) previewContainer.style.display = 'flex';
                    if (uploadContent) uploadContent.style.display = 'none';
                    if (imagePlaceholder) imagePlaceholder.style.display = 'none';
                    dropArea.classList.add('has-image');
                };
                
                reader.readAsDataURL(file);
            } else {
                alert('Пожалуйста, выберите файл изображения!');
            }
        }
    }
    dropArea.dataset.initialized = "true";
}