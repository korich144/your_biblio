CREATE DATABASE bookcatalog;

-- Пользователи
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100),
    avatar VARCHAR(255),
    birthdate DATE, -- Добавлено поле даты рождения
    gender VARCHAR(10), -- Добавлено поле пола
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Книги
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100),
    year INTEGER,
    pages INTEGER,
    genre VARCHAR(50),
    description TEXT,
    image VARCHAR(255),
    is_public BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Личные библиотеки пользователей
CREATE TABLE user_library (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, book_id)
);