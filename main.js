// ============================================
// МЕТАМОРФОЗЫ - ОСНОВНОЙ МОДУЛЬ
// ============================================

// Импорты
import AudioManager from './audio-manager.js';
import ShaderEffects from './shader-effects.js';

// Глобальное состояние
const AppState = {
    // Прогресс пользователя
    progress: {
        visitedPages: new Set(['index']),
        timeSpent: 0,
        interactions: 0,
        fragmentsDiscovered: 0
    },
    
    // Настройки
    settings: {
        audioEnabled: true,
        effectsEnabled: true,
        flickerIntensity: 0.3,
        aberrationAmount: 0.5,
        particleDensity: 0.7,
        reduceMotion: false
    },
    
    // Система
    isMobile: false,
    isTouch: false,
    isLoaded: false,
    startTime: Date.now()
};

// DOM элементы
const DOM = {};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c🌀 МЕТАМОРФОЗЫ', 'font-size: 24px; color: #ff00ff;');
    console.log('Психоделическое измерение инициализируется...');
    
    try {
        await initApp();
        console.log('✅ Приложение готово');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showErrorScreen(error);
    }
});

// Основная функция инициализации
async function initApp() {
    // 1. Определение устройства
    detectDevice();
    
    // 2. Загрузка DOM элементов
    cacheDOM();
    
    // 3. Загрузка состояния
    loadState();
    
    // 4. Инициализация систем
    await Promise.all([
        initAudio(),
        initEffects(),
        initUI()
    ]);
    
    // 5. Настройка событий
    setupEventListeners();
    
    // 6. Запуск анимаций
    startAnimations();
    
    // 7. Показ контента
    showContent();
    
    AppState.isLoaded = true;
    saveState();
}

// Определение устройства
function detectDevice() {
    AppState.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    AppState.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Автонастройка для мобильных
    if (AppState.isMobile || AppState.isTouch) {
        AppState.settings.particleDensity *= 0.5;
        AppState.settings.effectsEnabled = true; // Но с оптимизацией
    }
    
    // Проверка на предпочтение reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    AppState.settings.reduceMotion = prefersReducedMotion.matches;
    
    prefersReducedMotion.addEventListener('change', (e) => {
        AppState.settings.reduceMotion = e.matches;
        applySettings();
    });
    
    console.log(`Устройство: ${AppState.isMobile ? 'Мобильное' : 'Десктоп'}, Touch: ${AppState.isTouch}`);
}

// Кэширование DOM элементов
function cacheDOM() {
    DOM.loadingScreen = document.getElementById('loadingScreen');
    DOM.mainContent = document.getElementById('mainContent');
    DOM.staticPoint = document.getElementById('staticPoint');
    DOM.archiveButton = document.getElementById('archiveButton');
    DOM.audioToggle = document.getElementById('audioToggle');
    DOM.settingsButton = document.getElementById('settingsButton');
    DOM.settingsPanel = document.getElementById('settingsPanel');
    DOM.closeSettings = document.getElementById('closeSettings');
    DOM.progressValue = document.getElementById('progressValue');
    
    // Все параграфы текста
    DOM.paragraphs = document.querySelectorAll('.manifesto-paragraph');
    DOM.words = document.querySelectorAll('.word');
    
    // Настройки
    DOM.flickerIntensity = document.getElementById('flickerIntensity');
    DOM.aberrationAmount = document.getElementById('aberrationAmount');
    DOM.particleDensity = document.getElementById('particleDensity');
    DOM.reduceMotion = document.getElementById('reduceMotion');
    DOM.resetProgress = document.getElementById('resetProgress');
}

// Загрузка состояния из localStorage
function loadState() {
    try {
        const saved = localStorage.getItem('metamorphoses_state');
        if (saved) {
            const state = JSON.parse(saved);
            
            // Восстанавливаем прогресс
            if (state.progress) {
                AppState.progress = {
                    ...AppState.progress,
                    ...state.progress,
                    visitedPages: new Set(state.progress.visitedPages || ['index']),
                    fragmentsDiscovered: state.progress.fragmentsDiscovered || 0
                };
            }
            
            // Восстанавливаем настройки
            if (state.settings) {
                AppState.settings = { ...AppState.settings, ...state.settings };
            }
            
            console.log('Состояние загружено');
            updateProgressDisplay();
        }
    } catch (e) {
        console.warn('Не удалось загрузить состояние:', e);
    }
}

