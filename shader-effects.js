// ============================================
// SHADER EFFECTS MANAGER
// Управление психоделическими эффектами WebGL
// ============================================

export default class ShaderEffects {
    constructor(options = {}) {
        // Настройки
        this.settings = {
            enabled: true,
            intensity: 1.0,
            aberration: 0.5,
            flicker: 0.3,
            particleDensity: 0.7,
            ...options.settings
        };
        
        // Ссылки на канвасы
        this.canvas = options.canvas;
        this.particleCanvas = options.particleCanvas;
        
        // WebGL контексты
        this.gl = null;
        this.particleGl = null;
        
        // Шейдерные программы
        this.program = null;
        this.particleProgram = null;
        
        // Данные для эффектов
        this.uniforms = {};
        this.particles = [];
        this.time = 0;
        this.isAnimating = false;
        
        // Ресурсы
        this.textures = new Map();
        
        // Для плавной анимации
        this.rafId = null;
        this.lastTime = 0;
    }
    
    // Инициализация WebGL
    async init() {
        if (!this.settings.enabled) {
            console.log('🌀 Шейдерные эффекты отключены');
            return;
        }
        
        try {
            // Проверяем поддержку WebGL
            if (!this.canvas || !this.particleCanvas) {
                throw new Error('Канвасы не найдены');
            }
            
            // Инициализируем основной контекст
            this.gl = this.canvas.getContext('webgl2') || 
                     this.canvas.getContext('webgl') || 
                     this.canvas.getContext('experimental-webgl');
            
            if (!this.gl) {
                throw new Error('WebGL не поддерживается');
            }
            
            // Инициализируем контекст для частиц
            this.particleGl = this.particleCanvas.getContext('2d');
            if (!this.particleGl) {
                throw new Error('Canvas 2D не поддерживается');
            }
            
            // Настраиваем размеры канвасов
            this.resizeCanvases();
            window.addEventListener('resize', () => this.resizeCanvases());
            
            // Компилируем шейдеры
            await this.compileShaders();
            
            // Инициализируем буферы
            this.initBuffers();
            
            // Загружаем текстуры (если нужны)
            await this.loadTextures();
            
            // Настраиваем WebGL
            this.setupGL();
            
            console.log('✅ Шейдерные эффекты инициализированы');
            
        } catch (error) {
            console.warn('❌ Не удалось инициализировать шейдерные эффекты:', error);
            this.settings.enabled = false;
            
            // Скрываем канвасы если WebGL не работает
            if (this.canvas) this.canvas.style.display = 'none';
            if (this.particleCanvas) this.particleCanvas.style.display = 'none';
        }
    }
    
    // Изменение размера канвасов
    resizeCanvases() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Основной канвас для шейдеров
        if (this.canvas) {
            this.canvas.width = width * window.devicePixelRatio;
            this.canvas.height = height * window.devicePixelRatio;
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            
            if (this.gl) {
                this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
            }
        }
        
