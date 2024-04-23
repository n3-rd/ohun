<script lang="ts">
	import { browser } from '$app/environment';
	import Lyrics from '$lib/components/Lyrics.svelte';
	import { lyricsMode, setMultiLineMode, setSingleLineMode } from '$lib/preferences';
	import { onMount } from 'svelte';

	$: console.log('lymode', $lyricsMode);
</script>

<Lyrics />
