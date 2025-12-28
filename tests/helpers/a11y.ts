import { type Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Check accessibility violations on a page using axe-core
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 * @param options.skipRules - Array of rule IDs to skip
 * @param options.includeOnly - Array of specific rule IDs to run (exclusive with tags)
 * @param options.tags - Array of tags to filter rules by (e.g., ['wcag2a', 'wcag2aa'])
 * @param options.autoAssert - Automatically assert no violations (default: true)
 * @returns Axe results object
 */
export async function checkAccessibility(
	page: Page,
	options?: {
		skipRules?: string[];
		includeOnly?: string[];
		tags?: string[];
		autoAssert?: boolean;
	}
) {
	const builder = new AxeBuilder({ page });

	if (options?.skipRules) {
		builder.disableRules(options.skipRules);
	}

	if (options?.includeOnly) {
		// Run only specific rules
		builder.include('*'); // Include everything, then filter
		const rulesToRun = options.includeOnly;
		builder.options({
			runOnly: {
				type: 'rule',
				values: rulesToRun
			}
		});
	}

	if (options?.tags) {
		builder.withTags(options.tags);
	}

	const results = await builder.analyze();

	// Auto-assert no violations unless explicitly disabled
	if (options?.autoAssert !== false) {
		expect(results.violations).toEqual([]);
	}

	return results;
}