        // Канвас для частиц
        if (this.particleCanvas) {
            this.particleCanvas.width = width;
            this.particleCanvas.height = height;
            this.particleCanvas.style.width = `${width}px`;
            this.particleCanvas.style.height = `${height}px`;
        }
    }
    
    // Компиляция шейдеров
    async compileShaders() {
        if (!this.gl) return;
        
        // Вершинный шейдер (простой, рисует полноэкранный квадрат)
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        
        // Фрагментный шейдер с психоделическими эффектами
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec2 v_texCoord;
            uniform float u_time;
            uniform float u_aberration;
            uniform float u_flicker;
            uniform float u_intensity;
            uniform vec2 u_mouse;
            uniform float u_distortion;
            
            // Функция шума для психоделических эффектов
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            // Функция для создания мерцания
            float flicker(float time, vec2 coord) {
                return 0.9 + 0.1 * sin(time * 10.0 + coord.x * 50.0) * 
                                cos(time * 7.0 + coord.y * 30.0);
            }
            
            // Хроматическая аберрация
            vec3 chromaticAberration(vec2 coord, float amount) {
                float r = texture2D(u_texture, coord + vec2(amount * 0.01, 0.0)).r;
                float g = texture2D(u_texture, coord).g;
                float b = texture2D(u_texture, coord - vec2(amount * 0.01, 0.0)).b;
                return vec3(r, g, b);
            }
            
            // Психоделический цветовой сдвиг
            vec3 psychedelicColor(float time, vec2 coord) {
                vec3 color;
                color.r = 0.5 + 0.5 * sin(time * 0.5 + coord.x * 3.0);
                color.g = 0.5 + 0.5 * sin(time * 0.7 + coord.y * 3.0 + 1.0);
                color.b = 0.5 + 0.5 * sin(time * 0.9 + (coord.x + coord.y) * 3.0 + 2.0);
                return color;
            }
            
            // Волновой эффект
            vec2 waveDistortion(vec2 coord, float time) {
                float wave = sin(coord.y * 10.0 + time * 2.0) * 0.01;
                return coord + vec2(wave, 0.0);
            }
            
            // Эффект виньетирования
            float vignette(vec2 coord) {
                vec2 uv = coord * 2.0 - 1.0;
                float dist = length(uv);
                return 1.0 - smoothstep(0.7, 1.4, dist);
            }
            
            void main() {
                // Искажение координат
                vec2 distortedCoord = v_texCoord;
                
                // Добавляем волновой эффект если есть distortion
                if (u_distortion > 0.0) {
                    distortedCoord = waveDistortion(distortedCoord, u_time);
                }
                
                // Психоделический цвет
                vec3 psychedelic = psychedelicColor(u_time, distortedCoord);
                
                // Хроматическая аберрация
                vec3 aberration = chromaticAberration(distortedCoord, u_aberration);
                
                // Мерцание
                float flickerValue = flicker(u_time, distortedCoord) * u_flicker;
                
                // Виньетирование
                float vignetteValue = vignette(distortedCoord);
                
                // Смешиваем эффекты
                vec3 finalColor = mix(aberration, psychedelic, u_intensity * 0.3);
                finalColor *= flickerValue * vignetteValue;
                
                // Добавляем влияние мыши
                float mouseDist = distance(v_texCoord, u_mouse);
                float mouseEffect = smoothstep(0.3, 0.0, mouseDist);
                finalColor += mouseEffect * 0.3 * psychedelic;
                
                // Добавляем случайный шум
                float noise = random(v_texCoord + u_time * 0.1) * 0.05;
                finalColor += noise;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
        
        // Создаем и компилируем шейдеры
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Создаем программу
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // Получаем location uniform-переменных
        this.uniforms = {
            time: this.gl.getUniformLocation(this.program, 'u_time'),
            aberration: this.gl.getUniformLocation(this.program, 'u_aberration'),
            flicker: this.gl.getUniformLocation(this.program, 'u_flicker'),
            intensity: this.gl.getUniformLocation(this.program, 'u_intensity'),
            mouse: this.gl.getUniformLocation(this.program, 'u_mouse'),
            distortion: this.gl.getUniformLocation(this.program, 'u_distortion')
        };
        
        // Получаем location атрибутов
        this.attributes = {
            position: this.gl.getAttribLocation(this.program, 'a_position')
        };
    }
    
    // Создание шейдера
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        // Проверяем ошибки компиляции
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Ошибка компиляции шейдера:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    // Создание программы
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        // Проверяем ошибки линковки
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Ошибка линковки программы:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    // Инициализация буферов
    initBuffers() {
        if (!this.gl || !this.program) return;
        
        // Вершины для полноэкранного квадрата
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0
        ]);
        
        // Создаем буфер
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    }
    
    // Загрузка текстур
    async loadTextures() {
        // Здесь можно загрузить текстуры для эффектов
        // Например, текстуры шума, паттерны и т.д.
        const textureUrls = [
            // 'assets/textures/noise.png'
        ];
        
        for (const url of textureUrls) {
            try {
                const texture = await this.loadTexture(url);
                this.textures.set(url, texture);
            } catch (error) {
                console.warn(`Не удалось загрузить текстуру ${url}:`, error);
            }
        }
    }
    
    // Загрузка текстуры из URL
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
                const texture = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 
                                 this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                
                // Настраиваем текстуру
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                resolve(texture);
            };
            image.onerror = reject;
            image.src = url;
        });
    }
    
    // Настройка WebGL
    setupGL() {
        if (!this.gl || !this.program) return;
        
        this.gl.useProgram(this.program);
        
        // Включаем атрибут позиции
        this.gl.enableVertexAttribArray(this.attributes.position);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
        
        // Прозрачность
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
    
    // Запуск анимации
    start() {
        if (!this.settings.enabled || this.isAnimating) return;
        
        this.isAnimating = true;
        this.lastTime = performance.now();
        
        const animate = (currentTime) => {
            if (!this.isAnimating) return;
            
            this.rafId = requestAnimationFrame(animate);
            
            // Вычисляем delta time
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            this.time += deltaTime;
            
            // Рендерим кадр
            this.render();
        };
        
        animate(this.lastTime);
    }
    
    // Остановка анимации
    stop() {
        this.isAnimating = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    
    // Рендер кадра
    render() {
        if (!this.gl || !this.program) return;
        
        // Очищаем канвас
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Устанавливаем uniform-переменные
        this.gl.uniform1f(this.uniforms.time, this.time);
        this.gl.uniform1f(this.uniforms.aberration, this.settings.aberration);
        this.gl.uniform1f(this.uniforms.flicker, this.settings.flicker);
        this.gl.uniform1f(this.uniforms.intensity, this.settings.intensity);
        this.gl.uniform2f(this.uniforms.mouse, 0.5, 0.5); // Центр экрана по умолчанию
        this.gl.uniform1f(this.uniforms.distortion, 0.0);
        
        // Рисуем
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        // Также рендерим частицы на 2D канвасе
        this.renderParticles();
    }
    
    // Рендер частиц на 2D канвасе
    renderParticles() {
        if (!this.particleGl || !this.settings.enabled) return;
        
        // Очищаем с прозрачностью для эффекта шлейфа
        this.particleGl.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.particleGl.fillRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        
        // Обновляем и рисуем частицы
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Обновляем позицию
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.01;
            
            // Уменьшаем размер со временем
            particle.size *= 0.99;
            
            // Удаляем "мёртвые" частицы
            if (particle.life <= 0 || particle.size < 0.1) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Рисуем частицу
            this.particleGl.beginPath();
            this.particleGl.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            
            // Цвет с прозрачностью
            const alpha = particle.life * 0.7;
            this.particleGl.fillStyle = `rgba(${Math.floor(particle.color[0] * 255)}, 
                                            ${Math.floor(particle.color[1] * 255)}, 
                                            ${Math.floor(particle.color[2] * 255)}, 
                                            ${alpha})`;
            
            this.particleGl.fill();
        }
    }
    
    // Добавление частицы
    addParticle(particleData) {
        if (!this.settings.enabled || this.particles.length > 1000) return;
        
        const particle = {
            x: (particleData.x || 0.5) * this.particleCanvas.width,
            y: (particleData.y || 0.5) * this.particleCanvas.height,
            vx: particleData.vx || 0,
            vy: particleData.vy || 0,
            size: particleData.size || 5,
            color: particleData.color || [1, 1, 1],
            life: particleData.life || 1.0
        };
        
        this.particles.push(particle);
    }
    
    // Запуск частиц
    startParticles() {
        if (!this.settings.enabled) return;
        
        // Создаём фоновые частицы
        const createBackgroundParticles = () => {
            if (this.particles.length < 100 * this.settings.particleDensity) {
                this.addParticle({
                    x: Math.random(),
                    y: Math.random(),
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 3 + 1,
                    color: [
                        Math.random() * 0.5 + 0.5,
                        Math.random(),
                        Math.random() * 0.5 + 0.5
                    ],
                    life: Math.random() * 0.5 + 0.5
                });
            }
            
            if (this.isAnimating) {
                setTimeout(createBackgroundParticles, 100);
            }
        };
        
        createBackgroundParticles();
    }
    
    // Добавление искажения
    addDistortion(distortionData) {
        if (!this.settings.enabled || !this.uniforms.distortion) return;
        
        // Временно увеличиваем distortion
        this.gl.uniform1f(this.uniforms.distortion, distortionData.intensity || 0.5);
        
        // Возвращаем к нормальному состоянию через время
        setTimeout(() => {
            if (this.uniforms.distortion) {
                this.gl.uniform1f(this.uniforms.distortion, 0.0);
            }
        }, distortionData.duration || 500);
    }
    
    // Триггер глитч-эффекта
    addGlitch(glitchData) {
        if (!this.settings.enabled) return;
        
        // Сохраняем текущие настройки
        const originalAberration = this.settings.aberration;
        const originalFlicker = this.settings.flicker;
        
        // Увеличиваем эффекты для глитча
        this.settings.aberration = Math.min(1.0, originalAberration + (glitchData.amount || 0.2));
        this.settings.flicker = Math.min(1.0, originalFlicker + 0.3);
        
        // Возвращаем настройки обратно
        setTimeout(() => {
            this.settings.aberration = originalAberration;
            this.settings.flicker = originalFlicker;
        }, glitchData.duration || 200);
    }
    
    // Триггер всплеска
    triggerBurst(burstData) {
        if (!this.settings.enabled) return;
        
        const count = Math.floor(50 * this.settings.particleDensity);
        const centerX = (burstData.x || 0.5) * this.particleCanvas.width;
        const centerY = (burstData.y || 0.5) * this.particleCanvas.height;
        
        // Создаём частицы всплеска
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            
            this.addParticle({
                x: burstData.x || 0.5,
                y: burstData.y || 0.5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 8 + 2,
                color: burstData.color || [
                    Math.random() * 0.5 + 0.5,
                    Math.random(),
                    Math.random() * 0.5 + 0.5
                ],
                life: 1.0
            });
        }
        
        // Добавляем искажение
        this.addDistortion({
            intensity: 0.8,
            duration: 300
        });
    }
    
    // Триггер перехода между страницами
    triggerTransition(callback) {
        if (!this.settings.enabled) {
            if (callback) setTimeout(callback, 500);
            return;
        }
        
        // Увеличиваем интенсивность эффектов
        const originalIntensity = this.settings.intensity;
        this.settings.intensity = 2.0;
        
        // Создаём максимальный глитч
        this.addGlitch({
            amount: 0.5,
            duration: 1000
        });
        
        // Заполняем экран частицами
        for (let i = 0; i < 200; i++) {
            setTimeout(() => {
                this.triggerBurst({
                    x: Math.random(),
                    y: Math.random(),
                    color: [
                        Math.random(),
                        Math.random(),
                        Math.random()
                    ]
                });
            }, i * 10);
        }
        
        // Возвращаем настройки и вызываем колбэк
        setTimeout(() => {
            this.settings.intensity = originalIntensity;
            if (callback) callback();
        }, 1000);
    }
    
    // Обновление настроек
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Обновляем плотность частиц
        if (newSettings.particleDensity !== undefined) {
            // Можно обновить количество частиц
        }
    }
    
    // Обновление позиции мыши
    updateMousePosition(x, y) {
        if (!this.uniforms.mouse) return;
        
        const normalizedX = x / this.canvas.width;
        const normalizedY = 1.0 - (y / this.canvas.height); // Инвертируем Y для WebGL
        
        this.gl.uniform2f(this.uniforms.mouse, normalizedX, normalizedY);
    }
    
    // Очистка ресурсов
    dispose() {
        this.stop();
        
        // Удаляем WebGL ресурсы
        if (this.gl) {
            if (this.program) this.gl.deleteProgram(this.program);
            if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
            this.textures.forEach(texture => this.gl.deleteTexture(texture));
        }
        
        // Очищаем массивы
        this.particles = [];
        this.textures.clear();
        
        console.log('🗑️ Шейдерные эффекты очищены');
    }
}

// Экспортируем утилитарные функции
export const ShaderUtils = {
    // Создание простого шейдера для тестирования
    createTestShader(gl) {
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `);
        gl.compileShader(vertexShader);
        
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, `
            precision mediump float;
            uniform float u_time;
            void main() {
                gl_FragColor = vec4(
                    0.5 + 0.5 * sin(u_time),
                    0.5 + 0.5 * sin(u_time + 2.0),
                    0.5 + 0.5 * sin(u_time + 4.0),
                    1.0
                );
            }
        `);
        gl.compileShader(fragmentShader);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        return program;
    },
    
    // Проверка поддержки WebGL
    isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    },
    
    // Получение расширений WebGL
    getWebGLExtensions(gl) {
        const extensions = [
            'OES_texture_float',
            'OES_texture_float_linear',
            'OES_standard_derivatives',
            'EXT_shader_texture_lod',
            'WEBGL_color_buffer_float'
        ];
        
        const available = {};
        extensions.forEach(ext => {
            available[ext] = gl.getExtension(ext);
        });
        
        return available;
    }
};
