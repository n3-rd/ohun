import {
	isPermissionGranted,
	requestPermission,
	sendNotification
} from '@tauri-apps/plugin-notification';
// when using `"withGlobalTauri": true`, you may use
// const { isPermissionGranted, requestPermission, sendNotification, } = window.__TAURI_PLUGIN_NOTIFICATION__;

export const notify = async (title: string, body: string) => {
	// Do you have permission to send a notification?
	let permissionGranted = await isPermissionGranted();
	console.log('permissionGranted');

	// If not we need to request it
	if (!permissionGranted) {
		console.log('permission not granted');
		const permission = await requestPermission();
		permissionGranted = permission === 'granted';
	}

	// Once permission has been granted we can send the notification
	if (permissionGranted) {
		console.log('sending notiication');
		sendNotification({ title: title, body: body });
	}
};
