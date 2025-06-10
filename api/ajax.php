<?php
require_once 'config.php';

$db = getDB();
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

if ($action === 'upload_avatar' || $action === 'upload_cover') {
    try {
        $type = str_replace('upload_', '', $action);
        $filename = handleUpload($type);
        echo json_encode([$type => 'uploads/' . $type . 's/' . $filename]);
        exit;
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
        exit;
    }
}

// Обработка JSON-запросов
try {
    switch ($action) {
        case 'login':
            handleLogin($db, $input);
            break;
            
        case 'register':
            handleRegister($db, $input);
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        case 'get_books':
            handleGetBooks($db, $_GET);
            break;
            
        case 'add_book':
            handleAddBook($db, $input);
            break;
            
        case 'update_book':
            handleUpdateBook($db, $input);
            break;
            
        case 'delete_book':
            handleDeleteBook($db, $input);
            break;
            
        case 'add_to_library':
            handleAddToLibrary($db, $input);
            break;
            
        case 'get_profile':
            handleGetProfile($db);
            break;
            
        case 'update_profile':
            handleUpdateProfile($db, $input);
            break;
            
        case 'change_password':
            handleChangePassword($db, $input);
            break;
            
        case 'delete_account':
            handleDeleteAccount($db);
            break;
            
        case 'get_filters':
            handleGetFilters($db);
            break;

        case 'search_suggestions':
            $filters = [
                'author' => $_GET['author'] ?? '',
                'genre' => $_GET['genre'] ?? '',
                'year' => $_GET['year'] ?? ''
            ];
            handleSearchSuggestions($db, $_GET['query'], $filters);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

// ======================== ФУНКЦИИ ОБРАБОТКИ ========================

function handleUpload($type) {
    $validTypes = ['avatar', 'cover'];
    if (!in_array($type, $validTypes)) {
        throw new Exception('Invalid upload type');
    }
    
    $uploadDir = __DIR__ . '/../uploads/' . $type . 's/';
    
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $file = $_FILES[$type];
    
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '.' . $ext;
    $target = $uploadDir . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $target)) {
        return $filename;
    }
    throw new Exception('File upload failed');
}

function handleLogin($db, $data) {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    $result = pg_query_params($db, 
        "SELECT id, username, name, email, avatar FROM users 
         WHERE username = $1 AND password = crypt($2, password)",
        [$username, $password]
    );
    
    $user = pg_fetch_assoc($result);
    if (!$user) {
        throw new Exception('Invalid credentials');
    }
    
    $_SESSION['user_id'] = $user['id'];
    echo json_encode($user);
}

function handleRegister($db, $data) {
    if (empty($data['username'])) {
        throw new Exception('Логин обязателен');
    }
    if (empty($data['name'])) {
        throw new Exception('Имя обязательно');
    }
    if (empty($data['password'])) {
        throw new Exception('Пароль обязателен');
    }
    if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Некорректный email');
    }

    $username = $data['username'];
    $name = $data['name'];
    $password = $data['password'];
    $email = $data['email'];
    
    // Проверка уникальности
    $result = pg_query_params($db, 
        "SELECT id FROM users WHERE username = $1 OR email = $2",
        [$username, $email]
    );
    
    if (pg_num_rows($result) > 0) {
        throw new Exception('Username or email already exists');
    }
    
    // Создание пользователя
    $result = pg_query_params($db,
        "INSERT INTO users (username, name, password, email) 
         VALUES ($1, $2, crypt($3, gen_salt('bf')), $4)
         RETURNING id, username, name, email, avatar",
        [$username, $name, $password, $email]
    );
    
    $user = pg_fetch_assoc($result);
    if (!$user) {
        throw new Exception('Registration failed');
    }
    
    $_SESSION['user_id'] = $user['id'];
    echo json_encode($user);
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true]);
}

function handleGetProfile($db) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    $result = pg_query_params($db, 
        "SELECT id, username, name, email, avatar, birthdate, gender 
         FROM users WHERE id = $1",
        [$user_id]
    );
    
    $profile = pg_fetch_assoc($result);
    
    if (!$profile) {
        throw new Exception('Profile not found');
    }

    // Рассчитываем возраст
    if ($profile['birthdate']) {
        $birthdate = new DateTime($profile['birthdate']);
        $today = new DateTime();
        $age = $today->diff($birthdate)->y;
        $profile['age'] = $age;
    } else {
        $profile['age'] = null;
    }
    
    echo json_encode($profile);
}

