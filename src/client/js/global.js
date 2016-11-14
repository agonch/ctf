const BACKGROUND_COLOR = 0xff99ff;
const WINDOW_WIDTH = window.innerWidth - 15;
const WINDOW_HEIGHT = window.innerHeight - 20;

const PLAYER_COLOR = 0x66ff99;
const PLAYER_RADIUS = 15;

const GLOBAL_RENDERER = PIXI.autoDetectRenderer(WINDOW_WIDTH, WINDOW_HEIGHT,
        	{ backgroundColor: BACKGROUND_COLOR, antialias: true });
const GLOBAL_STAGE = new PIXI.Container();

const GAME_RENDERER = new GameRenderer();