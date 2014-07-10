#/bin/bash

istanbul instrument --output lib-cov lib

COVERAGE=1 ISTANBUL_REPORTERS="text-summary,lcovonly" mocha --reporter mocha-istanbul

cat lcov.info | node_modules/coveralls/bin/coveralls.js
genhtml -s -o lcov-report lcov.info

rm lcov.info
rm -rf lib-cov