function handleUpdateProfile($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');

    if (isset($data['username']) && empty(trim($data['username']))) {
        throw new Exception('Логин обязателен');
    }
    if (isset($data['name']) && empty(trim($data['name']))) {
        throw new Exception('Имя обязательно');
    }
    if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Некорректный email');
    }
    if (isset($data['birthdate']) && $data['birthdate'] !== '' && 
        !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['birthdate'])) {
        throw new Exception('Некорректная дата рождения');
    }
    
    // Поддерживаемые поля с преобразованием
    $fieldMap = [
        'name' => 'name',
        'username' => 'username',
        'email' => 'email',
        'avatar' => 'avatar',
        'birthdate' => 'birthdate',
        'gender' => 'gender'
    ];
    
    $updates = [];
    $params = [];
    
    foreach ($fieldMap as $field => $dbField) {
        if (isset($data[$field])) {
            // Преобразование даты
            if ($field === 'birthdate' && is_numeric($data[$field])) {
                $birthYear = (int)$data[$field];
                $currentYear = date('Y');
                $birthdate = ($currentYear - $birthYear) . '-01-01'; // Примерная дата
                $updates[] = "$dbField = $" . (count($params) + 1);
                $params[] = $birthdate;
            } else {
                $updates[] = "$dbField = $" . (count($params) + 1);
                $params[] = $data[$field];
            }
        }
    }
    
    if (empty($updates)) {
        throw new Exception('No fields to update');
    }
    
    $params[] = $user_id;
    
    $query = "UPDATE users SET " . implode(', ', $updates) . " 
              WHERE id = $" . count($params) . " 
              RETURNING id, username, name, email, avatar, 
                        EXTRACT(YEAR FROM AGE(birthdate))::int AS age, 
                        gender";
    
    $result = pg_query_params($db, $query, $params);
    $profile = pg_fetch_assoc($result);
    
    if (!$profile) {
        throw new Exception('Update failed');
    }
    
    echo json_encode($profile);
}

function handleChangePassword($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    $oldPassword = $data['old_password'] ?? '';
    $newPassword = $data['new_password'] ?? '';
    
    if (!$oldPassword || !$newPassword) {
        throw new Exception('Both passwords are required');
    }
    
    // Проверка старого пароля
    $result = pg_query_params($db,
        "SELECT id FROM users 
         WHERE id = $1 AND password = crypt($2, password)",
        [$user_id, $oldPassword]
    );
    
    if (!pg_num_rows($result)) {
        throw new Exception('Old password is incorrect');
    }
    
    // Обновление пароля
    $result = pg_query_params($db,
        "UPDATE users SET password = crypt($1, gen_salt('bf')) 
         WHERE id = $2",
        [$newPassword, $user_id]
    );
    
    if (!$result) {
        throw new Exception('Password update failed');
    }
    
    echo json_encode(['success' => true]);
}

function handleDeleteAccount($db) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    // Начинаем транзакцию
    pg_query($db, "BEGIN");
    
    try {
        // Удаляем книги пользователя
        pg_query_params($db,
            "DELETE FROM books WHERE created_by = $1",
            [$user_id]
        );
        
        // Удаляем из библиотек
        pg_query_params($db,
            "DELETE FROM user_library WHERE user_id = $1",
            [$user_id]
        );
        
        // Удаляем пользователя
        pg_query_params($db,
            "DELETE FROM users WHERE id = $1",
            [$user_id]
        );
        
        pg_query($db, "COMMIT");
        session_destroy();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        pg_query($db, "ROLLBACK");
        throw new Exception('Account deletion failed');
    }
}

function validateBookData($data) {
    if (isset($data['title']) && empty($data['title'])) {
        throw new Exception('Название книги обязательно');
    }
    if (isset($data['author']) && empty($data['author'])) {
        throw new Exception('Автор книги обязателен');
    }
    
    if (isset($data['year']) && $data['year'] !== '' && 
        (!is_numeric($data['year']) || (int)$data['year'] < 0 || (int)$data['year'] > date('Y'))) {
        throw new Exception('Некорректный год издания');
    }
    
    if (isset($data['pages']) && $data['pages'] !== '' && 
        (!is_numeric($data['pages']) || (int)$data['pages'] <= 0)) {
        throw new Exception('Некорректное количество страниц');
    }
}

