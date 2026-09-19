#!/bin/sh
set -eu

# Rebuild the checked-in browser artifact from the official ABS snapshot.
# Requires curl, unzip and Node.js. Work happens in a temporary directory.
url='https://www.abs.gov.au/census/find-census-data/datapacks/download/2021_GCP_GCCSA_for_AUS_short-header.zip'
nhs_url='https://www.abs.gov.au/statistics/health/health-conditions-and-risks/national-health-survey/2022/NHSDC08.xlsx'
expected_census='62e08e129a733181385dfc7086bbffa5249438c62a2e83202b0eb7bfcbe5c8bf'
expected_nhs='5b15c712f1a7957dea479de5e576f4fe8af1b65e2d7fd98038f4d059462ee56d'
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT INT TERM
curl -fL --retry 2 -o "$work_dir/gccsa.zip" "$url"
curl -fL --retry 2 -o "$work_dir/NHSDC08.xlsx" "$nhs_url"
actual_census="$(shasum -a 256 "$work_dir/gccsa.zip" | awk '{print $1}')"
actual_nhs="$(shasum -a 256 "$work_dir/NHSDC08.xlsx" | awk '{print $1}')"
[ "$actual_census" = "$expected_census" ] || { echo 'Unexpected Census DataPack checksum' >&2; exit 1; }
[ "$actual_nhs" = "$expected_nhs" ] || { echo 'Unexpected NHS Table 8 checksum' >&2; exit 1; }
unzip -q "$work_dir/gccsa.zip" -d "$work_dir/extracted"
node scripts/build-abs-model.mjs "$work_dir/extracted"
node scripts/read-nhs-height.mjs "$work_dir/NHSDC08.xlsx" >/dev/null
