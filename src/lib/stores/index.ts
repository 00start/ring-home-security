export * from './auth';
export * from './toast';
export * from './preferences';
export * from './zone-settings';

// Re-export devices store with namespaced exports to avoid conflicts
export {
	devices,
	loading as devicesLoading,
	error as devicesError,
	onlineDevices,
	offlineDevices,
	devicesByType,
	getDevice,
	fetchDevices
} from './devices';

// Re-export events store with namespaced exports to avoid conflicts
export {
	events,
	loading as eventsLoading,
	error as eventsError,
	total,
	filters,
	hasMore,
	fetchEvents,
	setFilters,
	loadMore,
	resetFilters,
	subscribeToEvents,
	unsubscribeFromEvents
} from './events';

// Re-export recordings store with namespaced exports to avoid conflicts
export {
	recordings,
	loading as recordingsLoading,
	error as recordingsError,
	fetchRecordings,
	getVideoUrl,
	getThumbnailUrl
} from './recordings';

// Re-export stats store with namespaced exports to avoid conflicts
export {
	stats,
	loading as statsLoading,
	error as statsError,
	fetchStats
} from './stats';
