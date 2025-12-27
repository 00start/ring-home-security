import fs from 'fs';

const data = JSON.parse(fs.readFileSync('reports/test-results.json', 'utf8'));

const failures = {
  TIMEOUT: [],
  PAGE_ERROR: [],
  SELECTOR_MISSING: [],
  ASSERTION_FAILED: [],
  API_ERROR: [],
  OTHER: []
};

const fileFailures = {};

function extractTests(suite) {
  const tests = [];

  if (suite.specs) {
    for (const spec of suite.specs) {
      if (spec.tests) {
        for (const test of spec.tests) {
          if (test.results) {
            for (const result of test.results) {
              if (result.status === 'failed' || result.status === 'timedOut') {
                tests.push({
                  title: spec.title,
                  file: spec.file,
                  status: result.status,
                  error: result.error,
                  line: spec.line
                });
              }
            }
          }
        }
      }
    }
  }

  if (suite.suites) {
    for (const subSuite of suite.suites) {
      tests.push(...extractTests(subSuite));
    }
  }

  return tests;
}

// Extract all failed tests
let allFailedTests = [];
for (const suite of data.suites) {
  allFailedTests.push(...extractTests(suite));
}

// Categorize failures
for (const test of allFailedTests) {
  const errorMsg = test.error?.message || '';
  const errorStack = test.error?.stack || '';
  const combinedError = errorMsg + ' ' + errorStack;

  let category = 'OTHER';

  if (test.status === 'timedOut' || combinedError.includes('Test timeout') || combinedError.includes('exceeded')) {
    category = 'TIMEOUT';
  } else if (combinedError.includes('element(s) not found') ||
             combinedError.includes('Locator') ||
             combinedError.includes('selector') ||
             combinedError.includes('not visible') ||
             combinedError.includes('data-testid')) {
    category = 'SELECTOR_MISSING';
  } else if (combinedError.includes('page') &&
             (combinedError.includes('closed') ||
              combinedError.includes('navigation') ||
              combinedError.includes('crash'))) {
    category = 'PAGE_ERROR';
  } else if (combinedError.includes('expect(') ||
             combinedError.includes('toBe') ||
             combinedError.includes('toEqual') ||
             combinedError.includes('toHave') ||
             combinedError.includes('Expected:') ||
             combinedError.includes('Received:')) {
    category = 'ASSERTION_FAILED';
  } else if (combinedError.includes('API') ||
             combinedError.includes('request') ||
             combinedError.includes('response') ||
             combinedError.includes('fetch') ||
             combinedError.includes('404') ||
             combinedError.includes('500') ||
             combinedError.includes('network')) {
    category = 'API_ERROR';
  }

  failures[category].push(test);

  // Count per file
  const file = test.file || 'unknown';
  fileFailures[file] = (fileFailures[file] || 0) + 1;
}

// Print summary
console.log('=== E2E TEST FAILURE ANALYSIS ===\n');
console.log(`Total Failed Tests: ${allFailedTests.length}\n`);

console.log('Failure Breakdown by Category:');
for (const [category, tests] of Object.entries(failures)) {
  console.log(`  ${category}: ${tests.length}`);
}
console.log('');

console.log('Top 5 Most Problematic Test Files:');
const sortedFiles = Object.entries(fileFailures)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

sortedFiles.forEach(([file, count], index) => {
  console.log(`  ${index + 1}. ${file}: ${count} failures`);
});
console.log('');

console.log('Common Error Patterns:');
const errorPatterns = {};
for (const test of allFailedTests) {
  const errorMsg = test.error?.message || 'No error message';
  const firstLine = errorMsg.split('\n')[0].substring(0, 100);
  errorPatterns[firstLine] = (errorPatterns[firstLine] || 0) + 1;
}

const topPatterns = Object.entries(errorPatterns)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

topPatterns.forEach(([pattern, count], index) => {
  console.log(`  ${index + 1}. [${count}x] ${pattern}`);
});
console.log('');

// Detailed breakdown by category
console.log('\n=== DETAILED BREAKDOWN ===\n');

for (const [category, tests] of Object.entries(failures)) {
  if (tests.length > 0) {
    console.log(`\n${category} (${tests.length} tests):`);
    console.log('-'.repeat(60));

    // Group by file
    const byFile = {};
    tests.forEach(test => {
      const file = test.file || 'unknown';
      if (!byFile[file]) byFile[file] = [];
      byFile[file].push(test);
    });

    for (const [file, fileTests] of Object.entries(byFile)) {
      console.log(`\n  ${file} (${fileTests.length} failures):`);
      fileTests.slice(0, 3).forEach(test => {
        const errorPreview = (test.error?.message || 'No error').split('\n')[0].substring(0, 80);
        console.log(`    - ${test.title}`);
        console.log(`      Error: ${errorPreview}...`);
      });
      if (fileTests.length > 3) {
        console.log(`    ... and ${fileTests.length - 3} more`);
      }
    }
  }
}

// Export detailed JSON for further analysis
fs.writeFileSync('reports/failure-analysis.json', JSON.stringify({
  summary: {
    totalFailed: allFailedTests.length,
    byCategory: Object.fromEntries(
      Object.entries(failures).map(([cat, tests]) => [cat, tests.length])
    ),
    topFiles: sortedFiles,
    topPatterns: topPatterns
  },
  failures: failures,
  fileFailures: fileFailures
}, null, 2));

console.log('\n\nDetailed analysis saved to: reports/failure-analysis.json');