// Сохранение состояния
function saveState() {
    try {
        const state = {
            progress: {
                ...AppState.progress,
                visitedPages: Array.from(AppState.progress.visitedPages),
                timeSpent: AppState.progress.timeSpent + (Date.now() - AppState.startTime)
            },
            settings: AppState.settings,
            lastSaved: Date.now()
        };
        
        localStorage.setItem('metamorphoses_state', JSON.stringify(state));
    } catch (e) {
        console.warn('Не удалось сохранить состояние:', e);
    }
}

// Инициализация аудио
async function initAudio() {
    window.audioManager = new AudioManager();
    
    // Загружаем звуки
    await window.audioManager.loadSound('ambient');
    await window.audioManager.loadSound('glitch');
    await window.audioManager.loadSound('whisper');
    
    // Автовоспроизведение после взаимодействия
    document.addEventListener('click', () => {
        if (AppState.settings.audioEnabled && !window.audioManager.isPlaying('ambient')) {
            window.audioManager.play('ambient');
            updateAudioToggle(true);
        }
    }, { once: true });
}

// Инициализация эффектов
async function initEffects() {
    window.shaderEffects = new ShaderEffects({
        canvas: document.getElementById('shaderCanvas'),
        particleCanvas: document.getElementById('particleCanvas'),
        settings: AppState.settings
    });
    
    await window.shaderEffects.init();
}

// Инициализация UI
function initUI() {
    // Обновляем ползунки настроек
    if (DOM.flickerIntensity) {
        DOM.flickerIntensity.value = AppState.settings.flickerIntensity * 100;
    }
    if (DOM.aberrationAmount) {
        DOM.aberrationAmount.value = AppState.settings.aberrationAmount * 100;
    }
    if (DOM.particleDensity) {
        DOM.particleDensity.value = AppState.settings.particleDensity * 100;
    }
    if (DOM.reduceMotion) {
        DOM.reduceMotion.checked = AppState.settings.reduceMotion;
    }
    
    // Обновляем кнопку аудио
    updateAudioToggle(AppState.settings.audioEnabled);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Интерактивная точка
    if (DOM.staticPoint) {
        setupPointInteractions();
    }
    
    // Навигация
    if (DOM.archiveButton) {
        DOM.archiveButton.addEventListener('click', navigateToArchive);
    }
    
    // Управление аудио
    if (DOM.audioToggle) {
        DOM.audioToggle.addEventListener('click', toggleAudio);
    }
    
    // Настройки
    if (DOM.settingsButton) {
        DOM.settingsButton.addEventListener('click', () => {
            DOM.settingsPanel.classList.toggle('visible');
        });
    }
    
    if (DOM.closeSettings) {
        DOM.closeSettings.addEventListener('click', () => {
            DOM.settingsPanel.classList.remove('visible');
        });
    }
    
    // Обновление настроек в реальном времени
    if (DOM.flickerIntensity) {
        DOM.flickerIntensity.addEventListener('input', (e) => {
            AppState.settings.flickerIntensity = e.target.value / 100;
            applySettings();
        });
    }
    
    if (DOM.aberrationAmount) {
        DOM.aberrationAmount.addEventListener('input', (e) => {
            AppState.settings.aberrationAmount = e.target.value / 100;
            applySettings();
        });
    }
    
    if (DOM.particleDensity) {
        DOM.particleDensity.addEventListener('input', (e) => {
            AppState.settings.particleDensity = e.target.value / 100;
            applySettings();
        });
    }
    
    if (DOM.reduceMotion) {
        DOM.reduceMotion.addEventListener('change', (e) => {
            AppState.settings.reduceMotion = e.target.checked;
            applySettings();
        });
    }
    
    // Сброс прогресса
    if (DOM.resetProgress) {
        DOM.resetProgress.addEventListener('click', resetProgress);
    }
    
    // Интерактивность текста
    setupTextInteractions();
    
    // Автосохранение при выходе
    window.addEventListener('beforeunload', saveState);
    
    // Автосохранение каждые 30 секунд
    setInterval(saveState, 30000);
}

