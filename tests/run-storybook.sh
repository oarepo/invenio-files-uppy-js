#!/usr/bin/env sh
# TODO: implement --coverage?
# https://storybook.js.org/docs/8.5/writing-tests/test-coverage#the-coverage-addon-doesnt-support-instrumented-code

npm run build-storybook

npx concurrently -k -s first -n "SB,TEST" -c "magenta,blue" \
    "npx http-server storybook-static --port 6007 --silent" \
    "npx wait-on tcp:127.0.0.1:6007 && STORYBOOK_COVERAGE=true npm run test-storybook --url http://127.0.0.1:6007"