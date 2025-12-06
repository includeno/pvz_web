
export type Lang = 'en' | 'zh';

export const TRANSLATIONS = {
  en: {
    // Menu
    GAME_TITLE: "REACT VS UNDEAD",
    ADVENTURE: "ADVENTURE",
    EDITOR: "EDITOR",
    ENDLESS_MODE: "ENDLESS MODE",
    DLC_MANAGER: "DLC",
    VERSION_INFO: "VERSION 3.2 - COB CANNON UPDATE",
    
    // Settings
    SETTINGS_TITLE: "SETTINGS",
    MUSIC_VOLUME: "MUSIC VOLUME",
    SFX_VOLUME: "SOUND FX",
    GAME_SPEED: "GAME SPEED",
    LANGUAGE: "LANGUAGE",
    SLOW: "SLOW",
    NORMAL: "NORMAL",
    FAST: "FAST",
    SETTINGS_FOOTER: "GAMEPLAY SETTINGS",
    
    // HUD & Pause
    PAUSED: "PAUSED",
    RESUME: "RESUME",
    EXIT_TO_MENU: "EXIT TO MENU",
    MENU_BTN: "MENU",
    RELOADING: "RELOADING",
    ARMING: "ARMING...",
    
    // Game Over / Victory
    GAME_OVER: "GAME OVER",
    LEVEL_CLEAR: "LEVEL CLEAR!",
    TRY_AGAIN: "TRY AGAIN",
    MAIN_MENU: "MAIN MENU",
    NEW_PLANT_UNLOCKED: "NEW PLANT UNLOCKED!",
    FLOOR_COMPLETE: "FLOOR COMPLETE",
    NEXT_FLOOR: "NEXT FLOOR",
    
    // Selectors
    CHOOSE_SEEDS: "CHOOSE YOUR SEEDS",
    SELECTED: "SELECTED",
    LETS_ROCK: "LET'S ROCK!",
    BACK: "BACK",
    LEVEL_INFO: "LEVEL INFO",
    ZOMBIES_DETECTED: "ZOMBIES",
    SAVE_QUIT: "SAVE & QUIT",
    SELECT_LEVEL: "SELECT LEVEL",
    CUSTOM: "CUSTOM",
    NO_LEVELS: "NO LEVELS FOUND",
    
    // Editor - Common
    CANCEL: "CANCEL",
    SAVE: "SAVE",
    APPLY: "APPLY",
    RESET: "RESET",
    DEFAULT: "DEFAULT",
    ADD: "ADD",
    REMOVE: "REMOVE",
    EDIT: "EDIT",
    NAME: "NAME",
    DESCRIPTION: "DESCRIPTION",
    ID: "ID",
    UNIQUE_ID: "UNIQUE ID",
    ICON: "ICON",
    EMOJI: "EMOJI",
    COST: "COST",
    HEALTH: "HEALTH",
    COOLDOWN: "COOLDOWN",
    SCALE: "SCALE",
    SPEED: "SPEED",
    DAMAGE: "DAMAGE",
    ABILITIES: "ABILITIES",
    SPECIAL_ABILITIES: "SPECIAL ABILITIES",
    VISUALS: "VISUALS",
    SPRITE: "SPRITE",
    FPS: "FPS",
    TRANSLATIONS: "TRANSLATIONS",
    ADD_LANG: "ADD LANGUAGE",
    
    // Ability Fields
    INTERVAL: "Interval (ms)",
    SUN_VALUE: "Sun Value",
    RANGE: "Range (tiles)",
    PROJECTILE: "Projectile",
    DIRECTION: "Direction",
    HOMING: "Homing?",
    TRIGGER_RANGE: "Trigger Range",
    COUNT: "Count",
    DURATION: "Duration (ms)",
    DISTANCE: "Distance",
    EDIT_ART: "Edit Art",
    CREATE_ART: "Create Art",
    EDIT_PROJECTILE_SPRITE: "Edit Projectile Pixel",
    CREATE_PROJECTILE_SPRITE: "Create Projectile Pixel",
    NO_ABILITIES: "No abilities added.",
    
    // Editor - Menu
    EDITOR_MENU: "EDITOR MENU",
    BASE_EDITOR: "BASE EDITOR",
    DLC_EDITOR: "DLC / LEVEL EDITOR",
    BASE_EDITOR_DESC: "Modify core game stats.\nTweak balance of vanilla plants and zombies.",
    DLC_EDITOR_DESC: "Create new DLC packs.\nDesign custom levels, plants, and zombies.",
    
    // DLC Manager
    EXPANSION_PACKS: "EXPANSION PACKS",
    SEARCH_DLC: "Filter DLCs by name...",
    NO_DLCS_FOUND: "NO DLCS FOUND",
    NEW_PLANTS: "NEW PLANTS",
    NEW_ZOMBIES: "NEW ZOMBIES",
    CAMPAIGN_LEVELS: "CAMPAIGN LEVELS",
    DETAILS: "DETAILS",
    APPLY_CHANGES: "APPLY CHANGES",
    DLC_ID: "DLC ID",
    DISPLAY_NAME: "Display Name",
    VERSION: "Version",
    
    // Base Editor
    BASE_EDITOR_TITLE: "BASE EDITOR",
    CORE_CONTENT: "CORE GAME CONTENT ONLY",
    SELECT_ENTITY: "SELECT AN ENTITY TO EDIT",
    RESET_TO_DEFAULT: "RESET TO DEFAULT",
    SAVED_CHANGES: "Saved changes to",
    CONFIRM_RESET: "Are you sure you want to reset this unit to default stats and visuals?",
    EDIT_SPRITE: "EDIT SPRITE",
    
    // Level Editor / DLC Creator
    DLC_CREATOR: "DLC CREATOR",
    DLC_METADATA: "DLC METADATA",
    DLC_INFO: "DLC INFO",
    LEVELS: "LEVELS",
    PLANTS: "PLANTS",
    ZOMBIES: "ZOMBIES",
    EXPORT: "EXPORT",
    TEST_PLAY: "TEST PLAY",
    ADD_TO_DLC: "ADD TO DLC",
    ADDED_PLANTS: "ADDED PLANTS",
    ADDED_ZOMBIES: "ADDED ZOMBIES",
    WAVES: "WAVES",
    EVENTS: "EVENTS",
    SETTINGS: "SETTINGS",
    
    // Pixel Editor
    PIXEL_EDITOR: "PIXEL EDITOR",
    PLAYBACK_SPEED: "PLAYBACK SPEED",
    TOOLS: "TOOLS",
    PALETTE: "PALETTE",
    ACTIONS: "ACTIONS",
    TIMELINE: "TIMELINE",
    PREVIEW: "PREVIEW",
    NEW_FRAME: "NEW FRAME",
    SAVE_VISUALS: "SAVE VISUALS",
    LOADING_PIXELS: "LOADING PIXELS...",
    
    // Endless
    NEW_GAME_CONFIG: "NEW GAME CONFIG",
    SELECT_DLCS: "SELECT DLCs TO ENABLE:",
    START: "START",
    CONTINUE: "CONTINUE",
    NEW_GAME: "NEW GAME",
    FLOOR: "FLOOR",
    SCORE: "SCORE",
    MERCHANT: "MERCHANT",
    CREDITS: "CREDITS",
    OWNED: "OWNED",
    
    // Level Scenes
    LAWN_DAY: "DAYTIME LAWN",
    LAWN_NIGHT: "NIGHT LAWN",
    BALCONY: "ROOF BALCONY",
    FACTORY: "FACTORY",
    GRAVEYARD: "GRAVEYARD",
    
    // Entity Names (Base)
    SUNFLOWER: "Sunflower",
    PEASHOOTER: "Peashooter",
    WALLNUT: "Wall-nut",
    CHERRY_BOMB: "Cherry Bomb",
    POTATO_MINE: "Potato Mine",
    SNOW_PEA: "Snow Pea",
    CHOMPER: "Chomper",
    REPEATER: "Repeater",
    PUFF_SHROOM: "Puff Shroom",
    SUN_SHROOM: "Sun Shroom",
    FUME_SHROOM: "Fume Shroom",
    GRAVE_BUSTER: "Grave Buster",
    HYPNO_SHROOM: "Hypno Shroom",
    SCAREDY_SHROOM: "Scaredy Shroom",
    ICE_SHROOM: "Ice Shroom",
    DOOM_SHROOM: "Doom Shroom",
    SQUASH: "Squash",
    JALAPENO: "Jalapeno",
    SPIKEWEED: "Spikeweed",
    TORCHWOOD: "Torchwood",
    TALLNUT: "Tall-nut",
    MELON_PULT: "Melon-pult",
    KERNEL_PULT: "Kernel-pult",
    TWIN_SUNFLOWER: "Twin Sunflower",
    THREEPEATER: "Threepeater",
    GATLING_PEA: "Gatling Pea",
    COB_CANNON: "Cob Cannon",
    STARFRUIT: "Starfruit",
    
    // Zombie Names (Base)
    ZOMBIE_NORMAL: "Zombie",
    ZOMBIE_CONEHEAD: "Conehead Zombie",
    ZOMBIE_BUCKETHEAD: "Buckethead Zombie",
    ZOMBIE_FOOTBALL: "Football Zombie",
    ZOMBIE_NEWSPAPER: "Newspaper Zombie",
    ZOMBIE_SCREEN_DOOR: "Screen Door Zombie",
    ZOMBIE_IMP: "Imp",
    ZOMBIE_GARGANTUAR: "Gargantuar",
    ZOMBIE_MECH_BOSS: "Dr. Zomboss",
    ZOMBIE_POLE_VAULTING: "Pole Vaulting Zombie",
    ZOMBIE_DANCING: "Dancing Zombie",
    ZOMBIE_BACKUP_DANCER: "Backup Dancer",
    ZOMBIE_ZOMBONI: "Zomboni"
  },
  zh: {
    // Menu
    GAME_TITLE: "React 大战僵尸",
    ADVENTURE: "冒险模式",
    EDITOR: "编辑器",
    ENDLESS_MODE: "无尽模式",
    DLC_MANAGER: "扩展包",
    VERSION_INFO: "版本 3.2 - 玉米加农炮更新",
    
    // Settings
    SETTINGS_TITLE: "游戏设置",
    MUSIC_VOLUME: "音乐音量",
    SFX_VOLUME: "音效音量",
    GAME_SPEED: "游戏速度",
    LANGUAGE: "语言选择",
    SLOW: "慢速",
    NORMAL: "正常",
    FAST: "快速",
    SETTINGS_FOOTER: "游戏设置由服务器控制",
    
    // HUD & Pause
    PAUSED: "游戏暂停",
    RESUME: "继续游戏",
    EXIT_TO_MENU: "返回菜单",
    MENU_BTN: "菜单",
    RELOADING: "装填中",
    ARMING: "准备中...",
    
    // Game Over / Victory
    GAME_OVER: "僵尸吃掉了你的脑子!",
    LEVEL_CLEAR: "关卡完成!",
    TRY_AGAIN: "再试一次",
    MAIN_MENU: "主菜单",
    NEW_PLANT_UNLOCKED: "解锁新植物!",
    FLOOR_COMPLETE: "层级完成",
    NEXT_FLOOR: "下一层",
    
    // Selectors
    CHOOSE_SEEDS: "选择你的植物",
    SELECTED: "已选",
    LETS_ROCK: "一起摇滚吧!",
    BACK: "返回",
    LEVEL_INFO: "关卡信息",
    ZOMBIES_DETECTED: "僵尸预览",
    SAVE_QUIT: "保存并退出",
    SELECT_LEVEL: "选择关卡",
    CUSTOM: "自定义",
    NO_LEVELS: "未找到关卡",
    
    // Editor - Common
    CANCEL: "取消",
    SAVE: "保存",
    APPLY: "应用",
    RESET: "重置",
    DEFAULT: "默认",
    ADD: "添加",
    REMOVE: "移除",
    EDIT: "编辑",
    NAME: "名称",
    DESCRIPTION: "描述",
    ID: "ID",
    UNIQUE_ID: "唯一ID",
    ICON: "图标",
    EMOJI: "表情符号",
    COST: "花费",
    HEALTH: "生命值",
    COOLDOWN: "冷却时间",
    SCALE: "缩放",
    SPEED: "速度",
    DAMAGE: "伤害",
    ABILITIES: "能力",
    SPECIAL_ABILITIES: "特殊能力",
    VISUALS: "视觉效果",
    SPRITE: "精灵图",
    FPS: "帧率",
    TRANSLATIONS: "多语言翻译",
    ADD_LANG: "添加语言",
    
    // Ability Fields
    INTERVAL: "间隔 (ms)",
    SUN_VALUE: "阳光产量",
    RANGE: "射程 (格)",
    PROJECTILE: "投射物",
    DIRECTION: "方向",
    HOMING: "追踪目标?",
    TRIGGER_RANGE: "触发范围",
    COUNT: "数量",
    DURATION: "持续时间 (ms)",
    DISTANCE: "距离",
    EDIT_ART: "编辑美术",
    CREATE_ART: "创建美术",
    EDIT_PROJECTILE_SPRITE: "编辑发射物像素",
    CREATE_PROJECTILE_SPRITE: "创建发射物像素",
    NO_ABILITIES: "未添加能力。",
    
    // Editor - Menu
    EDITOR_MENU: "编辑器菜单",
    BASE_EDITOR: "基础编辑器",
    DLC_EDITOR: "DLC/关卡编辑器",
    BASE_EDITOR_DESC: "修改核心游戏数据。\n调整原版植物和僵尸的平衡性。",
    DLC_EDITOR_DESC: "创建新的DLC扩展包。\n设计自定义关卡、植物和僵尸。",
    
    // DLC Manager
    EXPANSION_PACKS: "扩展包",
    SEARCH_DLC: "按名称搜索DLC...",
    NO_DLCS_FOUND: "未找到DLC",
    NEW_PLANTS: "新植物",
    NEW_ZOMBIES: "新僵尸",
    CAMPAIGN_LEVELS: "战役关卡",
    DETAILS: "详情",
    APPLY_CHANGES: "应用更改",
    DLC_ID: "DLC ID",
    DISPLAY_NAME: "显示名称",
    VERSION: "版本",
    
    // Base Editor
    BASE_EDITOR_TITLE: "基础编辑器",
    CORE_CONTENT: "仅限核心游戏内容",
    SELECT_ENTITY: "选择一个实体进行编辑",
    RESET_TO_DEFAULT: "重置为默认",
    SAVED_CHANGES: "已保存更改到",
    CONFIRM_RESET: "您确定要将此单位重置为默认属性和视觉效果吗？",
    EDIT_SPRITE: "编辑精灵",
    
    // Level Editor / DLC Creator
    DLC_CREATOR: "DLC 创建器",
    DLC_METADATA: "DLC 元数据",
    DLC_INFO: "DLC 信息",
    LEVELS: "关卡",
    PLANTS: "植物",
    ZOMBIES: "僵尸",
    EXPORT: "导出",
    TEST_PLAY: "测试游玩",
    ADD_TO_DLC: "添加到 DLC",
    ADDED_PLANTS: "已添加植物",
    ADDED_ZOMBIES: "已添加僵尸",
    WAVES: "波次",
    EVENTS: "事件",
    SETTINGS: "设置",
    
    // Pixel Editor
    PIXEL_EDITOR: "像素编辑器",
    PLAYBACK_SPEED: "播放速度",
    TOOLS: "工具",
    PALETTE: "调色板",
    ACTIONS: "动作",
    TIMELINE: "时间轴",
    PREVIEW: "预览",
    NEW_FRAME: "新帧",
    SAVE_VISUALS: "保存视觉效果",
    LOADING_PIXELS: "正在加载像素...",
    
    // Endless
    NEW_GAME_CONFIG: "新游戏配置",
    SELECT_DLCS: "选择启用的DLC:",
    START: "开始",
    CONTINUE: "继续",
    NEW_GAME: "新游戏",
    FLOOR: "层数",
    SCORE: "分数",
    MERCHANT: "戴夫的商店",
    CREDITS: "存款",
    OWNED: "拥有",
    
    // Level Scenes
    LAWN_DAY: "白天草坪",
    LAWN_NIGHT: "夜晚草坪",
    BALCONY: "屋顶",
    FACTORY: "工厂",
    GRAVEYARD: "墓地",
    
    // Entity Names (Base)
    SUNFLOWER: "向日葵",
    PEASHOOTER: "豌豆射手",
    WALLNUT: "坚果墙",
    CHERRY_BOMB: "樱桃炸弹",
    POTATO_MINE: "土豆雷",
    SNOW_PEA: "寒冰射手",
    CHOMPER: "大嘴花",
    REPEATER: "双发射手",
    PUFF_SHROOM: "小喷菇",
    SUN_SHROOM: "阳光菇",
    FUME_SHROOM: "大喷菇",
    GRAVE_BUSTER: "墓碑吞噬者",
    HYPNO_SHROOM: "魅惑菇",
    SCAREDY_SHROOM: "胆小菇",
    ICE_SHROOM: "寒冰菇",
    DOOM_SHROOM: "毁灭菇",
    SQUASH: "窝瓜",
    JALAPENO: "火爆辣椒",
    SPIKEWEED: "地刺",
    TORCHWOOD: "火炬树桩",
    TALLNUT: "高坚果",
    MELON_PULT: "西瓜投手",
    KERNEL_PULT: "玉米投手",
    TWIN_SUNFLOWER: "双子向日葵",
    THREEPEATER: "三线射手",
    GATLING_PEA: "机枪射手",
    COB_CANNON: "玉米加农炮",
    STARFRUIT: "杨桃",
    
    // Zombie Names (Base)
    ZOMBIE_NORMAL: "普通僵尸",
    ZOMBIE_CONEHEAD: "路障僵尸",
    ZOMBIE_BUCKETHEAD: "铁桶僵尸",
    ZOMBIE_FOOTBALL: "橄榄球僵尸",
    ZOMBIE_NEWSPAPER: "读报僵尸",
    ZOMBIE_SCREEN_DOOR: "铁门僵尸",
    ZOMBIE_IMP: "小鬼僵尸",
    ZOMBIE_GARGANTUAR: "伽刚特尔",
    ZOMBIE_MECH_BOSS: "僵王博士",
    ZOMBIE_POLE_VAULTING: "撑杆僵尸",
    ZOMBIE_DANCING: "舞王僵尸",
    ZOMBIE_BACKUP_DANCER: "伴舞僵尸",
    ZOMBIE_ZOMBONI: "冰车僵尸"
  }
};

