export function initAutocomplete(inputElement, data) {
    // Создаем контейнер для выпадающего списка
    const dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
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
            dropdown.innerHTML = '';
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