import { openModal, closeModal, api, clearError, showError } from './common.js';
import { initAutocomplete, getAuthorsGenres } from './autocomplete.js';

const MAIN_CONTAINER = document.getElementById('main-container');

// Инициализация при загрузке страницы
export function initCatalog(signal, isLibrary) {
    if (document.querySelector('.books')) {
        loadBooks();
        initFilters(signal);
        initSearch(signal);
    }

    const isCatalogPage = window.location.hash.includes('/catalog');

    // Используем делегирование событий для динамических элементов
    document.addEventListener('click', function(e) {
        // Обработка кнопки создания книги
        if (e.target.closest('#create-book-btn') && isLibrary) {
            openModal('create-book-modal');
        }
        
        // Обработка кнопки редактирования
        if (e.target.closest('#edit-book') && isLibrary) {
            openEditBookModal();
        }
        
        // Обработка кнопки удаления
        if (e.target.closest('#delete-book') && isLibrary) {
            if (confirm('Вы уверены, что хотите удалить эту книгу?')) {
                deleteBook(currentBookId);
                closeModal('book-details-modal');
            }
        }
        
        // Обработка отмены редактирования
        if (e.target.closest('#cancel-edit') && isLibrary) {
            closeModal('edit-book-modal');
            openModal('book-details-modal');
        }

        if (e.target.closest('#save-changes') && isLibrary) {
            saveBookChanges();
        }

        if (e.target.closest('#create-book-submit') && isLibrary) {
            createNewBook();
            openModal('create-book-modal');
        }

        if (e.target.closest('#send-to-catalog') && isLibrary) {
            sendToCatalog(currentBookId);
            closeModal('book-details-modal');
        }

        if (e.target.closest('#add-to-library') && !isLibrary) {
            addToLibraryHandler();
            closeModal('book-details-modal');
        }
    }, { signal });
    // Инициализация Drag and Drop
    initDragAndDrop('drop-area', 'preview-image');
    initDragAndDrop('edit-drop-area', 'edit-preview-image');

    MAIN_CONTAINER.addEventListener('click', handleBookClick, { signal });
    initAutocompleteFields();
};

let booksData = []; // Глобальная переменная для хранения книг
let currentBookId = null; // ID текущей книги

function handleBookClick(e) {
    const card = e.target.closest('.book-card');
    if (card) {
        const bookId = card.dataset.id;
        openBookDetails(bookId);
    }
}

// Динамическая загрузка книг
async function loadBooks() {
    try {
        const isLibraryPage = window.location.hash.includes('/my-library');
        const filters = getCurrentFilters();
        const page = currentPage;

        const response = await api.getBooks({ ...filters, library: isLibraryPage }, page);
        booksData = response.books;
        renderBooks(booksData);
        renderPagination(response.total, response.perPage, response.page);
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        alert(error.message);
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
    const img = modal.querySelector('#details-preview-image');
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
    const isLoggedIn = !!JSON.parse(localStorage.getItem('user'));
    
    if (editBtn) editBtn.style.display = isCatalogPage ? 'none' : 'inline-block';
    if (deleteBtn) deleteBtn.style.display = isCatalogPage ? 'none' : 'inline-block';
    if (sendToCatalogBtn) sendToCatalogBtn.style.display = isCatalogPage ? 'none' : 'inline-block';
    if (addToLibraryBtn) addToLibraryBtn.style.display = isCatalogPage && isLoggedIn ? 'inline-block' : 'none';
}

// Заполнение модального окна редактирования
function fillEditBookModal(book) {
    const modal = document.getElementById('edit-book-modal');
    modal.querySelector('.book-title-input').value = book.title;
    modal.querySelector('.book-author-input').value = book.author;
    modal.querySelector('.publisher-input').value = book.publisher || '';
    modal.querySelector('.year-input').value = book.year || '';
    modal.querySelector('.pages-input').value = book.pages || '';
    modal.querySelector('.genre-input').value = book.genre || '';
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

async function initAutocompleteFields() {
    try {
        const { authors, genres } = await getAuthorsGenres();
        
        // Для формы создания
        initField('create-author', authors);
        initField('create-genre', genres);
        
        // Для формы редактирования
        initField('edit-author', authors);
        initField('edit-genre', genres);
        
    } catch (error) {
        console.error('Ошибка инициализации автодополнения:', error);
    }
}

// Вспомогательная функция для инициализации поля
function initField(fieldId, data) {
    const input = document.getElementById(fieldId);
    if (input && data) {
        initAutocomplete(input, data);
    }
}

let currentPage = 1;

function renderPagination(total, perPage, current) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    const totalPages = Math.ceil(total / perPage);
    
    const createButton = (text, page, disabled = false) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', () => {
            currentPage = page;
            loadBooks();
        });
        return button;
    };

    pagination.appendChild(createButton('<<', 1, current === 1));
    pagination.appendChild(createButton('<', current - 1, current === 1));
    
    for (let i = 1; i <= totalPages; i++) {
        const button = createButton(i, i);
        if (i === current) button.classList.add('active');
        pagination.appendChild(button);
    }
    
    pagination.appendChild(createButton('>', current + 1, current === totalPages));
    pagination.appendChild(createButton('>>', totalPages, current === totalPages));
}

