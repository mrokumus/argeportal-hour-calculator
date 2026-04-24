/** Main monthly entry/exit table */
export const SELECTOR_MAIN_GRID = '#grid_kesin_giris_cikis';

/** Today's check-in/out rows table */
export const SELECTOR_FLEX_GRID = 'div.flexgrid';

/** Period (month) dropdown */
export const SELECTOR_PERIOD_SELECT = 'select#Donem_Id';

/** PDKS submenu folder links */
export const SELECTOR_PDKS_FOLDER = 'li.sub_folder > a';

/** PDKS entry/exit menu folder element ID */
export const MENU_FOLDER_ID = 'menu-folder-28';

/** Shadow host ID — used as a double-run guard */
export const PANEL_HOST_ID = 'pdks-shadow-host';

/** localStorage key prefix */
export const STORAGE_PREFIX = 'pdks_';

/** Daily work target in hours */
export const DAILY_TARGET_HOURS = 9;

/** Daily maximum countable hours (hours beyond this are capped) */
export const DAILY_CAP_HOURS = 11;

/** Minimum hours to count a day as worked (below this → treated as leave) */
export const SHORT_DAY_THRESHOLD_HOURS = 5;

/** Auto-refresh interval in milliseconds */
export const REFRESH_INTERVAL_MS = 60_000;

/** Timeout for panel open operations in milliseconds */
export const PANEL_OPEN_TIMEOUT_MS = 10_000;

/** Delay after triggering period dropdown change in milliseconds */
export const PERIOD_CHANGE_DELAY_MS = 1_200;

/** Delay after clicking the PDKS menu card before polling in milliseconds */
export const MENU_CARD_CLICK_DELAY_MS = 500;

/** GitHub repository path used for version checks */
export const GITHUB_REPO = 'mrokumus/argeportal-hour-calculator';