export const t = (key: string, lang: Lang = 'en'): string => {
    // @ts-ignore
    const text = TRANSLATIONS[lang]?.[key];
    return text || key;
};

// Helper for dynamic plant/zombie names
export const tEntity = (id: string, name: string, lang: Lang): string => {
    // Try to find a translation key matching the ID
    // e.g. "SUNFLOWER" -> "向日葵"
    // If not found (e.g. Custom Plant), use the original name
    
    // 1. Check direct ID
    // @ts-ignore
    const direct = TRANSLATIONS[lang]?.[id];
    if (direct) return direct;

    // 2. Check ZOMBIE_ prefix for zombies if ID doesn't have it (optional)
    if (!id.startsWith('ZOMBIE_')) {
         // @ts-ignore
         const zKey = `ZOMBIE_${id}`;
         // @ts-ignore
         const zDirect = TRANSLATIONS[lang]?.[zKey];
         if (zDirect) return zDirect;
    }

    return name; // Fallback to provided default name
};

// New Helper for retrieving localized names from Config
export const getLocalizedName = (entity: any, lang: Lang): string => {
    if (!entity) return "Unknown";
    
    // 1. Check dynamic translations in the object itself
    if (entity.translations && entity.translations[lang] && entity.translations[lang].name) {
        return entity.translations[lang].name;
    }
    
    // 2. Fallback to static translation file
    // For Zombies, the config object usually doesn't have the 'type' field at the top level in some contexts (like ZombieStatConfig)
    // But in App.tsx (Zombie entity) it has .type.
    // If we passed the config object (ZombieStatConfig), it doesn't have ID.
    // If we passed the Game Entity, it has type.
    
    // Try to infer ID
    const id = entity.type || entity.id; 
    const defaultName = entity.name || id || "Unknown";
    
    if (id) {
        return tEntity(id, defaultName, lang);
    }
    
    return defaultName;
};
