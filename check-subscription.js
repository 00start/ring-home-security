/**
 * Ring Subscription Checker
 *
 * This script checks your Ring subscription status and camera capabilities
 * to diagnose why recordings aren't working.
 */

import { config } from 'dotenv';
config();

import { getRingApi, getCameras } from './src/lib/ring/index.js';

async function checkSubscription() {
	console.log('\n='.repeat(60));
	console.log('RING SUBSCRIPTION & CAMERA CAPABILITIES CHECK');
	console.log('='.repeat(60));

	try {
		const api = await getRingApi();
		const cameras = await getCameras();
		const locations = await api.getLocations();

		console.log('\n📍 LOCATIONS:');
		for (const location of locations) {
			console.log(`\nLocation: ${location.name} (ID: ${location.id})`);
			console.log(`Address: ${location.address || 'N/A'}`);
		}

		console.log('\n📹 CAMERAS:');
		for (const camera of cameras) {
			const data = camera.data || {};

			console.log('\n' + '-'.repeat(60));
			console.log(`Camera: ${camera.name}`);
			console.log(`ID: ${camera.id}`);
			console.log(`Type: ${camera.deviceType}`);
			console.log(`Model: ${camera.model || 'N/A'}`);
			console.log(
				`Battery: ${camera.batteryLevel !== undefined ? camera.batteryLevel + '%' : 'Wired'}`
			);

			console.log('\n🔐 SUBSCRIPTION STATUS:');
			console.log(`  Subscribed: ${data.subscribed !== undefined ? data.subscribed : 'Unknown'}`);
			console.log(`  Subscription Status: ${data.subscription_status || 'N/A'}`);
			console.log(`  Ring Protect Plan: ${data.ring_cam_setup_flow || 'N/A'}`);

			console.log('\n✨ FEATURES:');
			if (data.features && Array.isArray(data.features)) {
				data.features.forEach((feature) => console.log(`  - ${feature}`));
			} else {
				console.log('  No features data available');
			}

			console.log('\n⚙️  SETTINGS:');
			const settings = data.settings || {};
			console.log(
				`  Motion Detection: ${settings.motion_detection_enabled !== undefined ? (settings.motion_detection_enabled ? 'Enabled' : 'Disabled') : 'N/A'}`
			);
			console.log(`  Recording Quality: ${settings.video_settings?.quality || 'N/A'}`);
			console.log(`  Night Vision: ${settings.night_vision_mode || 'N/A'}`);

			console.log('\n📊 RECORDING CAPABILITY:');
			const hasRecordingFeature =
				data.features?.includes('recordings') || data.features?.includes('video_recording');
			const hasActiveSubscription =
				data.subscribed === true || data.subscription_status === 'active';

			if (!hasActiveSubscription) {
				console.log('  ❌ NO ACTIVE RING PROTECT SUBSCRIPTION');
				console.log('  ⚠️  Cloud recording requires Ring Protect Plan');
				console.log('  💡 Visit: https://ring.com/protect-plans');
			} else if (!hasRecordingFeature) {
				console.log('  ⚠️  Subscription active but recording feature not detected');
			} else {
				console.log('  ✅ Recording should be available');
			}

			// Try to get recent events
			console.log('\n📝 RECENT EVENTS:');
			try {
				const events = await camera.getEvents({ limit: 5 });
				console.log(`  Found ${events.length} recent events`);
				events.forEach((event, i) => {
					console.log(`\n  Event ${i + 1}:`);
					console.log(`    ID: ${event.id}`);
					console.log(`    Kind: ${event.kind}`);
					console.log(`    Created: ${new Date(event.created_at).toLocaleString()}`);
					console.log(`    Has Recording: ${event.recording?.status || 'No recording data'}`);
				});
			} catch (err) {
				console.log(`  Error fetching events: ${err.message}`);
			}
		}

		console.log('\n' + '='.repeat(60));
		console.log('\n💡 TROUBLESHOOTING TIPS:\n');
		console.log('If recordings are not working:');
		console.log('1. Check if you have an active Ring Protect subscription');
		console.log('2. Verify recording is enabled in the Ring app settings');
		console.log('3. Ensure sufficient storage in your Ring plan');
		console.log('4. Check if the camera has internet connectivity');
		console.log('5. Some events may not trigger recording (e.g., low battery mode)');
		console.log('\n');
	} catch (error) {
		console.error('\n❌ ERROR:', error.message);
		if (error.stack) {
			console.error('\nStack trace:');
			console.error(error.stack);
		}
		process.exit(1);
	}

	process.exit(0);
}

checkSubscription();
