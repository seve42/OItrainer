/*
  devtools-detector.js - 控制台代码执行检测模块
  检测玩家是否在浏览器控制台输入/执行过JavaScript代码，并防止检测值被篡改
  注意：只检测控制台代码执行，不检测开发者工具是否打开
*/

(function() {
  'use strict';

  // ===== 配置常量 =====
  const DETECTION_INTERVAL = 500; // 检测间隔（毫秒）
  const HASH_SALT = 'OITrainer_Console_Salt_2024'; // 哈希盐值
  
  // ===== 检测状态（使用多变量互相验证） =====
  let detectionState = {
    // 主要标记（是否检测到控制台代码执行）
    detected: false,
    detectedBackup1: false,
    detectedBackup2: false,
    
    // 第一次检测到的时间戳
    firstDetectedTime: 0,
    firstDetectedTimeBackup: 0,
    
    // 检测次数
    detectionCount: 0,
    detectionCountBackup: 0,
    
    // 校验哈希（初始化为null，首次计算后更新）
    checksum: null,
    checksumBackup: null,
    
    // 最后更新时间（防止回溯篡改）
    lastUpdateTime: Date.now(),
    lastUpdateTimeBackup: Date.now()
  };

  // ===== 保护游戏关键对象和方法 =====
  const protectedObjects = new WeakSet();
  const originalGameState = {};
  
  function setupProtection() {
    if (typeof window !== 'undefined' && window.game) {
      try {
        // 记录原始游戏状态的关键属性
        const game = window.game;
        
        // 保护game对象的关键属性
        const criticalProps = ['money', 'reputation', 'skills', 'competitions', 'achievements'];
        
        for (const prop of criticalProps) {
          if (game.hasOwnProperty(prop)) {
            originalGameState[prop] = JSON.stringify(game[prop]);
            protectedObjects.add(game[prop]);
          }
        }
        
        // 监控游戏对象的修改
        const handler = {
          set: function(target, property, value) {
            // 记录属性被修改
            console.log(`[Console Detector] 游戏属性被修改: ${property}`);
            updateDetectionState(true);
            return Reflect.set(target, property, value);
          }
        };
        
        // 注意：这里不直接使用Proxy包装game，因为会影响游戏正常运行
        // 只在检测到可疑操作时标记
        
      } catch (e) {
        console.error('[Console Detector] 保护设置失败:', e);
      }
    }
  }

  // ===== 方法1：检测console命令历史 =====
  let consoleHistoryTrap = false;
  
  function detectByConsoleHistory() {
    try {
      // 监控console.log等方法的调用栈
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // 检查调用栈是否来自用户控制台输入
      function checkCallStack() {
        try {
          const stack = new Error().stack || '';
          // 控制台直接输入的代码通常在栈顶层，不包含文件名
          // 或包含特殊标记如 '<anonymous>'、'eval'、'<console>'
          const stackLines = stack.split('\n');
          
          for (let i = 0; i < Math.min(3, stackLines.length); i++) {
            const line = stackLines[i].toLowerCase();
            if (line.includes('<anonymous>') || 
                line.includes('eval') || 
                line.includes('console') ||
                (line.includes('at') && !line.includes('.js') && !line.includes('.html'))) {
              return true;
            }
          }
        } catch (e) {
          // 忽略错误
        }
        return false;
      }
      
      // 包装console方法
      console.log = function() {
        if (checkCallStack()) {
          console.log('[Console Detector] 检测到控制台代码执行 (log)');
          updateDetectionState(true);
        }
        return originalLog.apply(console, arguments);
      };
      
      console.error = function() {
        if (checkCallStack()) {
          console.error('[Console Detector] 检测到控制台代码执行 (error)');
          updateDetectionState(true);
        }
        return originalError.apply(console, arguments);
      };
      
      console.warn = function() {
        if (checkCallStack()) {
          console.warn('[Console Detector] 检测到控制台代码执行 (warn)');
          updateDetectionState(true);
        }
        return originalWarn.apply(console, arguments);
      };
      
    } catch (e) {
      console.error('[Console Detector] Console历史检测设置失败:', e);
    }
  }

  // ===== 方法2：监控全局对象的访问 =====
  function detectByGlobalObjectAccess() {
    try {
      // 监控window.game对象的访问
      if (typeof window !== 'undefined' && window.game && !window._gameProxySet) {
        const originalGame = window.game;
        let accessFromConsole = false;
        
        // 为game对象的关键属性添加getter监控
        const criticalProps = ['money', 'reputation', 'skills'];
        
        for (const prop of criticalProps) {
          if (originalGame.hasOwnProperty(prop)) {
            const originalValue = originalGame[prop];
            let internalValue = originalValue;
            
            Object.defineProperty(originalGame, '_' + prop, {
              value: internalValue,
              writable: true,
              enumerable: false,
              configurable: true
            });
            
            Object.defineProperty(originalGame, prop, {
              get: function() {
                // 检查调用栈
                try {
                  const stack = new Error().stack || '';
                  const stackLines = stack.split('\n');
                  
                  for (let i = 0; i < Math.min(5, stackLines.length); i++) {
                    const line = stackLines[i].toLowerCase();
                    if ((line.includes('<anonymous>') || 
                         line.includes('eval') ||
                         (line.includes('at') && !line.includes('.js'))) &&
                        !line.includes('devtools-detector')) {
                      console.log(`[Console Detector] 检测到从控制台访问 game.${prop}`);
                      updateDetectionState(true);
                      break;
                    }
                  }
                } catch (e) {
                  // 忽略错误
                }
                
                return originalGame['_' + prop];
              },
              set: function(value) {
                // 检查调用栈
                try {
                  const stack = new Error().stack || '';
                  const stackLines = stack.split('\n');
                  
                  for (let i = 0; i < Math.min(5, stackLines.length); i++) {
                    const line = stackLines[i].toLowerCase();
                    if ((line.includes('<anonymous>') || 
                         line.includes('eval') ||
                         (line.includes('at') && !line.includes('.js'))) &&
                        !line.includes('devtools-detector')) {
                      console.log(`[Console Detector] 检测到从控制台修改 game.${prop}`);
                      updateDetectionState(true);
                      break;
                    }
                  }
                } catch (e) {
                  // 忽略错误
                }
                
                originalGame['_' + prop] = value;
              },
              enumerable: true,
              configurable: true
            });
          }
        }
        
        window._gameProxySet = true;
      }
    } catch (e) {
      console.error('[Console Detector] 全局对象访问监控设置失败:', e);
    }
  }

  // ===== 方法3：检测eval和Function构造器的使用 =====
  function detectByEvalUsage() {
    try {
      // 保存原始的eval和Function
      const originalEval = window.eval;
      const originalFunction = window.Function;
      
      // 包装eval
      window.eval = function(code) {
        console.log('[Console Detector] 检测到eval调用');
        updateDetectionState(true);
        return originalEval.call(window, code);
      };
      
      // 包装Function构造器
      window.Function = function() {
        console.log('[Console Detector] 检测到Function构造器调用');
        updateDetectionState(true);
        return originalFunction.apply(this, arguments);
      };
      
      // 保持原型链
      window.Function.prototype = originalFunction.prototype;
      
    } catch (e) {
      console.error('[Console Detector] Eval检测设置失败:', e);
    }
  }

  // ===== 方法4：监控localStorage的直接修改 =====
  function detectByStorageModification() {
    try {
      const originalSetItem = Storage.prototype.setItem;
      
      Storage.prototype.setItem = function(key, value) {
        // 检查是否是游戏相关的存储
        if (key && (key.includes('game') || key.includes('OITrainer'))) {
          // 检查调用栈
          try {
            const stack = new Error().stack || '';
            const stackLines = stack.split('\n');
            
            for (let i = 0; i < Math.min(5, stackLines.length); i++) {
              const line = stackLines[i].toLowerCase();
              if ((line.includes('<anonymous>') || 
                   line.includes('eval') ||
                   (line.includes('at') && !line.includes('.js'))) &&
                  !line.includes('devtools-detector')) {
                console.log(`[Console Detector] 检测到从控制台修改localStorage: ${key}`);
                updateDetectionState(true);
                break;
              }
            }
          } catch (e) {
            // 忽略错误
          }
        }
        
        return originalSetItem.call(this, key, value);
      };
      
    } catch (e) {
      console.error('[Console Detector] Storage监控设置失败:', e);
    }
  }

  // ===== 哈希函数（简单但有效的校验） =====
  function simpleHash(str) {
    let hash = 0;
    const input = str + HASH_SALT;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ===== 计算状态的校验和 =====
  function calculateChecksum() {
    const data = `${detectionState.detected}|${detectionState.firstDetectedTime}|${detectionState.detectionCount}|${detectionState.lastUpdateTime}`;
    return simpleHash(data);
  }

  // ===== 更新检测状态 =====
  function updateDetectionState(isDetected) {
    const now = Date.now();
    
    // 验证时间戳是否合法（防止回溯）
    if (now < detectionState.lastUpdateTime - 1000) {
      console.warn('[Console Detector] 检测到时间回溯，可能存在篡改');
      markAsDetected(); // 时间异常，标记为检测到
      return;
    }
    
    if (isDetected && !detectionState.detected) {
      // 第一次检测到
      detectionState.detected = true;
      detectionState.detectedBackup1 = true;
      detectionState.detectedBackup2 = true;
      detectionState.firstDetectedTime = now;
      detectionState.firstDetectedTimeBackup = now;
      console.log('[Console Detector] 检测到控制台代码执行');
    }
    
    if (isDetected) {
      detectionState.detectionCount++;
      detectionState.detectionCountBackup++;
    }
    
    // 更新时间戳
    detectionState.lastUpdateTime = now;
    detectionState.lastUpdateTimeBackup = now;
    
    // 计算并保存校验和
    const newChecksum = calculateChecksum();
    detectionState.checksum = newChecksum;
    detectionState.checksumBackup = newChecksum;
    
    // 保存到游戏状态
    saveToGameState();
  }

  // ===== 验证状态完整性 =====
  function verifyStateIntegrity() {
    // 首次运行时，checksum为null，不进行校验和验证
    const isFirstRun = (detectionState.checksum === null || detectionState.checksum === undefined);
    
    // 检查备份值是否一致
    if (detectionState.detected !== detectionState.detectedBackup1 ||
        detectionState.detected !== detectionState.detectedBackup2) {
      console.warn('[Console Detector] 检测到状态不一致，可能被篡改');
      return false;
    }
    
    if (detectionState.firstDetectedTime !== detectionState.firstDetectedTimeBackup) {
      console.warn('[Console Detector] 检测到时间戳不一致，可能被篡改');
      return false;
    }
    
    if (detectionState.detectionCount !== detectionState.detectionCountBackup) {
      console.warn('[Console Detector] 检测到计数不一致，可能被篡改');
      return false;
    }
    
    // 首次运行时跳过校验和验证
    if (isFirstRun) {
      console.log('[Console Detector] 首次运行，初始化校验和');
      const newChecksum = calculateChecksum();
      detectionState.checksum = newChecksum;
      detectionState.checksumBackup = newChecksum;
      return true;
    }
    
    // 验证校验和
    const expectedChecksum = calculateChecksum();
    if (detectionState.checksum !== expectedChecksum ||
        detectionState.checksumBackup !== expectedChecksum) {
      console.warn('[Console Detector] 检测到校验和不匹配，可能被篡改');
      console.warn('[Console Detector] 当前:', detectionState.checksum, '预期:', expectedChecksum);
      return false;
    }
    
    return true;
  }

  // ===== 强制标记为已检测（发现篡改时调用） =====
  function markAsDetected() {
    const now = Date.now();
    detectionState.detected = true;
    detectionState.detectedBackup1 = true;
    detectionState.detectedBackup2 = true;
    if (detectionState.firstDetectedTime === 0) {
      detectionState.firstDetectedTime = now;
      detectionState.firstDetectedTimeBackup = now;
    }
    detectionState.detectionCount = Math.max(detectionState.detectionCount, 999);
    detectionState.detectionCountBackup = detectionState.detectionCount;
    detectionState.lastUpdateTime = now;
    detectionState.lastUpdateTimeBackup = now;
    const newChecksum = calculateChecksum();
    detectionState.checksum = newChecksum;
    detectionState.checksumBackup = newChecksum;
    saveToGameState();
  }

  // ===== 综合检测函数 =====
  function performDetection() {
    // 先验证状态完整性
    if (!verifyStateIntegrity()) {
      markAsDetected();
      return;
    }
    
    // 如果已经检测到，就不需要继续检测了（节省性能）
    if (detectionState.detected) {
      return;
    }
    
    // 不需要主动检测，只通过监控器被动触发
    // 所有检测都通过监控全局对象、console、eval等来实现
  }

  // ===== 保存到游戏状态 =====
  function saveToGameState() {
    if (typeof window !== 'undefined' && window.game) {
      try {
        // 保存检测结果到游戏对象
        window.game.devToolsDetection = {
          detected: detectionState.detected,
          detectedBackup1: detectionState.detectedBackup1,
          detectedBackup2: detectionState.detectedBackup2,
          firstDetectedTime: detectionState.firstDetectedTime,
          firstDetectedTimeBackup: detectionState.firstDetectedTimeBackup,
          detectionCount: detectionState.detectionCount,
          detectionCountBackup: detectionState.detectionCountBackup,
          checksum: detectionState.checksum,
          checksumBackup: detectionState.checksumBackup,
          lastUpdateTime: detectionState.lastUpdateTime,
          lastUpdateTimeBackup: detectionState.lastUpdateTimeBackup
        };
        
        // 自动保存游戏（如果存在保存函数）
        if (typeof window.saveGame === 'function') {
          window.saveGame(true); // 静默保存
        }
      } catch (e) {
        console.error('[DevTools Detector] 保存到游戏状态失败:', e);
      }
    }
  }

  // ===== 从游戏状态加载 =====
  function loadFromGameState() {
    if (typeof window !== 'undefined' && window.game && window.game.devToolsDetection) {
      try {
        const saved = window.game.devToolsDetection;
        detectionState.detected = saved.detected || false;
        detectionState.detectedBackup1 = saved.detectedBackup1 || false;
        detectionState.detectedBackup2 = saved.detectedBackup2 || false;
        detectionState.firstDetectedTime = saved.firstDetectedTime || 0;
        detectionState.firstDetectedTimeBackup = saved.firstDetectedTimeBackup || 0;
        detectionState.detectionCount = saved.detectionCount || 0;
        detectionState.detectionCountBackup = saved.detectionCountBackup || 0;
        // 如果saved.checksum不存在或为空字符串，保持为null
        detectionState.checksum = (saved.checksum !== undefined && saved.checksum !== null && saved.checksum !== '') ? saved.checksum : null;
        detectionState.checksumBackup = (saved.checksumBackup !== undefined && saved.checksumBackup !== null && saved.checksumBackup !== '') ? saved.checksumBackup : null;
        detectionState.lastUpdateTime = saved.lastUpdateTime || Date.now();
        detectionState.lastUpdateTimeBackup = saved.lastUpdateTimeBackup || Date.now();
        
        console.log('[Console Detector] 已从游戏状态加载检测数据');
        
        // 加载后验证完整性
        // 注意：首次验证会初始化校验和，所以总是返回true
        const isValid = verifyStateIntegrity();
        if (!isValid) {
          console.warn('[Console Detector] 加载的数据完整性验证失败，可能被篡改');
          // 标记为检测到（但不调用markAsDetected，避免覆盖真实数据）
          detectionState.detected = true;
          detectionState.detectedBackup1 = true;
          detectionState.detectedBackup2 = true;
        }
      } catch (e) {
        console.error('[Console Detector] 从游戏状态加载失败:', e);
      }
    }
  }

  // ===== 获取检测结果（供外部调用） =====
  function getDetectionResult() {
    // 先尝试验证完整性（首次运行会自动初始化）
    const isValid = verifyStateIntegrity();
    
    // 如果验证失败，返回异常状态
    if (!isValid) {
      return {
        detected: true,
        tampered: true,
        firstDetectedTime: detectionState.firstDetectedTime,
        detectionCount: 999,
        message: '⚠️ 检测到数据异常',
        trustLevel: 0
      };
    }
    
    // 正常返回检测结果
    return {
      detected: detectionState.detected,
      tampered: false,
      firstDetectedTime: detectionState.firstDetectedTime,
      detectionCount: detectionState.detectionCount,
      message: detectionState.detected ? '⚠️ 检测到控制台代码执行' : '✓ 未检测到控制台代码执行',
      trustLevel: detectionState.detected ? 50 : 100
    };
  }

  // ===== 启动检测器 =====
  function startDetector() {
    console.log('[Console Detector] 检测器已启动');
    console.log('[Console Detector] 浏览器信息:', {
      userAgent: navigator.userAgent,
      isFirefox: typeof InstallTrigger !== 'undefined',
      isChrome: !!window.chrome
    });
    
    // 从游戏状态加载之前的检测结果
    loadFromGameState();
    
    // 设置各种监控
    detectByConsoleHistory();
    detectByGlobalObjectAccess();
    detectByEvalUsage();
    detectByStorageModification();
    setupProtection();
    
    // 定期验证状态完整性
    const intervalId = setInterval(performDetection, DETECTION_INTERVAL);
    
    // 立即执行一次验证
    performDetection();
    
    // 保存interval ID以便后续清理
    window._consoleDetectorInterval = intervalId;
  }

  // ===== 停止检测器 =====
  function stopDetector() {
    console.log('[Console Detector] 检测器已停止');
    if (window._consoleDetectorInterval) {
      clearInterval(window._consoleDetectorInterval);
    }
  }

  // ===== 导出API =====
  window.ConsoleDetector = window.DevToolsDetector = {
    start: startDetector,
    stop: stopDetector,
    getResult: getDetectionResult,
    // 内部方法（用于调试）
    _verifyIntegrity: verifyStateIntegrity,
    _getState: () => detectionState,
    _markAsDetected: markAsDetected
  };

  // ===== 自动启动（在游戏页面） =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // 等待游戏对象初始化
      setTimeout(() => {
        if (window.location.pathname.includes('game.html')) {
          startDetector();
        }
      }, 100);
    });
  } else {
    // DOM已经加载完成
    setTimeout(() => {
      if (window.location.pathname.includes('game.html')) {
        startDetector();
      }
    }, 100);
  }

})();