function handleGetBooks($db, $params) {
    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = 10;
    $offset = ($page - 1) * $perPage;
    
    $where = [];
    $queryParams = [];
    $isLibrary = isset($params['library']) && $params['library'] === 'true';

    if ($isLibrary) {
        $user_id = $_SESSION['user_id'] ?? 0;
        if (!$user_id) throw new Exception('Not authorized');
        
        $where[] = "EXISTS (SELECT 1 FROM user_library ul WHERE ul.book_id = b.id AND ul.user_id = $1)";
        $queryParams[] = $user_id;
    } else {
        $where[] = "b.is_public = TRUE";
    }

    // Фильтрация
    if (!empty($params['author'])) {
        $where[] = "b.author = $" . (count($queryParams) + 1);
        $queryParams[] = $params['author'];
    }
    
    if (!empty($params['genre'])) {
        $where[] = "b.genre = $" . (count($queryParams) + 1);
        $queryParams[] = $params['genre'];
    }
    
    if (!empty($params['year'])) {
        $where[] = "b.year = $" . (count($queryParams) + 1);
        $queryParams[] = $params['year'];
    }
    
    if (!empty($params['search'])) {
        $where[] = "(b.title ILIKE $" . (count($queryParams) + 1) . " OR b.author ILIKE $" . (count($queryParams) + 1) . ")";
        $queryParams[] = '%' . $params['search'] . '%';
    }
    
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Основной запрос книг
    $query = "SELECT b.* FROM books b $whereClause ORDER BY b.id LIMIT $perPage OFFSET $offset";
    
    if (!empty($queryParams)) {
        $result = pg_query_params($db, $query, $queryParams);
    } else {
        $result = pg_query($db, $query);
    }
    
    if (!$result) {
        throw new Exception(pg_last_error($db));
    }
    
    $books = [];
    while ($row = pg_fetch_assoc($result)) {
        $books[] = $row;
    }
    
    // Получение общего количества
    $countQuery = "SELECT COUNT(*) FROM books b $whereClause";
    $countResult = pg_query_params($db, $countQuery, $queryParams);
    $total = pg_fetch_result($countResult, 0, 0);
    
    echo json_encode([
        'books' => $books,
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage
    ]);
}

function handleAddBook($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    validateBookData($data);
    
    $defaultImages = [
        'src/book_black.png',
        'src/book_blue.png',
        'src/book_green.png',
        'src/book_oran.png',
        'src/book_purple.png',
        'src/book_red.png',
        'src/book_yellow.png'
    ];
    
    // Если изображение не указано, выбираем случайное из стандартных
    if (empty($data['image'])) {
        $randomIndex = array_rand($defaultImages);
        $data['image'] = $defaultImages[$randomIndex];
    }

    // Формируем поля и значения
    $fields = ['title', 'author', 'publisher', 'year', 'pages', 'genre', 'description', 'image', 'is_public', 'created_by'];
    $values = [];
    
    foreach ($fields as $field) {
        if ($field === 'created_by') {
            $values[] = $user_id;
        } elseif ($field === 'is_public') {
            $values[] = isset($data[$field]) && $data[$field] ? 't' : 'f';
        } else {
            $value = $data[$field] ?? null;
            
            if (in_array($field, ['year', 'pages'])) {
                if ($value === '' || $value === null) {
                    $values[] = null;
                } 
                elseif (is_numeric($value)) {
                    $values[] = (int)$value;
                } 
                else {
                    throw new Exception("Некорректное значение для поля $field");
                }
            } 
            else {
                $values[] = $value;
            }
        }
    }
    
    // Формируем плейсхолдеры
    $placeholders = array_map(function($i) {
        return '$' . ($i + 1);
    }, array_keys($values));
    
    $query = "INSERT INTO books (" . implode(',', $fields) . ") 
              VALUES (" . implode(',', $placeholders) . ") 
              RETURNING *";
              
    $result = pg_query_params($db, $query, $values);
    if (!$result) {
        throw new Exception(pg_last_error($db));
    }
    
    $book = pg_fetch_assoc($result);
    
    if (!$book) {
        throw new Exception('Failed to add book: ' . pg_last_error($db));
    }
    
    // Автоматически добавляем книгу в библиотеку пользователя
    pg_query_params($db,
        "INSERT INTO user_library (user_id, book_id) VALUES ($1, $2)",
        [$user_id, $book['id']]
    );
    
    echo json_encode($book);
}

