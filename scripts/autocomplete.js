import { debounce } from './common.js';

export function initAutocomplete(inputElement, data) {
    // Создаем контейнер для выпадающего списка
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown scrollable-fields';
    inputElement.parentNode.appendChild(dropdown);
    
    // Обработчик ввода текста
    inputElement.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        dropdown.innerHTML = '';
        
        if (!value) return;
        
        // Фильтрация подходящих вариантов
        const filtered = data.filter(item => 
            item.toLowerCase().includes(value)
        );
        
        // Показ первых 5 результатов
        filtered.slice(0, 5).forEach(item => {
            const option = document.createElement('div');
            option.className = 'autocomplete-option';
            option.textContent = item;
            option.addEventListener('click', () => {
                inputElement.value = item;
                dropdown.innerHTML = '';
            });
            dropdown.appendChild(option);
        });
    });
    
    // Скрываем выпадающий список при потере фокуса
    inputElement.addEventListener('blur', () => {
        setTimeout(() => {
            //dropdown.innerHTML = '';
        }, 200);
    });
}

export function initSearchAutocomplete(inputElement, getFilters) {
    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    inputElement.parentNode.appendChild(dropdown);
    
    let controller = null; // Для отмены запросов

    // Обработчик с debounce и отменой запросов
    const handleInput = debounce(async function() {
        const value = this.value.trim();
        dropdown.innerHTML = '';
        
        if (!value) return;
        
        // Отменяем предыдущий запрос
        if (controller) controller.abort();
        controller = new AbortController();
        
        try {
            const filters = getFilters();
            
            const params = new URLSearchParams({
                action: 'search_suggestions',
                query: value,
                ...filters
            });

            const response = await fetch(
                `api/ajax.php?${params.toString()}`,
                { signal: controller.signal }
            );

            const suggestions = await response.json();
            
            // Проверяем актуальность запроса
            if (inputElement.value.trim() !== value) return;
            
            suggestions.forEach(title => {
                const option = document.createElement('div');
                option.className = 'autocomplete-option';
                option.textContent = title;
                option.addEventListener('click', () => {
                    inputElement.value = title;
                    dropdown.innerHTML = '';
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                });
                dropdown.appendChild(option);
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Ошибка получения подсказок:', error);
            }
        } finally {
            controller = null;
        }
    }, 300);

    inputElement.addEventListener('input', handleInput);
    
    inputElement.addEventListener('blur', () => {
        setTimeout(() => {
            dropdown.innerHTML = '';
            // Отменяем запрос при потере фокуса
            if (controller) {
                controller.abort();
                controller = null;
            }
        }, 200);
    });
}

export async function getAuthorsGenres() {
    try {
        const response = await fetch('api/ajax.php?action=get_filters');
        const data = await response.json();
        return {
            authors: data.authors || [],
            genres: data.genres || []
        };
    } catch (error) {
        console.error('Ошибка загрузки фильтров:', error);
        return { authors: [], genres: [] };
    }
}