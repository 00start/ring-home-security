/**
 * Ring Subscription Checker
 */

import { config } from 'dotenv';
config();

import { RingApi } from 'ring-client-api';

async function checkSubscription() {
	console.log('\n='.repeat(60));
	console.log('RING SUBSCRIPTION & CAMERA CAPABILITIES CHECK');
	console.log('='.repeat(60));

	try {
		const ringApi = new RingApi({
			refreshToken: process.env.RING_REFRESH_TOKEN,
			debug: false
		});

		const locations = await ringApi.getLocations();
		const cameras = await ringApi.getCameras();

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
		console.log('\n💡 DIAGNOSIS:\n');

		const allCamerasHaveSubscription = cameras.every(
			(c) => c.data?.subscribed === true || c.data?.subscription_status === 'active'
		);

		if (!allCamerasHaveSubscription) {
			console.log('❌ PROBLEM IDENTIFIED: No active Ring Protect subscription');
			console.log('\nRing requires a Ring Protect plan for cloud video recording.');
			console.log('Your system will capture motion/doorbell events but cannot download videos.');
			console.log('\nSOLUTION: Subscribe to Ring Protect at https://ring.com/protect-plans');
		} else {
			console.log('✅ Subscription appears active - recordings should work');
			console.log('\nIf recordings still fail, check:');
			console.log('1. Recording enabled in Ring app settings');
			console.log('2. Sufficient storage in Ring plan');
			console.log('3. Camera has internet connectivity');
		}
		console.log('\n');

		ringApi.disconnect();
	} catch (error) {
		console.error('\n❌ ERROR:', error.message);
		process.exit(1);
	}
}

checkSubscription();
