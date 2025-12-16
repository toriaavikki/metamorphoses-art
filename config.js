// CONFIG.JS - Конфигурация производительности
export const CONFIG = {
    // Режим производительности
    performance: {
        // Автодетект слабых устройств
        detectWeakDevice: true,
        
        // Отключить WebGL на мобильных
        disableWebGLonMobile: true,
        
        // Упрощённые частицы
        simpleParticles: window.innerWidth < 768,
        
        // Ленивая загрузка аудио
        lazyAudio: true
    },
    
    // Этапы инициализации (можно пропускать)
    initialization: {
        skipShaders: false,
        skipComplexAnimations: false,
        preloadOnlyEssential: true
    },
    
    // Таймауты
    timeouts: {
        maxLoadingTime: 10000, // 10 секунд максимум
        shaderCompilationTimeout: 5000,
        audioContextTimeout: 3000
    }
};

// Детект слабого устройства
export function isWeakDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency < 4; // Меньше 4 ядер
    const isSlowConnection = navigator.connection?.effectiveType === 'slow-2g' || 
                           navigator.connection?.effectiveType === '2g';
    
    return isMobile || isLowEnd || isSlowConnection;
}