import { playerctlInstalled } from "$lib/stores/window-store";
import { checkPlayerCtl } from "$lib/utils";

async function init() {
    checkPlayerCtl();
    playerctlInstalled.set(true);
}

init();