function openBookDetails(bookId) {
    const book = booksData.find(b => b.id == bookId);
    if (!book) return;
    
    currentBookId = bookId;
    fillBookDetailsModal(book);
    
    // Проверка прав доступа
    const user = JSON.parse(localStorage.getItem('user'));
    const canEdit = user && user.id == book.created_by;
    if (document.getElementById('edit-book')) {
        document.getElementById('edit-book').style.display = 
            canEdit ? 'inline-block' : 'none';
    }
    if (document.getElementById('send-to-catalog')) {
        document.getElementById('send-to-catalog').style.display = 
            canEdit ? 'inline-block' : 'none';
    }
    openModal('book-details-modal');
}

function openEditBookModal() {
    const book = booksData.find(b => b.id == currentBookId);
    if (!book) return;
    
    fillEditBookModal(book);
    closeModal('book-details-modal');
    openModal('edit-book-modal');
}

function validateBookForm(bookData, formType) {
    let isValid = true;
    
    clearError(`${formType}-title`);
    clearError(`${formType}-author`);
    clearError(`${formType}-year`);
    clearError(`${formType}-pages`);

    if (!bookData.title.trim()) {
        showError(`${formType}-title`, 'Название книги обязательно');
        isValid = false;
    }
    if (!bookData.author.trim()) {
        showError(`${formType}-author`, 'Автор книги обязателен');
        isValid = false;
    }
    
    if (bookData.year && (isNaN(bookData.year) || bookData.year < 0 || bookData.year > new Date().getFullYear())) {
        showError(`${formType}-year`, 'Некорректный год издания');
        isValid = false;
    }
    
    if (bookData.pages && (isNaN(bookData.pages) || bookData.pages <= 0)) {
        showError(`${formType}-pages`, 'Некорректное количество страниц');
        isValid = false;
    }
    
    return isValid;
}

async function createNewBook() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = dropArea.querySelector('.file-input');
    
    let coverUrl = '';
    if (fileInput.files.length > 0) {
        try {
            const result = await api.uploadFile(fileInput.files[0], 'cover');
            coverUrl = result.cover;
        } catch (error) {
            console.error('Ошибка загрузки обложки:', error);
            alert('Не удалось загрузить обложку: ' + error.message);
            return;
        }
    }
    
    const bookData = {
        title: document.getElementById('create-title').value,
        author: document.getElementById('create-author').value,
        publisher: document.getElementById('create-publisher').value,
        year: document.getElementById('create-year').value,
        pages: document.getElementById('create-pages').value,
        genre: document.getElementById('create-genre').value,
        description: document.getElementById('create-description').value,
        image: coverUrl,
        is_public: false // Книга не публичная по умолчанию
    };

    if (!validateBookForm(bookData, 'create')) {
        return;
    }
    
    try {
        const newBook = await api.addBook(bookData);
        booksData.push(newBook);
        renderBooks(booksData);
        closeModal('create-book-modal');
        alert('Книга успешно создана и добавлена в вашу библиотеку!');
    } catch (error) {
        alert('Ошибка создания книги: ' + error.message);
    }
}

async function saveBookChanges() {
    const modal = document.getElementById('edit-book-modal');
    const bookId = currentBookId;
    
    const bookData = {
        title: document.getElementById('edit-title').value,
        author: document.getElementById('edit-author').value,
        publisher: document.getElementById('edit-publisher').value,
        year: document.getElementById('edit-year').value,
        pages: document.getElementById('edit-pages').value,
        genre: document.getElementById('edit-genre').value,
        description: document.getElementById('edit-description').value
    };

    if (!validateBookForm(bookData, 'edit')) {
        return;
    }

    const fileInput = modal.querySelector('#edit-file-input');
    if (fileInput.files.length > 0) {
        try {
            const result = await api.uploadFile(fileInput.files[0], 'cover');
            bookData.image = result.cover;
        } catch (error) {
            alert('Не удалось загрузить обложку: ' + error.message);
            return;
        }
    }

    try {
        // Отправляем изменения на сервер
        const updatedBook = await api.updateBook(bookId, bookData);
        
        // Обновляем локальные данные
        const bookIndex = booksData.findIndex(b => b.id == bookId);
        if (bookIndex !== -1) {
            booksData[bookIndex] = updatedBook;
        }
        
        renderBooks(booksData);
        closeModal('edit-book-modal');
        openBookDetails(bookId);
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
    }
}

async function sendToCatalog(currentBookId) {
    await api.updateBook(currentBookId, { is_public: true });
    const book = booksData.find(b => b.id == currentBookId);
    if (book) book.is_public = true;
    alert('Книга опубликована в каталоге!');
}