// Взаимодействие с точкой
function setupPointInteractions() {
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let originalTransform = '';
    
    DOM.staticPoint.addEventListener('mousedown', startDrag);
    DOM.staticPoint.addEventListener('touchstart', startDrag);
    
    function startDrag(e) {
        if (AppState.settings.reduceMotion) return;
        
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        dragStart = { x: clientX, y: clientY };
        originalTransform = DOM.staticPoint.style.transform;
        
        DOM.staticPoint.classList.add('dragging');
        
        // Звук начала перетаскивания
        window.audioManager.play('glitch', { volume: 0.3 });
        
        e.preventDefault();
    }
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    
    function drag(e) {
        if (!isDragging) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - dragStart.x;
        const deltaY = clientY - dragStart.y;
        
        // Ограничиваем перемещение
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 150;
        
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * maxDistance;
            const limitedY = Math.sin(angle) * maxDistance;
            
            DOM.staticPoint.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;
        } else {
            DOM.staticPoint.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        }
        
        // Визуальная обратная связь
        const resistance = distance / maxDistance;
        DOM.staticPoint.style.opacity = 1 - resistance * 0.5;
        
        // Психоделический эффект при сильном натяжении
        if (distance > maxDistance * 0.8) {
            createTensionEffect(deltaX, deltaY, resistance);
        }
        
        e.preventDefault();
    }
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    
    function endDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        DOM.staticPoint.classList.remove('dragging');
        
        // Возвращаем точку с анимацией
        DOM.staticPoint.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s';
        DOM.staticPoint.style.transform = originalTransform;
        DOM.staticPoint.style.opacity = '1';
        
        // Психоделический всплеск
        createPsychedelicBurst();
        
        // Увеличиваем прогресс
        AppState.progress.interactions++;
        updateProgressDisplay();
        
        // Убираем transition после анимации
        setTimeout(() => {
            DOM.staticPoint.style.transition = '';
        }, 800);
    }
}

// Создание эффекта натяжения
function createTensionEffect(dx, dy, intensity) {
    if (!window.shaderEffects) return;
    
    window.shaderEffects.addDistortion({
        x: 0.5 + dx / window.innerWidth,
        y: 0.5 + dy / window.innerHeight,
        intensity: intensity * 2,
        time: Date.now() / 1000
    });
    
    // Визуальные артефакты
    if (intensity > 0.9 && Math.random() > 0.7) {
        createVisualGlitch();
    }
}

// Психоделический всплеск
function createPsychedelicBurst() {
    // Анимация точки
    DOM.staticPoint.classList.add('burst');
    
    // Звуковой эффект
    window.audioManager.play('glitch', { 
        volume: 0.5,
        pitch: 0.8 + Math.random() * 0.4
    });
    
    // Шейдерный эффект
    if (window.shaderEffects) {
        window.shaderEffects.triggerBurst({
            x: 0.5,
            y: 0.5,
            color: [Math.random(), Math.random(), Math.random()],
            radius: 0.3 + Math.random() * 0.3
        });
    }
    
    // Частицы
    createBurstParticles();
    
    // Убираем класс burst
    setTimeout(() => {
        DOM.staticPoint.classList.remove('burst');
    }, 600);
}

// Создание частиц всплеска
function createBurstParticles() {
    if (!window.shaderEffects || AppState.settings.reduceMotion) return;
    
    const particleCount = Math.floor(50 * AppState.settings.particleDensity);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        const size = 2 + Math.random() * 4;
        const color = [
            Math.random() * 0.5 + 0.5, // R
            Math.random(),              // G
            Math.random() * 0.5 + 0.5  // B
        ];
        
        window.shaderEffects.addParticle({
            x: 0.5,
            y: 0.5,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            color: color,
            life: 1.0
        });
    }
}

// Визуальный глитч
function createVisualGlitch() {
    if (!window.shaderEffects) return;
    
    window.shaderEffects.addGlitch({
        amount: 0.1 + Math.random() * 0.2,
        time: Date.now() / 1000,
        duration: 0.1
    });
    
    // Случайный whisper
    if (Math.random() > 0.5) {
        window.audioManager.play('whisper', { volume: 0.2 });
    }
}

// Взаимодействие с текстом
function setupTextInteractions() {
    // Параграфы появляются при скролле
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Активируем слова по очереди
                const words = entry.target.querySelectorAll('.word');
                words.forEach((word, index) => {
                    setTimeout(() => {
                        word.classList.add('revealed');
                    }, index * 50);
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    });
    
    DOM.paragraphs.forEach(p => observer.observe(p));
    
    // Хроматическая аберрация при наведении на слова
    DOM.words.forEach(word => {
        word.addEventListener('mouseenter', () => {
            if (AppState.settings.reduceMotion) return;
            
            word.classList.add('aberrated');
            
            // Лёгкий звуковой отклик
            if (AppState.settings.audioEnabled) {
                window.audioManager.play('glitch', { 
                    volume: 0.1,
                    pitch: 1.5,
                    cooldown: 100 
                });
            }
        });
        
        word.addEventListener('mouseleave', () => {
            word.classList.remove('aberrated');
        });
    });
}

