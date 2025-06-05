import { openModal, closeModal } from './common.js';

// Инициализация при загрузке страницы
export function initCatalog() {
    if (document.querySelector('.books')) {
        loadBooks();
        initFilters();
        initSearch();
    }

    // Используем делегирование событий для динамических элементов
    document.addEventListener('click', function(e) {
        // Обработка кнопки создания книги
        if (e.target.closest('#create-book-btn')) {
            openModal('create-book-modal');
        }
        
        // Обработка кнопки редактирования
        if (e.target.closest('#edit-book')) {
            closeModal('book-details-modal');
            openModal('edit-book-modal');
        }
        
        // Обработка кнопки удаления
        if (e.target.closest('#delete-book')) {
            if (confirm('Вы уверены, что хотите удалить эту книгу?')) {
                closeModal('book-details-modal');
            }
        }
        
        // Обработка отмены редактирования
        if (e.target.closest('#cancel-edit')) {
            closeModal('edit-book-modal');
            openModal('book-details-modal');
        }

        if (e.target.closest('#save-changes')) {
            closeModal('edit-book-modal');
        }
    });

    // Инициализация Drag and Drop
    initDragAndDrop('drop-area', 'preview-image');
    initDragAndDrop('edit-drop-area', 'edit-preview-image');
    setTimeout(() => {
        initDragAndDrop('edit-drop-area', 'edit-preview-image');
    }, 0);
};

// Динамическая загрузка книг
async function loadBooks() {
    try {
        const response = await fetch('data/books.json');
        const books = await response.json();
        renderBooks(books);
        setupBookEvents();
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
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
    openModal('book-details-modal');
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