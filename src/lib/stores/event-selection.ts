/**
 * FTR-001: Event Selection Store for Multi-Clip Download
 * Manages multi-selection of events/recordings for batch operations
 */

import { writable, derived } from 'svelte/store';

const MAX_SELECTION = 10;

function createEventSelectionStore() {
	const { subscribe, set, update } = writable<Set<string>>(new Set());

	return {
		subscribe,

		/**
		 * Toggle selection of an event
		 * Respects max selection limit
		 */
		toggleSelection: (eventId: string) => {
			update(selected => {
				const newSet = new Set(selected);
				if (newSet.has(eventId)) {
					newSet.delete(eventId);
				} else if (newSet.size < MAX_SELECTION) {
					newSet.add(eventId);
				}
				return newSet;
			});
		},

		/**
		 * Select a specific event (only if under limit)
		 */
		select: (eventId: string) => {
			update(selected => {
				const newSet = new Set(selected);
				if (newSet.size < MAX_SELECTION) {
					newSet.add(eventId);
				}
				return newSet;
			});
		},

		/**
		 * Deselect a specific event
		 */
		deselect: (eventId: string) => {
			update(selected => {
				const newSet = new Set(selected);
				newSet.delete(eventId);
				return newSet;
			});
		},

		/**
		 * Clear all selections
		 */
		clearSelection: () => {
			set(new Set());
		},

		/**
		 * Check if an event is selected
		 */
		isSelected: (eventId: string, $selected: Set<string>) => {
			return $selected.has(eventId);
		},

		/**
		 * Get selected event IDs as array
		 */
		getSelectedArray: ($selected: Set<string>) => {
			return Array.from($selected);
		},

		/**
		 * Get selected count
		 */
		getSelectedCount: ($selected: Set<string>) => {
			return $selected.size;
		},

		/**
		 * Check if more events can be selected
		 */
		canSelectMore: ($selected: Set<string>) => {
			return $selected.size < MAX_SELECTION;
		},

		/**
		 * Maximum allowed selections
		 */
		maxSelection: MAX_SELECTION
	};
}

export const eventSelection = createEventSelectionStore();

// Derived stores for convenience
export const selectedCount = derived(
	eventSelection,
	$selection => $selection.size
);

export const canSelectMore = derived(
	eventSelection,
	$selection => $selection.size < MAX_SELECTION
);

export const hasSelection = derived(
	eventSelection,
	$selection => $selection.size > 0
);

export const selectedArray = derived(
	eventSelection,
	$selection => Array.from($selection)
);
