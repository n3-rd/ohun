import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { open } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

export const flyAndScale = (
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;

	const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (style: Record<string, number | string | undefined>): string => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, '');
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};

export function openLink(url: string) {
	open(url);
}
export const checkPlayerCtl = async (): Promise<boolean> => {
	try {
		const response = await invoke<boolean>('check_if_playerctl_exists');
		console.log('playerctl exists:', response);
		return response;
	} catch (error) {
		console.error('Error checking playerctl:', error);
		return false;
	}
};

export const replaceSpecialChars = (str: string) => {
	return (
		str
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			// remove brackets
			.replace(/ *\([^)]*\) */g, '')
			// make & url safe
			.replace(/&/g, 'and')
	);
};

export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;

	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

export async function isWindows(): Promise<boolean> {
	return await platform() === 'windows';
}

export async function isMacOS(): Promise<boolean> {
	return await platform() === 'macos';
}

export async function checkMediaControl() {
	const isWin = await isWindows();
	const isMac = await isMacOS();
	if (isWin || isMac) {
		// Windows and MacOS use built-in/native APIs
		return true;
	} else {
		// Linux uses playerctl
		return await checkPlayerCtl();
	}
}
