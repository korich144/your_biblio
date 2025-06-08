<?php
require_once 'config.php';

$db = getDB();
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

// Обработка загрузки файлов
if (isset($_FILES['avatar']) || isset($_FILES['cover'])) {
    try {
        if (isset($_FILES['avatar'])) {
            $filename = handleUpload('avatar');
            echo json_encode(['avatar' => 'uploads/avatars/' . $filename]);
        } else {
            $filename = handleUpload('cover');
            echo json_encode(['cover' => 'uploads/covers/' . $filename]);
        }
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
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

// ======================== ФУНКЦИИ ОБРАБОТКИ ========================

function handleUpload($type) {
    $uploadDir = $type === 'avatar' 
        ? __DIR__ . '/../uploads/avatars/' 
        : __DIR__ . '/../uploads/covers/';
    
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $file = $_FILES['file'];
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
    $username = $data['username'] ?? '';
    $name = $data['name'] ?? '';
    $password = $data['password'] ?? '';
    $email = $data['email'] ?? '';
    
    if (!$username || !$name || !$password || !$email) {
        throw new Exception('All fields are required');
    }
    
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
        
        $where[] = "b.id IN (SELECT book_id FROM user_library WHERE user_id = $1)";
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
    
    $required = ['title', 'author'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            throw new Exception("Field $field is required");
        }
    }
    
    $fields = [
        'title', 'author', 'publisher', 'year', 'pages', 
        'genre', 'description', 'image', 'is_public'
    ];
    
    $values = [];
    $params = [];
    
    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $values[] = $data[$field];
            $params[] = '$' . count($values);
        } else {
            $values[] = null;
            $params[] = 'NULL';
        }
    }
    
    $params[] = '$' . (count($values) + 1);
    $values[] = $user_id;
    
    $query = "INSERT INTO books (" . implode(',', $fields) . ", created_by) 
              VALUES (" . implode(',', $params) . ") 
              RETURNING *";
              
    $result = pg_query_params($db, $query, $values);
    $book = pg_fetch_assoc($result);
    
    if (!$book) {
        throw new Exception('Failed to add book');
    }
    
    echo json_encode($book);
}

function handleUpdateBook($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    if (empty($data['id'])) {
        throw new Exception('Book ID is required');
    }
    
    $fields = [
        'title', 'author', 'publisher', 'year', 'pages', 
        'genre', 'description', 'image', 'is_public'
    ];
    
    $updates = [];
    $params = [$data['id']];
    
    foreach ($fields as $field) {
        if (array_key_exists($field, $data)) {
            $updates[] = "$field = $" . (count($params) + 1);
            $params[] = $data[$field];
        }
    }
    
    if (empty($updates)) {
        throw new Exception('No fields to update');
    }
    
    $params[] = $user_id;
    
    $query = "UPDATE books SET " . implode(', ', $updates) . " 
              WHERE id = $1 AND created_by = $" . count($params) . " 
              RETURNING *";
    
    $result = pg_query_params($db, $query, $params);
    $book = pg_fetch_assoc($result);
    
    if (!$book) {
        throw new Exception('Update failed or book not found');
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
        "DELETE FROM books 
         WHERE id = $1 AND created_by = $2 
         RETURNING id",
        [$data['id'], $user_id]
    );
    
    $deleted = pg_fetch_assoc($result);
    
    if (!$deleted) {
        throw new Exception('Delete failed or book not found');
    }
    
    // Также удаляем из библиотек пользователей
    pg_query_params($db,
        "DELETE FROM user_library WHERE book_id = $1",
        [$data['id']]
    );
    
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

function handleGetProfile($db) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    $result = pg_query_params($db, 
        "SELECT id, username, name, email, avatar, 
                EXTRACT(YEAR FROM AGE(birthdate))::int AS age, 
                gender 
         FROM users WHERE id = $1",
        [$user_id]
    );
    
    $profile = pg_fetch_assoc($result);
    
    if (!$profile) {
        throw new Exception('Profile not found');
    }
    
    echo json_encode($profile);
}

function handleUpdateProfile($db, $data) {
    $user_id = $_SESSION['user_id'] ?? 0;
    if (!$user_id) throw new Exception('Not authorized');
    
    $fields = ['name', 'email', 'avatar', 'birthdate', 'gender'];
    $updates = [];
    $params = [];
    
    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = $" . (count($params) + 1);
            $params[] = $data[$field];
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

function handleGetFilters($db) {
    $result = pg_query($db,
        "SELECT 
            (SELECT array_agg(DISTINCT author) FROM books) AS authors,
            (SELECT array_agg(DISTINCT genre) FROM books) AS genres,
            (SELECT array_agg(year) FROM (SELECT DISTINCT year FROM books ORDER BY year DESC) t) AS years"
    );
    
    $filters = pg_fetch_assoc($result);
    
    if (!$filters) {
        throw new Exception('Failed to get filters');
    }
    
    // Преобразуем массивы PostgreSQL в PHP массивы
    foreach ($filters as &$value) {
        if (strpos($value, '{') === 0) {
            $value = str_replace(['{','}'], '', $value);
            $value = $value ? explode(',', $value) : [];
        }
    }
    
    echo json_encode($filters);
}