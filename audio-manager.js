// ============================================
// АУДИО МЕНЕДЖЕР
// ============================================

export default class AudioManager {
    constructor() {
        this.context = null;
        this.sounds = new Map();
        this.enabled = true;
        this.masterVolume = 0.7;
        
        // Манифест звуков
        this.manifest = {
            ambient: {
                type: 'loop',
                volume: 0.3,
                path: 'assets/audio/ambient.ogg',
                filters: ['lowpass']
            },
            glitch: {
                type: 'multiple',
                volume: 0.5,
                path: 'assets/audio/glitch/glitch_',
                count: 8
            },
            whisper: {
                type: 'multiple',
                volume: 0.2,
                path: 'assets/audio/whispers/whisper_',
                count: 5,
                spatial: true
            }
        };
    }
    
    async init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🎵 Аудиосистема инициализирована');
            
            // Создаём главный узел громкости
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;
            
        } catch (error) {
            console.warn('Аудиоконтекст не доступен:', error);
            this.context = null;
        }
    }
    
    async loadSound(key) {
        const config = this.manifest[key];
        if (!config) {
            console.warn(`Конфиг для звука "${key}" не найден`);
            return;
        }
        
        if (!this.context) {
            console.warn('Аудиоконтекст не инициализирован');
            return;
        }
        
        try {
            let buffers = [];
            
            if (config.type === 'multiple' && config.count) {
                // Загружаем несколько файлов
                const promises = [];
                for (let i = 1; i <= config.count; i++) {
                    const paddedIndex = i.toString().padStart(2, '0');
                    const url = `${config.path}${paddedIndex}.ogg`;
                    promises.push(this.loadAudioBuffer(url));
                }
                buffers = await Promise.all(promises);
            } else {
                // Загружаем один файл
                const buffer = await this.loadAudioBuffer(config.path);
                buffers = [buffer];
            }
            
            this.sounds.set(key, {
                buffers,
                config,
                lastPlayed: 0,
                sources: new Set()
            });
            
            console.log(`✅ Звук "${key}" загружен (${buffers.length} вариаций)`);
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки звука "${key}":`, error);
        }
    }
    
    async loadAudioBuffer(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return await this.context.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.warn(`Не удалось загрузить ${url}:`, error);
            throw error;
        }
    }
    
    play(key, options = {}) {
        if (!this.enabled || !this.context) return null;
        
        const sound = this.sounds.get(key);
        if (!sound) {
            console.warn(`Звук "${key}" не загружен`);
            return null;
        }
        
        // Проверка кулдауна
        const now = Date.now();
        const cooldown = options.cooldown || 100;
        if (now - sound.lastPlayed < cooldown) return null;
        
        sound.lastPlayed = now;
        
        // Выбираем случайный буфер
        const buffer = sound.buffers.length > 1
            ? sound.buffers[Math.floor(Math.random() * sound.buffers.length)]
            : sound.buffers[0];
        
        // Создаём источник
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        // Создаём узел громкости для этого звука
        const gainNode = this.context.createGain();
        const volume = options.volume !== undefined ? options.volume : sound.config.volume;
        gainNode.gain.value = volume;
        
        // Настраиваем pitch (скорость воспроизведения)
        if (options.pitch) {
            source.playbackRate.value = options.pitch;
        }
        
        // Подключаем цепочку: source → gain → master → destination
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Запускаем воспроизведение
        source.start();
        
        // Для зацикленных звуков
        if (sound.config.type === 'loop') {
            source.loop = true;
            sound.loopSource = source;
        }
        
        // Сохраняем источник для управления
        sound.sources.add(source);
        
        // Очистка после завершения
        source.onended = () => {
            sound.sources.delete(source);
        };
        
        return source;
    }
    
    stop(key) {
        const sound = this.sounds.get(key);
        if (!sound) return;
        
        // Останавливаем все активные источники
        sound.sources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Источник уже остановлен
            }
        });
        sound.sources.clear();
        
        // Останавливаем зацикленный звук
        if (sound.loopSource) {
            try {
                sound.loopSource.stop();
            } catch (e) {}
            sound.loopSource = null;
        }
    }
    
    stopAll() {
        this.sounds.forEach(sound => {
            sound.sources.forEach(source => {
                try {
                    source.stop();
                } catch (e) {}
            });
            sound.sources.clear();
            
            if (sound.loopSource) {
                try {
                    sound.loopSource.stop();
                } catch (e) {}
                sound.loopSource = null;
            }
        });
    }
    
    enable() {
        this.enabled = true;
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        console.log('🔊 Звук включен');
    }
    
    disable() {
        this.enabled = false;
        if (this.masterGain) {
            this.masterGain.gain.value = 0;
        }
        console.log('🔇 Звук выключен');
    }
    
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    isPlaying(key) {
        const sound = this.sounds.get(key);
        return sound && sound.sources.size > 0;
    }
    
    // КОММЕНТАРИЙ ДЛЯ АВТОРА САЙТА:
    // 1. Создайте папку assets/audio/
    // 2. Внутри создайте папки: glitch/ и whispers/
    // 3. Положите звуки с именами:
    //    - ambient.ogg (фоновый гул)
    //    - glitch_01.ogg, glitch_02.ogg, ... (8 файлов)
    //    - whisper_01.ogg, whisper_02.ogg, ... (5 файлов)
    // 4. Или измените пути в manifest выше под ваши файлы
}