// Навигация в архив
function navigateToArchive(e) {
    e.preventDefault();
    
    // Психоделический переход
    document.body.classList.add('transitioning');
    
    // Звук перехода
    window.audioManager.play('glitch', { volume: 0.7, pitch: 0.5 });
    
    // Шейдерный эффект перехода
    if (window.shaderEffects) {
        window.shaderEffects.triggerTransition(() => {
            // Переходим после завершения эффекта
            setTimeout(() => {
                window.location.href = 'archive.html';
            }, 500);
        });
    } else {
        setTimeout(() => {
            window.location.href = 'archive.html';
        }, 1000);
    }
}

// Управление аудио
function toggleAudio() {
    AppState.settings.audioEnabled = !AppState.settings.audioEnabled;
    
    if (AppState.settings.audioEnabled) {
        window.audioManager.enable();
        window.audioManager.play('ambient');
    } else {
        window.audioManager.disable();
    }
    
    updateAudioToggle(AppState.settings.audioEnabled);
    applySettings();
}

function updateAudioToggle(enabled) {
    if (!DOM.audioToggle) return;
    
    const icon = DOM.audioToggle.querySelector('.icon');
    const label = DOM.audioToggle.querySelector('.label');
    
    if (enabled) {
        icon.textContent = '🔊';
        label.textContent = 'Звук вкл';
        DOM.audioToggle.classList.add('active');
    } else {
        icon.textContent = '🔇';
        label.textContent = 'Звук выкл';
        DOM.audioToggle.classList.remove('active');
    }
}

// Применение настроек
function applySettings() {
    // Применяем к шейдерам
    if (window.shaderEffects) {
        window.shaderEffects.updateSettings(AppState.settings);
    }
    
    // Применяем к аудио
    if (window.audioManager) {
        window.audioManager.setVolume(AppState.settings.audioEnabled ? 0.7 : 0);
    }
    
    // Сохраняем настройки
    saveState();
}

// Обновление отображения прогресса
function updateProgressDisplay() {
    if (!DOM.progressValue) return;
    
    // Простой расчёт прогресса
    const totalPossible = 100;
    const current = 
        AppState.progress.interactions * 0.1 +
        AppState.progress.fragmentsDiscovered * 10 +
        AppState.progress.visitedPages.size * 5;
    
    const percentage = Math.min(Math.floor((current / totalPossible) * 100), 100);
    
    DOM.progressValue.textContent = `${percentage}%`;
    
    // Анимация прогресс-бара
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

// Сброс прогресса
function resetProgress() {
    if (confirm('Вы уверены? Весь прогресс будет сброшен.')) {
        localStorage.removeItem('metamorphoses_state');
        location.reload();
    }
}

// Запуск анимаций
function startAnimations() {
    // Запускаем мерцание текста
    if (AppState.settings.effectsEnabled && !AppState.settings.reduceMotion) {
        startTextFlickering();
    }
    
    // Запускаем фоновые частицы
    if (window.shaderEffects) {
        window.shaderEffects.startParticles();
    }
}

// Мерцание текста
function startTextFlickering() {
    setInterval(() => {
        if (Math.random() < AppState.settings.flickerIntensity * 0.1) {
            const randomWord = DOM.words[Math.floor(Math.random() * DOM.words.length)];
            if (randomWord) {
                randomWord.classList.add('flickering');
                setTimeout(() => {
                    randomWord.classList.remove('flickering');
                }, 100);
            }
        }
    }, 100);
}

// Показ контента после загрузки
function showContent() {
    // Скрываем экран загрузки
    if (DOM.loadingScreen) {
        DOM.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            DOM.loadingScreen.style.display = 'none';
        }, 500);
    }
    
    // Показываем основной контент
    if (DOM.mainContent) {
        DOM.mainContent.style.opacity = '1';
        DOM.mainContent.style.transition = 'opacity 1s ease';
    }
}

// Экран ошибки
function showErrorScreen(error) {
    document.body.innerHTML = `
        <div class="error-screen">
            <div class="error-content">
                <h1>🌀 Сбой в измерении</h1>
                <p>Психоделическое пространство временно недоступно.</p>
                <p><small>${error.message}</small></p>
                <button onclick="location.reload()">Перезагрузить измерение</button>
            </div>
        </div>
    `;
    
    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        .error-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
            text-align: center;
            padding: 20px;
        }
        .error-content h1 {
            color: #ff00ff;
            margin-bottom: 20px;
        }
        .error-content button {
            margin-top: 30px;
            padding: 10px 30px;
            background: transparent;
            color: #fff;
            border: 1px solid #444;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
}

// Экспортируем AppState для других модулей
export { AppState };