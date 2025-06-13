<?php
session_start();
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Твой каталог</title>
    <link href="webfonts/inter-font.css" rel="stylesheet">
    <link rel="stylesheet" href="styles/all.min.css">
    <link rel="stylesheet" href="styles/base.css">
    <link rel="stylesheet" href="styles/catalog.css">
    <link rel="stylesheet" href="styles/main_page.css">
    <link rel="stylesheet" href="styles/profile.css">
</head>
<body>
    <div id="header-container"></div>
    <main id="main-container"></main>
    <div id="footer-container"></div>

    <div class="modal-overlay" id="login-modal">
        <div class="modal">
            <div class="modal-header">
                <button class="modal-close">&times;</button>
                <h2>Вход</h2>
            </div>
            <div class="modal-content">
                <div class="form-fields">
                    <div class="form-group">
                        <label>Логин</label>
                        <input type="text" id="login-username" placeholder="Введите логин">
                        <div class="error-container" id="login-username-error" style="display: none"></div>
                    </div>
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="login-password" placeholder="Введите пароль">
                        <div class="error-container" id="login-password-error" style="display: none"></div>
                    </div>
                    <div class="form-group remember">
                        <input type="checkbox" id="remember-me">
                        <label for="remember-me">Запомнить меня</label>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="create-btn" id="login-submit">Войти</button>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="register-modal">
        <div class="modal">
            <div class="modal-header">
                <button class="modal-close">&times;</button>
                <h2>Регистрация</h2>
            </div>
            <div class="modal-content">
                <div class="form-fields">
                    <div class="form-group">
                        <label>Логин</label>
                        <input type="text" id="register-username" placeholder="Придумайте логин">
                        <div class="error-container" id="register-username-error" style="display: none"></div>
                    </div>
                    <div class="form-group">
                        <label>Имя</label>
                        <input type="text" id="register-name" placeholder="Ваше имя">
                        <div class="error-container" id="register-name-error" style="display: none"></div>
                    </div>
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="register-password" placeholder="Придумайте пароль">
                        <div class="error-container" id="register-password-error" style="display: none"></div>
                    </div>
                    <div class="form-group">
                        <label>Подтверждение пароля</label>
                        <input type="password" id="register-confirm" placeholder="Повторите пароль">
                        <div class="error-container" id="register-confirm-error" style="display: none"></div>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="register-email" placeholder="Ваш email">
                        <div class="error-container" id="register-email-error" style="display: none"></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="create-btn" id="register-submit">Зарегистрироваться</button>
            </div>
        </div>
    </div>

    <script type="module" src="scripts/common.js"></script>
    <script type="module" src="scripts/router.js"></script>
</body>
</html>