function handleUpdateBook($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    if (empty($data['id'])) {
        throw new Exception('Book ID is required');
    }

    validateBookData($data);
    
    $fields = [
        'title', 'author', 'publisher', 'year', 'pages', 
        'genre', 'description', 'image', 'is_public'
    ];
    
    $updates = [];
    $params = [$data['id']];
    
    foreach ($fields as $field) {
        if (array_key_exists($field, $data)) {
            $value = $data[$field];
            
            if (in_array($field, ['year', 'pages'])) {
                if ($value === '' || $value === null) {
                    $updates[] = "$field = $" . (count($params) + 1);
                    $params[] = null;
                } 
                elseif (is_numeric($value)) {
                    $updates[] = "$field = $" . (count($params) + 1);
                    $params[] = (int)$value;
                } 
                else {
                    continue;
                }
            }
            elseif ($field === 'is_public') {
                $updates[] = "$field = $" . (count($params) + 1);
                $params[] = $value ? 't' : 'f';
            }
            else {
                $updates[] = "$field = $" . (count($params) + 1);
                $params[] = $value;
            }
        }
    }
    
    if (empty($updates)) {
        throw new Exception('No fields to update');
    }
    
    $params[] = $user_id;
    $userParamIndex = count($params);
    
    $query = "UPDATE books SET " . implode(', ', $updates) . " 
              WHERE id = $1 AND created_by = $$userParamIndex 
              RETURNING *";
    
    $result = pg_query_params($db, $query, $params);
    if (!$result) {
        throw new Exception('Update failed: ' . pg_last_error($db));
    }
    
    $book = pg_fetch_assoc($result);
    
    if (!$book) {
        throw new Exception('Book not found or you dont have permission');
    }
    
    echo json_encode($book);
}

function handleDeleteBook($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    if (empty($data['id'])) {
        throw new Exception('Book ID is required');
    }
    
    $result = pg_query_params($db, 
        "DELETE FROM user_library 
         WHERE user_id = $1 AND book_id = $2",
        [$user_id, $data['id']]
    );
    
    if (!$result) {
        throw new Exception('Failed to remove from library');
    }
    
    echo json_encode(['success' => true]);
}

function handleAddToLibrary($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    if (empty($data['book_id'])) {
        throw new Exception('Book ID is required');
    }
    
    // Проверяем, есть ли уже книга в библиотеке
    $result = pg_query_params($db, 
        "SELECT 1 FROM user_library 
         WHERE user_id = $1 AND book_id = $2",
        [$user_id, $data['book_id']]
    );
    
    if (pg_num_rows($result)) {
        throw new Exception('Book already in library');
    }
    
    $result = pg_query_params($db, 
        "INSERT INTO user_library (user_id, book_id) 
         VALUES ($1, $2)",
        [$user_id, $data['book_id']]
    );
    
    if (!$result) {
        throw new Exception('Failed to add to library');
    }
    
    echo json_encode(['success' => true]);
}

function handleGetFilters($db) {
    $result = pg_query($db,
        "SELECT 
            (SELECT array_to_json(array_agg(DISTINCT author)) FROM books) AS authors,
            (SELECT array_to_json(array_agg(DISTINCT genre)) FROM books) AS genres,
            (SELECT array_to_json(array_agg(year)) FROM (SELECT DISTINCT year FROM books ORDER BY year DESC) t) AS years"
    );
    
    $filters = pg_fetch_assoc($result);
    
    if (!$filters) {
        throw new Exception('Failed to get filters');
    }
    
    $filters['authors'] = json_decode($filters['authors'], true) ?: [];
    $filters['genres'] = json_decode($filters['genres'], true) ?: [];
    $filters['years'] = json_decode($filters['years'], true) ?: [];

    echo json_encode($filters);
}

function handleSearchSuggestions($db, $query, $filters) {
    $conditions = ["title ILIKE $1"];
    $params = ['%' . $query . '%'];
    $paramIndex = 2;

    // Добавляем условия по фильтрам
    if (!empty($filters['author'])) {
        $conditions[] = "author = $" . $paramIndex++;
        $params[] = $filters['author'];
    }
    
    if (!empty($filters['genre'])) {
        $conditions[] = "genre = $" . $paramIndex++;
        $params[] = $filters['genre'];
    }
    
    if (!empty($filters['year'])) {
        $conditions[] = "year = $" . $paramIndex++;
        $params[] = (int)$filters['year'];
    }

    $whereClause = count($conditions) > 1 ? 
        'WHERE ' . implode(' AND ', $conditions) : 
        'WHERE ' . $conditions[0];

    $query = "SELECT title FROM books 
              $whereClause
              GROUP BY title
              ORDER BY COUNT(*) DESC
              LIMIT 5";

    $result = pg_query_params($db, $query, $params);
    
    $suggestions = [];
    while ($row = pg_fetch_assoc($result)) {
        $suggestions[] = $row['title'];
    }
    
    echo json_encode($suggestions);
}