async function addToLibraryHandler() {
    try {
        await api.addToLibrary(currentBookId);
        alert('Книга добавлена в библиотеку!');
    } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message);
    }
}

async function deleteBook(bookId) {
    try {
        await api.deleteBook(bookId);
        booksData = booksData.filter(book => book.id !== bookId);
        renderBooks(booksData);
        closeModal('book-details-modal');
        alert('Книга успешно удалена');
    } catch (error) {
        alert(error.message);
    }
}

function getCurrentFilters() {
    const author = document.querySelector('.filter[data-filter="author"] span').textContent;
    const genre = document.querySelector('.filter[data-filter="genre"] span').textContent;
    const year = document.querySelector('.filter[data-filter="edition"] span').textContent;
    const search = document.querySelector('.search input').value;
    
    return {
        author: author === 'Автор' ? '' : author,
        genre: genre === 'Жанр' ? '' : genre,
        year: year === 'Издание' ? '' : year,
        search: search
    };
}

async function initFilters(signal) {
    try {
        const filters = await api.getFilters();
        
        // Авторы
        const authorFilter = document.querySelector('.filter[data-filter="author"] .dropdown');
        authorFilter.innerHTML = '<li data-value="">Автор</li>';
        filters.authors.forEach(author => {
            authorFilter.innerHTML += `<li data-value="${author}">${author}</li>`;
        });
        
        // Жанры
        const genreFilter = document.querySelector('.filter[data-filter="genre"] .dropdown');
        genreFilter.innerHTML = '<li data-value="">Жанр</li>';
        filters.genres.forEach(genre => {
            genreFilter.innerHTML += `<li data-value="${genre}">${genre}</li>`;
        });
        
        // Годы
        const yearFilter = document.querySelector('.filter[data-filter="edition"] .dropdown');
        yearFilter.innerHTML = '<li data-value="">Издание</li>';
        filters.years.forEach(year => {
            yearFilter.innerHTML += `<li data-value="${year}">${year}</li>`;
        });

        document.querySelectorAll('.filter').forEach(filter => {
            const dropdown = filter.querySelector('.dropdown');
            filter.addEventListener('click', function() {
                dropdown.style.display = 
                    dropdown.style.display === 'block' ? 'none' : 'block';
            }, { signal });
            
            dropdown.querySelectorAll('li').forEach(li => {
                li.addEventListener('click', function() {
                    filter.querySelector('span').textContent = this.textContent;
                    currentPage = 1;
                    loadBooks();
                    document.querySelectorAll('.dropdown').forEach(dd => dd.style.display = 'none');
                    console.log("a");
                }, { signal });
            });
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.filter')) {
                document.querySelectorAll('.dropdown').forEach(dd => {
                    dd.style.display = 'none';
                });
            }
        }, { signal });
        
    } catch (error) {
        console.error('Ошибка загрузки фильтров:', error);
    }
}

function initSearch(signal) {
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
    }, { signal });

    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        clearButton.style.display = 'none';
        searchElement.classList.remove('has-text');
        searchInput.focus();
    }, { signal });

    searchInput.addEventListener('focus', () => {
        searchElement.classList.add('focused');
    }, { signal });

    searchInput.addEventListener('blur', () => {
        if (!searchInput.value.trim()) {
            searchElement.classList.remove('focused');
        }
    }, { signal });

    document.querySelector('.search-btn')?.addEventListener('click', () => {
        currentPage = 1;
        loadBooks();
    }, { signal });
    
    document.querySelector('.search input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            loadBooks();
        }
    }, { signal });
}

function initDragAndDrop(dropAreaId, previewId) {
    const dropArea = document.getElementById(dropAreaId);
    if (!dropArea || dropArea.dataset.initialized) return;
    
    const fileInput = dropArea.querySelector('.file-input');
    const previewImage = document.getElementById(previewId);
    const previewContainer = dropArea.querySelector('.preview-container');
    const uploadContent = dropArea.querySelector('.content');
    const imagePlaceholder = dropArea.querySelector('.image-placeholder');

    // Добавляем обработчик клика на всю область
    dropArea.addEventListener('click', function(e) {
        console.log(e.target);
        // Клик по самой области загрузки
        if (e.target === dropArea || e.target === previewImage || 
            e.target === previewContainer || e.target === imagePlaceholder || uploadContent) {
            fileInput.click();
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => highlight(dropArea));
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => unhighlight(dropArea));
    });

    dropArea.addEventListener('drop', handleDrop);

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
    
    // Инициализация существующего изображения
    if (previewImage && previewImage.src && previewImage.src !== window.location.href) {
        if (previewContainer) previewContainer.style.display = 'flex';
        if (uploadContent) uploadContent.style.display = 'none';
        if (imagePlaceholder) imagePlaceholder.style.display = 'none';
        dropArea.classList.add('has-image');
    }
    
    dropArea.dataset.initialized = "true";
}