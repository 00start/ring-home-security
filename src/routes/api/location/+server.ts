import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRingApi } from '$lib/ring';

export const GET: RequestHandler = async () => {
	try {
		const api = await getRingApi();
		const locations = await api.getLocations();

		// Get the first location (most users have one)
		const location = locations[0];

		if (!location) {
			return json({ success: false, error: 'No location found' }, { status: 404 });
		}

		return json({
			success: true,
			data: {
				id: location.id,
				name: location.name
			}
		});
	} catch (error) {
		console.error('Failed to get location:', error);
		return json({ success: false, error: 'Failed to get location' }, { status: 500 });
	}
};
